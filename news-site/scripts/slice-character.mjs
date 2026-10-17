/**
 * Cuts the seven weather poses out of a supplied character sheet.
 *
 * A fixed column split does not work: props drift over the boundary (the hot
 * pose's sun sits left of its own column), so cutting on the boundary either
 * clips the prop or leaks part of it into the neighbour.
 *
 * Instead the sheet is split into connected components. Each cell's character is
 * the largest component under its label; every other component that sits close to
 * something already claimed joins the same pose, and far-away fragments (halves of
 * a neighbour's prop) are dropped. Props are therefore always whole.
 *
 * Run: node scripts/slice-character.mjs "preview/character/source.png"
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SOURCE = process.argv[2];
if (!SOURCE) throw new Error("pass the sheet path");
const DEST = "public/weather-character";
/** How close a prop must sit to the character to belong to it (px, on the sheet). */
const GAP = 42;
/** Exported height: the card renders ~260px tall, so this stays sharp on retina. */
const TARGET_HEIGHT = 840;

await mkdir(DEST, { recursive: true });

const file = await readFile(SOURCE);
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

const isContent = (x, y) => {
  const i = (y * width + x) * channels;
  return Math.min(data[i], data[i + 1], data[i + 2]) < 232;
};

function bands(count, hasContent, minSize = 4) {
  const out = [];
  let start = -1;
  for (let i = 0; i < count; i += 1) {
    if (hasContent(i)) {
      if (start === -1) start = i;
    } else if (start !== -1) {
      if (i - start >= minSize) out.push([start, i - 1]);
      start = -1;
    }
  }
  if (start !== -1) out.push([start, count - 1]);
  return out;
}

// ---- sheet structure -------------------------------------------------------
const rowBands = bands(
  height,
  (y) => {
    for (let x = 0; x < width; x += 2) if (isContent(x, y)) return true;
    return false;
  },
  8,
);
const labelBands = rowBands.filter(([from, to]) => to - from < 70);
const artBands = rowBands.filter(([from, to]) => to - from >= 70);
console.log("art bands:", JSON.stringify(artBands), "| label bands:", JSON.stringify(labelBands));

// Rows covered by labels: no components may be found there.
const labelRows = new Uint8Array(height);
for (const [from, to] of labelBands) {
  for (let y = Math.max(0, from - 2); y <= Math.min(height - 1, to + 2); y += 1) labelRows[y] = 1;
}

// ---- connected components --------------------------------------------------
const seen = new Uint8Array(width * height);
const components = [];

for (let y = 0; y < height; y += 1) {
  if (labelRows[y]) continue;
  for (let x = 0; x < width; x += 1) {
    const index = y * width + x;
    if (seen[index] || !isContent(x, y)) continue;

    const stack = [index];
    seen[index] = 1;
    let area = 0;
    let minX = x;
    let maxX = x;
    let minY = y;
    let maxY = y;

    while (stack.length > 0) {
      const current = stack.pop();
      area += 1;
      const cx = current % width;
      const cy = (current - cx) / width;
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;

      const neighbours = [
        cx > 0 ? current - 1 : -1,
        cx < width - 1 ? current + 1 : -1,
        cy > 0 ? current - width : -1,
        cy < height - 1 ? current + width : -1,
      ];
      for (const neighbour of neighbours) {
        if (neighbour < 0 || seen[neighbour]) continue;
        const ny = Math.floor(neighbour / width);
        if (labelRows[ny]) continue;
        if (!isContent(neighbour % width, ny)) continue;
        seen[neighbour] = 1;
        stack.push(neighbour);
      }
    }

    if (area > 40) components.push({ area, minX, maxX, minY, maxY, claimed: false });
  }
}

console.log(`components: ${components.length}`);

const gapBetween = (a, b) => {
  const dx = Math.max(0, Math.max(a.minX - b.maxX, b.minX - a.maxX));
  const dy = Math.max(0, Math.max(a.minY - b.maxY, b.minY - a.maxY));
  return Math.max(dx, dy);
};

const NAMES = [
  ["calm", "hot", "rain", "cold"],
  ["sunny", "night", "windy"],
];

let saved = 0;

for (const [rowIndex, labelBand] of labelBands.entries()) {
  const [labelTop, labelBottom] = labelBand;
  const artBand = artBands[rowIndex];
  if (!artBand) continue;

  // Components must belong to this row: without the vertical test, a cell in the
  // top row happily claims the boy drawn in the row below it.
  const rowTop = artBand[0] - 6;
  const rowBottom = artBand[1] + 6;
  const inRow = (component) => {
    const centreY = (component.minY + component.maxY) / 2;
    return centreY >= rowTop && centreY <= rowBottom;
  };

  const labelColumns = bands(
    width,
    (x) => {
      for (let y = labelTop; y <= labelBottom; y += 1) if (isContent(x, y)) return true;
      return false;
    },
    10,
  );

  const centres = labelColumns.map(([from, to]) => (from + to) / 2);
  const names = NAMES[rowIndex] ?? [];
  const last = centres.length - 1;

  for (const [index, centre] of centres.entries()) {
    const cellLeft = index === 0 ? 0 : (centres[index - 1] + centre) / 2;
    const cellRight = index === last ? width : (centre + centres[index + 1]) / 2;

    // The pose's character: the biggest unclaimed component centred in this cell.
    const character = components
      .filter(
        (c) =>
          !c.claimed &&
          inRow(c) &&
          (c.minX + c.maxX) / 2 >= cellLeft &&
          (c.minX + c.maxX) / 2 <= cellRight,
      )
      .sort((a, b) => b.area - a.area)[0];
    if (!character) continue;
    character.claimed = true;

    // Then everything attached or sitting close to it (sun, drops, leaves).
    const group = [character];
    let grew = true;
    while (grew) {
      grew = false;
      for (const candidate of components) {
        if (candidate.claimed || !inRow(candidate)) continue;
        if (group.some((member) => gapBetween(candidate, member) <= GAP)) {
          candidate.claimed = true;
          group.push(candidate);
          grew = true;
        }
      }
    }

    const bounds = {
      left: Math.max(0, Math.min(...group.map((c) => c.minX)) - 6),
      right: Math.min(width - 1, Math.max(...group.map((c) => c.maxX)) + 6),
      top: Math.max(0, Math.min(...group.map((c) => c.minY)) - 6),
      bottom: Math.min(height - 1, Math.max(...group.map((c) => c.maxY)) + 6),
    };
    const cell = {
      left: bounds.left,
      top: bounds.top,
      width: bounds.right - bounds.left + 1,
      height: bounds.bottom - bounds.top + 1,
    };

    const { data: pixels, info: cropped } = await sharp(file)
      .extract(cell)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Key out the white page (soft edges) and clear anything the crop clipped at
    // its own border, which can only be a stray fragment.
    const inside = group.map((c) => c);
    for (let y = 0; y < cropped.height; y += 1) {
      for (let x = 0; x < cropped.width; x += 1) {
        const i = (y * cropped.width + x) * channels;
        const sheetX = cell.left + x;
        const sheetY = cell.top + y;
        const belongs = inside.some(
          (c) => sheetX >= c.minX - 1 && sheetX <= c.maxX + 1 && sheetY >= c.minY - 1 && sheetY <= c.maxY + 1,
        );
        const whiteness = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
        if (!belongs || whiteness > 238) {
          pixels[i + 3] = 0;
        } else if (whiteness > 214) {
          pixels[i + 3] = Math.round(255 * (1 - (whiteness - 214) / 24));
        }
      }
    }

    const out = await sharp(pixels, {
      raw: { width: cropped.width, height: cropped.height, channels: cropped.channels },
    })
      .trim({ threshold: 1 })
      .resize({ height: TARGET_HEIGHT, fit: "inside", kernel: "lanczos3" })
      .sharpen({ sigma: 0.8 })
      .png({ compressionLevel: 9, effort: 8 })
      .toBuffer();

    const name = names[index] ?? `pose-${rowIndex}-${index}`;
    await writeFile(`${DEST}/${name}.png`, out);
    const meta = await sharp(out).metadata();
    console.log(
      `${name.padEnd(6)} ${String(meta.width).padStart(4)}x${String(meta.height).padStart(4)}  ${Math.round(out.length / 1024)}KB  parts=${group.length}  sheetBox=[${bounds.left},${bounds.top} - ${bounds.right},${bounds.bottom}]  labelCentre=${Math.round(centre)}`,
    );
    saved += 1;
  }
}

console.log(`saved ${saved} poses to ${DEST}`);
