# document-preview

React document preview for **PDF, Word, Excel, PowerPoint, CSV, text/JSON/XML and images**, shown in a
dialog whose size follows the document: an A4 page for PDF/Word, a wide frame for spreadsheets, a 16:9 or
4:3 stage for slides, and a frame that fits the image.

- **Excel-like spreadsheets**: formula bar (cell address + `fx`), grey headers, green selection, sheet tabs.
- **PowerPoint-like slides**: numbered thumbnails, slide fit to window, zoom, keyboard navigation.
- **No framework lock-in**: React 18+ only. Works with Next.js (components ship with `"use client"`).
- **Lazy**: each renderer (PDF, Excel, PowerPoint, Word, syntax highlighting) is loaded only when a file of that kind is opened.
- **i18n**: English, Vietnamese, Korean, Japanese built in; every message can be overridden.

## Install

```bash
npm install github:faker6996/document-preview
# later, once published:
# npm install @bachtv/document-preview
```

Peer dependencies: `react`, `react-dom` (>= 18), `lucide-react`.

## Styling (Tailwind CSS v4)

Components use Tailwind utility classes with semantic color tokens (the same ones as shadcn/ui and
underverse): `background`, `foreground`, `card`, `card-foreground`, `muted`, `muted-foreground`, `accent`,
`border`, `ring`, `primary`, `primary-foreground`, `success`, `destructive`, `surface-1`.

Let Tailwind scan the package:

```css
/* app/globals.css */
@import "tailwindcss";
@source "../node_modules/@bachtv/document-preview/dist";
```

The spreadsheet grid and slide "paper" are always light (like Office) and do not depend on these tokens.

## Usage

```tsx
"use client";

import { useState } from "react";
import { DocumentPreviewDialog, DocumentPreviewProvider, canPreviewDocumentFile, type DocumentPreviewFile } from "@bachtv/document-preview";

export function Attachments({ files }: { files: { url: string; name: string; contentType?: string }[] }) {
  const [preview, setPreview] = useState<DocumentPreviewFile | null>(null);

  return (
    <DocumentPreviewProvider locale="vi">
      {files.map((file) => (
        <button
          key={file.url}
          onClick={() =>
            canPreviewDocumentFile(file.name, null, file.contentType)
              ? setPreview({ url: file.url, name: file.name, contentType: file.contentType })
              : window.open(file.url, "_blank", "noopener,noreferrer")
          }
        >
          {file.name}
        </button>
      ))}
      <DocumentPreviewDialog file={preview} onClose={() => setPreview(null)} />
    </DocumentPreviewProvider>
  );
}
```

Inline (no dialog):

```tsx
<UniversalDocumentViewer fileUrl={url} fileName="report.xlsx" fillParent showHeader={false} />
```

## Configuration — `DocumentPreviewProvider`

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `locale` | `"en" \| "vi" \| "ko" \| "ja"` | `"en"` | UI language |
| `messages` | `Partial<DocumentPreviewMessages>` | — | Override any message |
| `fetcher` | `(url, init) => Promise<Response>` | `fetch(url, { credentials: "include" })` | Downloads file bytes (PDF/Office/text). Pass your authenticated fetch (token refresh, headers) |
| `resolveUrl` | `(url) => string \| undefined` | identity | Maps a stored path to a loadable URL (e.g. prefix your file server) |
| `pdfWasmUrl` | `string` | PDF viewer default | URL of `@embedpdf/pdfium/pdfium.wasm` served by your app (recommended for offline/intranet) |

## Supported formats

| Kind | Extensions | Rendering |
|---|---|---|
| PDF | `pdf` | PDF viewer with toolbar and zoom |
| Word | `docx` | Paged document |
| Excel | `xlsx`, `xls` | Excel-like grid with formula bar and sheet tabs |
| CSV | `csv`, `tsv` | Table |
| PowerPoint | `pptx` | PowerPoint-like Normal view |
| Text | `txt`, `md`, `log` | Plain text, copy button |
| Data | `json`, `xml` | Syntax highlighted, copy button |
| Image | `png`, `jpg`, `jpeg`, `webp`, `gif`, `bmp`, `ico`, `avif`, `svg` | Fits the screen, never upscaled |
| Legacy | `doc`, `ppt`, `rtf`, `odt`, `ods`, `odp` | Not renderable in the browser: explanation + download button |

Helpers without React: `import { canPreviewDocumentFile, getDocumentPreviewFrame } from "@bachtv/document-preview/utils"`.

## Security

- Slide thumbnails re-insert renderer HTML; it always passes through `stripActiveContent`
  (removes scripts, iframes, `on*` handlers, `javascript:` URLs). This cannot be disabled.
- SVG images are displayed with `<img>`, which does not execute scripts. Still, validate uploads on your server.

## Development

```bash
npm install
npm run check   # typecheck + tests + build
```

## License

MIT © Tran Van Bach
