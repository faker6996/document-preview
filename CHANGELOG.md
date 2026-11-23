# Changelog

All notable changes to `@underverse-ui/document-preview` are documented here.
The project follows [Semantic Versioning](https://semver.org).

## 0.1.3 — 2026-11-23

- docs: add GIFs and screenshots to the README (c3b3c90)

## 0.1.2 — 2026-11-23

- fix: keep the Excel formula bar in sync on open and sheet switch (ad19792)

## 0.1.1 — 2026-11-23

- fix(ci): honour the release opt-out only in the latest commit subject (8a3eb45)
- fix: ship type declarations for the /utils entry (83182a7)
- ci: release automatically on every push to main (51c7a71)

## 0.1.0

First public release.

- `DocumentPreviewDialog`: modal preview whose size follows the document kind and never exceeds the screen.
- `UniversalDocumentViewer`: inline viewer for PDF, Word (`docx`), Excel (`xlsx`, `xls`), CSV/TSV, PowerPoint
  (`pptx`), text, JSON, XML and images; legacy formats (`doc`, `ppt`, `rtf`, `odt`, `ods`, `odp`) show a
  download prompt.
- Excel-like spreadsheet view: formula bar, grey headers, green selection, sheet tabs, Office font fallbacks.
- PowerPoint-like slide view: numbered thumbnails, fit to window for any aspect ratio, zoom presets, keyboard
  navigation, status bar.
- `DocumentPreviewProvider`: `fetcher`, `resolveUrl`, `pdfWasmUrl`, `locale`, `messages`.
- Built-in messages: English, Vietnamese, Korean, Japanese.
- Framework-free helpers in `@underverse-ui/document-preview/utils`.
- Renderer HTML re-inserted for slide thumbnails is always stripped of active content.
