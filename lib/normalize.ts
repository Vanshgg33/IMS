export function normalizeName(s: string): string {
  if (!s) return "";
  return s
    .normalize("NFC")
    // strip invisible chars: zero-width space (​), ZWNJ (‌), ZWJ (‍),
    // soft-hyphen (­), BOM (﻿), word-joiner (⁠)
    .replace(/[​‌‍­﻿⁠]/g, "")
    // collapse all whitespace (incl. non-breaking, thin, em-space) to one ASCII space
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
