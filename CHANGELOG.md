# Changelog

All notable changes to `@underverse-ui/document-preview` are documented here.
The project follows [Semantic Versioning](https://semver.org).

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
