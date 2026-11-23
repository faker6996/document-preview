/** Pure helpers for the Excel-style spreadsheet preview (components/ExcelSpreadsheetPreview.tsx). */

export const EXCEL_UI_FONT = `"Segoe UI", "Aptos", Calibri, Carlito, system-ui, sans-serif`;

// Office fonts are usually missing on Linux/Android; without a fallback the canvas drops to a
// serif default. Metric-compatible substitutes keep column widths and wrapping close to Excel.
const FONT_FALLBACKS: Array<[RegExp, string]> = [
  [/calibri|aptos/i, `Carlito, "Segoe UI", Arial, sans-serif`],
  [/cambria/i, `Caladea, Georgia, serif`],
  [/times new roman/i, `"Liberation Serif", Tinos, "Times New Roman", serif`],
  [/arial|helvetica/i, `"Liberation Sans", Arimo, Helvetica, Arial, sans-serif`],
  [/courier/i, `"Liberation Mono", Cousine, "Courier New", monospace`],
];
const GENERIC_FAMILY_RE = /\b(?:serif|sans-serif|monospace|system-ui|cursive|fantasy)\b/i;

export function themeCanvasFont(font: string): string {
  // x-spreadsheet header font: "500 12px Source Sans Pro" → Excel-like UI font.
  if (font.includes("Source Sans Pro")) {
    return font.replace(/^(\s*)\d{3}\s+/, "$1400 ").replace("Source Sans Pro", EXCEL_UI_FONT);
  }

  const match = /^(.*?\d+(?:\.\d+)?px)\s+(.+)$/.exec(font);
  if (!match || GENERIC_FAMILY_RE.test(match[2])) return font;
  const family = match[2];
  const fallback = FONT_FALLBACKS.find(([pattern]) => pattern.test(family))?.[1] ?? `"Segoe UI", Arial, sans-serif`;
  return `${match[1]} ${family}, ${fallback}`;
}

function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

/** Excel name-box text: A1, whole column "C:C", whole row "5:5". */
export function cellAddress(rowIndex: number, columnIndex: number): string {
  if (rowIndex < 0 && columnIndex < 0) return "";
  if (rowIndex < 0) return `${columnName(columnIndex)}:${columnName(columnIndex)}`;
  if (columnIndex < 0) return `${rowIndex + 1}:${rowIndex + 1}`;
  return `${columnName(columnIndex)}${rowIndex + 1}`;
}

