/**
 * Shared text handling for brief generation: turning a model's output stream
 * into finished sentences and deciding which sentences are usable.
 */

export const MAX_LINES = 4;

export function cleanLine(raw: string): string {
  return raw
    .replace(/^\s*(?:[-•*–—]|\d+[.)])\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*#+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isUsableLine(line: string): boolean {
  if (line.length < 20) return false;
  if (/^UNAVAILABLE$/i.test(line)) return false;
  if (/^(?:language|headline|publisher|article text|url)\s*:/i.test(line)) return false;
  return true;
}

/**
 * Turns a stream of text deltas into finished lines, emitting each one as soon
 * as it is complete so the reader sees progress instead of a blank panel.
 *
 * Models are inconsistent about "one sentence per line": some honour it, others
 * return a single paragraph. So both a newline and a sentence boundary end a
 * line — and a boundary only counts once the segment is long enough that it
 * cannot be an abbreviation like "Dr." or "U.S.".
 */
const MIN_SENTENCE_CHARS = 40;
const SENTENCE_BOUNDARY = /[.!?।॥]["'”’)]?\s/gu;

/**
 * Abbreviations that look like a sentence end but are not: "the first time a
 * U.S. president…" must not be split, and neither must Malayalam "യു.എസ്.".
 * Two shapes are recognised — a run of one-to-three letter dotted tokens
 * (U.S., യു.എസ്.) and a short list of common titles and contractions.
 */
const DOTTED_TOKENS = /(?:^|[\s(])(?:[^\s.]{1,3}\.){1,}$/u;
const KNOWN_ABBREVIATION =
  /\b(?:dr|mr|mrs|ms|prof|st|no|vs|etc|jr|sr|ltd|co|inc|gen|col|capt|lt|sgt|rev|hon|approx|fig|sec|dept|univ)\.$/i;

function nextCut(pending: string): number {
  const newline = pending.indexOf("\n");

  let sentence = -1;
  SENTENCE_BOUNDARY.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SENTENCE_BOUNDARY.exec(pending)) !== null) {
    const cut = match.index + match[0].length - 1;
    if (cut < MIN_SENTENCE_CHARS) continue;

    // `cut` sits on the whitespace after the punctuation, so the tail has to end
    // at the punctuation itself for the abbreviation checks to see it.
    const tail = pending.slice(Math.max(0, cut - 12), cut);
    if (DOTTED_TOKENS.test(tail) || KNOWN_ABBREVIATION.test(tail)) continue;

    // A lowercase word straight after the space means the sentence continues
    // (English, Hindi, Marathi, Gujarati and Bengali all have case).
    if (/^["'”’)]?\s*[\p{Ll}]/u.test(pending.slice(cut + 1, cut + 4))) continue;

    sentence = cut;
    break;
  }

  if (newline !== -1 && (sentence === -1 || newline < sentence)) return newline;
  return sentence;
}

export async function* assembleLines(deltas: AsyncIterable<string>): AsyncGenerator<string> {
  let pending = "";
  let emitted = 0;

  for await (const piece of deltas) {
    pending += piece;

    for (;;) {
      const cut = nextCut(pending);
      if (cut === -1) break;

      const raw = pending.slice(0, cut);
      pending = pending.slice(cut + 1).replace(/^\s+/, "");

      const line = cleanLine(raw);
      // A paywall or blocked publisher answers UNAVAILABLE straight away.
      if (/^UNAVAILABLE$/i.test(line)) return;
      if (!isUsableLine(line)) continue;

      emitted += 1;
      yield line;
      if (emitted >= MAX_LINES) return;
    }
  }

  const leftover = cleanLine(pending);
  // A model that was cut off mid-sentence (token limit) leaves a fragment; drop
  // it rather than showing half a thought — unless it is all we have.
  const finished = /[.!?।॥]["'”’)\]]?$/u.test(leftover);
  if (isUsableLine(leftover) && emitted < MAX_LINES && (finished || emitted === 0)) {
    yield leftover;
  }
}
