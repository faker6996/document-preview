import assert from "node:assert/strict";
import { test } from "vitest";
import { cellAddress, EXCEL_UI_FONT, themeCanvasFont } from "../src/lib/excel-sheet";

test("cellAddress follows Excel name-box notation", () => {
  assert.equal(cellAddress(0, 0), "A1");
  assert.equal(cellAddress(4, 25), "Z5");
  assert.equal(cellAddress(9, 26), "AA10");
  assert.equal(cellAddress(0, 701), "ZZ1");
  assert.equal(cellAddress(0, 702), "AAA1");
  assert.equal(cellAddress(-1, 2), "C:C");
  assert.equal(cellAddress(4, -1), "5:5");
  assert.equal(cellAddress(-1, -1), "");
});

test("themeCanvasFont swaps the x-spreadsheet header font for an Excel-like UI font", () => {
  assert.equal(themeCanvasFont("500 24px Source Sans Pro"), `400 24px ${EXCEL_UI_FONT}`);
});

test("themeCanvasFont adds metric-compatible fallbacks so missing Office fonts never fall back to serif", () => {
  assert.equal(themeCanvasFont("bold 15px Calibri"), `bold 15px Calibri, Carlito, "Segoe UI", Arial, sans-serif`);
  assert.match(themeCanvasFont("italic 14.5px Times New Roman"), /Times New Roman, "Liberation Serif".*serif$/);
  assert.match(themeCanvasFont("12px Wingdings"), /Wingdings, "Segoe UI", Arial, sans-serif$/);
  // Already has a generic family: untouched.
  assert.equal(themeCanvasFont("13px Arial, sans-serif"), "13px Arial, sans-serif");
});
