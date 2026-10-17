export function gentizeText(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\b(?:Gentize\s+MD|Managing\s+Director\s*\/\s*MD|MD\s*\/\s*Managing\s+Director)\b/gi, 'Gentize')
    .replace(/\bManaging\s+Director\b/gi, 'Gentize')
    .replace(/\bMD\b/g, 'Gentize')
    .replace(/\bGentize\b/gi, 'Gentize');
}
