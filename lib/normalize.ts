export function normalizeName(s: string): string {
  if (!s) return "";
  return s
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
