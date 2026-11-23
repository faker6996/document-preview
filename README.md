# @underverse-ui/document-preview

[![npm](https://img.shields.io/npm/v/@underverse-ui/document-preview.svg)](https://www.npmjs.com/package/@underverse-ui/document-preview)
[![license](https://img.shields.io/npm/l/@underverse-ui/document-preview.svg)](./LICENSE)

React components to preview **PDF, Word, Excel, PowerPoint, CSV, text / JSON / XML and images** in the
browser. Files open in a dialog whose size follows the document: an A4 page for PDF and Word, a wide frame
for spreadsheets, a 16:9 or 4:3 stage for slides, and a frame that hugs the image.

- **Excel-like spreadsheets**: formula bar (cell address + `fx` + cell content), grey row/column headers,
  green selection and fill handle, sheet tabs, Office font fallbacks.
- **PowerPoint-like slides**: numbered thumbnails, slide fitted to the window (any aspect ratio), zoom presets,
  keyboard navigation, status bar.
- **Right-sized dialog**: never smaller than readable, never larger than the screen, on desktop and mobile.
- **Lazy**: each renderer (PDF, Excel, PowerPoint, Word, syntax highlighting) is downloaded only when a file of
  that kind is opened.
- **Framework-agnostic**: React 18+. Works in Next.js App Router (components ship with `"use client"`), Vite, Remix…
- **i18n**: English, Vietnamese, Korean and Japanese built in; every message can be overridden.
- **Safe by default**: renderer HTML re-inserted into the page is stripped of scripts and event handlers.

Part of the [underverse](https://www.npmjs.com/package/@underverse-ui/underverse) family, but it does **not**
depend on `@underverse-ui/underverse`: any React + Tailwind CSS v4 app can use it.

---

## Contents

- [Install](#install)
- [Styling setup (Tailwind CSS v4)](#styling-setup-tailwind-css-v4)
- [Quick start](#quick-start)
- [Next.js](#nextjs)
- [Authenticated / private files](#authenticated--private-files)
- [PDF engine (pdfium.wasm)](#pdf-engine-pdfiumwasm)
- [API reference](#api-reference)
- [Supported formats](#supported-formats)
- [Dialog sizing](#dialog-sizing)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Internationalization](#internationalization)
- [Theming](#theming)
- [Security](#security)
- [Browser support](#browser-support)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Releasing](#releasing)
- [License](#license)

---

## Install

```bash
npm install @underverse-ui/document-preview lucide-react
# or
pnpm add @underverse-ui/document-preview lucide-react
# or
yarn add @underverse-ui/document-preview lucide-react
```

| Peer dependency | Version |
|---|---|
| `react`, `react-dom` | `>= 18` |
| `lucide-react` | `>= 0.400.0` |

The renderers (`@embedpdf/react-pdf-viewer`, `@js-preview/excel`, `pptx-preview`, `docx-preview`, `papaparse`,
`prismjs`, `jszip`) are regular dependencies and are loaded on demand.

## Styling setup (Tailwind CSS v4)

The UI chrome uses Tailwind utility classes with **semantic color tokens** — the same names as
[shadcn/ui](https://ui.shadcn.com) and underverse. Tell Tailwind to scan the package:

```css
/* app/globals.css (or your main CSS file) */
@import "tailwindcss";
@source "../node_modules/@underverse-ui/document-preview/dist";
```

Tokens used: `background`, `foreground`, `card`, `card-foreground`, `muted`, `muted-foreground`, `accent`,
`border`, `ring`, `primary`, `primary-foreground`, `success`, `destructive`, `surface-1`.

Apps that already use underverse or shadcn/ui have them. Otherwise add a minimal theme (light + dark):

```css
@theme {
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-card: #ffffff;
  --color-card-foreground: #0f172a;
  --color-muted: #f1f5f9;
  --color-muted-foreground: #64748b;
  --color-accent: #f1f5f9;
  --color-border: #e2e8f0;
  --color-ring: #94a3b8;
  --color-primary: #2563eb;
  --color-primary-foreground: #ffffff;
  --color-success: #16a34a;
  --color-destructive: #dc2626;
  --color-surface-1: #f8fafc;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #0b0f14;
    --color-foreground: #e2e8f0;
    --color-card: #11161d;
    --color-card-foreground: #e2e8f0;
    --color-muted: #1b222c;
    --color-muted-foreground: #94a3b8;
    --color-accent: #1f2731;
    --color-border: #263040;
    --color-surface-1: #141a22;
  }
}
```

The spreadsheet grid and the slide "paper" are always light, like Office, regardless of the theme.

## Quick start

```tsx
"use client";

import { useState } from "react";
import {
  DocumentPreviewDialog,
  DocumentPreviewProvider,
  canPreviewDocumentFile,
  type DocumentPreviewFile,
} from "@underverse-ui/document-preview";

type Attachment = { url: string; name: string; contentType?: string; size?: number };

export function AttachmentList({ files }: { files: Attachment[] }) {
  const [preview, setPreview] = useState<DocumentPreviewFile | null>(null);

  const open = (file: Attachment) => {
    if (canPreviewDocumentFile(file.name, null, file.contentType)) {
      setPreview({ url: file.url, name: file.name, contentType: file.contentType, sizeBytes: file.size });
    } else {
      window.open(file.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <DocumentPreviewProvider locale="en">
      <ul>
        {files.map((file) => (
          <li key={file.url}>
            <button type="button" onClick={() => open(file)}>{file.name}</button>
          </li>
        ))}
      </ul>
      <DocumentPreviewDialog file={preview} onClose={() => setPreview(null)} />
    </DocumentPreviewProvider>
  );
}
```

Inline viewer (no dialog), e.g. in a side panel:

```tsx
import { UniversalDocumentViewer } from "@underverse-ui/document-preview";

<div style={{ height: 600, display: "flex" }}>
  <UniversalDocumentViewer fileUrl="/files/report.xlsx" fileName="report.xlsx" fillParent showHeader={false} />
</div>
```

`DocumentPreviewProvider` is optional: without it the defaults below apply (English, plain `fetch`).
Wrap your app (or layout) once to configure every viewer.

## Next.js

The package entry is marked `"use client"`, so you can import it from client components. Put the provider in
a client layout component:

```tsx
// app/providers.tsx
"use client";

import { DocumentPreviewProvider } from "@underverse-ui/document-preview";

export function Providers({ children, locale }: { children: React.ReactNode; locale: string }) {
  return (
    <DocumentPreviewProvider locale={locale} pdfWasmUrl="/pdfium.wasm">
      {children}
    </DocumentPreviewProvider>
  );
}
```

## Authenticated / private files

PDF, Office and text files are downloaded as bytes before rendering. Pass your own `fetcher` to add tokens,
refresh sessions or call your API client. `resolveUrl` maps stored paths to loadable URLs.

```tsx
<DocumentPreviewProvider
  fetcher={async (url, init) => {
    const token = await getAccessToken();
    return fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}` } });
  }}
  resolveUrl={(path) => (path.startsWith("http") ? path : `https://files.example.com${path}`)}
>
  {children}
</DocumentPreviewProvider>
```

Images are displayed with a plain `<img src>` (no fetcher), so image URLs must be loadable by the browser
directly (cookie session, signed URL or public URL).

## PDF engine (pdfium.wasm)

PDFs are rendered with [EmbedPDF](https://www.embedpdf.com) (PDFium compiled to WebAssembly). By default the
viewer loads the engine from its own default location. For intranet/offline apps or a strict CSP, serve the
file yourself:

```bash
cp node_modules/@embedpdf/pdfium/dist/pdfium.wasm public/pdfium.wasm
```

```tsx
<DocumentPreviewProvider pdfWasmUrl="/pdfium.wasm">…</DocumentPreviewProvider>
```

Tip: add the copy step to `postinstall` so the file stays in sync with the installed version.

## API reference

### `<DocumentPreviewProvider>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `locale` | `string` (`"en"`, `"vi"`, `"ko"`, `"ja"`, or a tag like `"vi-VN"`) | `"en"` | UI language; unknown languages fall back to English |
| `messages` | `Partial<DocumentPreviewMessages>` | — | Override individual messages |
| `fetcher` | `(url: string, init?: RequestInit) => Promise<Response>` | `fetch(url, { credentials: "include", ...init })` | Downloads file bytes |
| `resolveUrl` | `(url: string) => string \| undefined` | identity | Maps a stored path to the URL to load |
| `pdfWasmUrl` | `string` | EmbedPDF default | URL of `pdfium.wasm` |

### `<DocumentPreviewDialog>`

| Prop | Type | Description |
|---|---|---|
| `file` | `DocumentPreviewFile \| null` | File to show; `null` closes the dialog |
| `onClose` | `() => void` | Called on close button, overlay click or `Esc` |

```ts
type DocumentPreviewFile = {
  url: string;                 // passed through resolveUrl
  name: string;                // shown in the header; its extension is used to detect the kind
  extension?: string | null;   // explicit extension ("xlsx"), wins over the name
  contentType?: string | null; // MIME type, used when there is no extension
  sizeBytes?: number | null;   // shown in the header
};
```

### `<UniversalDocumentViewer>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `fileUrl` | `string \| null` | — | File URL (passed through `resolveUrl`) |
| `fileName` | `string` | — | Name shown in the header and used for kind detection |
| `fileExt` | `string \| null` | — | Explicit extension |
| `contentType` | `string \| null` | — | MIME type |
| `sizeBytes` | `number \| null` | — | Shown in the header |
| `title` | `string` | `fileName` | Header title |
| `showHeader` | `boolean` | `true` | Header with name, download, fullscreen and close buttons |
| `fillParent` | `boolean` | `false` | Fill a flex parent instead of using a fixed height |
| `embedded` | `boolean` | `false` | Shorter fixed height for inline use |
| `seamless` | `boolean` | `false` | No border / radius |
| `presentation` | `"inline" \| "dialog"` | `"inline"` | `"dialog"` sizes the content per document kind (used by `DocumentPreviewDialog`) |
| `onClose` | `() => void` | — | Shows a close button in the header |

### Helpers — `@underverse-ui/document-preview/utils`

Framework-free (no React import), usable on the server:

| Export | Description |
|---|---|
| `canPreviewDocumentFile(name, ext?, mime?)` | `true` if the dialog can show the file (including legacy formats, which show a download prompt) |
| `resolveDocumentExtension(name, ext?, mime?)` | Normalized extension (`"xlsx"`, `"pdf"`, …) |
| `resolveDocumentViewerKind(extension, mime?)` | `"pdf" \| "docx" \| "xlsx" \| "csv" \| "pptx" \| "text" \| "xml" \| "json" \| "image" \| "legacy" \| "unsupported"` |
| `getDocumentPreviewFrame(kind)` | `{ width, viewportHeight? }` CSS sizes used by the dialog |
| `stripActiveContent(html)` | Removes scripts, iframes, `on*` handlers and `javascript:` URLs (browser only) |
| `DOCUMENT_PREVIEW_MESSAGES` | Built-in messages per locale |

Everything is also re-exported from the main entry.

## Supported formats

| Kind | Extensions / MIME | Rendering |
|---|---|---|
| PDF | `pdf`, `application/pdf` | PDF viewer with toolbar, thumbnails, search and zoom |
| Word | `docx` | Paged document |
| Excel | `xlsx`, `xls`, `application/vnd.ms-excel` | Excel-like grid: formula bar, headers, selection, sheet tabs |
| CSV | `csv`, `tsv` | Table |
| PowerPoint | `pptx` | PowerPoint-like Normal view |
| Text | `txt`, `md`, `log` | Plain text with copy button |
| Data | `json`, `xml` | Syntax highlighted, pretty-printed JSON, copy button |
| Image | `png`, `jpg`, `jpeg`, `webp`, `gif`, `bmp`, `ico`, `avif`, `svg`, `image/*` | Natural size, scaled down to fit, never upscaled |
| Legacy | `doc`, `ppt`, `rtf`, `odt`, `ods`, `odp` | Cannot be rendered in a browser: explanation + download button |
| Other | anything else | `canPreviewDocumentFile` returns `false`; open or download it yourself |

## Dialog sizing

| Kind | Max width | Max content height |
|---|---|---|
| Excel, CSV | 1440 px | 920 px |
| PowerPoint | 1280 px | 840 px |
| PDF, Word | 1080 px | 1240 px |
| Text, JSON, XML | 960 px | 880 px |
| Image | fits the image | fits the image |
| Legacy / unsupported | 560 px | 320 px |

Every size is clamped to the viewport (`min(…, 100%)` and `min(calc(100dvh - 7rem), …)`), so the dialog never
overflows the screen. Use `getDocumentPreviewFrame(kind)` to reuse the same sizes in your own containers.

## Keyboard shortcuts

| Where | Keys | Action |
|---|---|---|
| Dialog | `Esc` | Close (exits fullscreen first) |
| PowerPoint | `→` `↓` `PageDown` / `←` `↑` `PageUp` | Next / previous slide |
| PowerPoint | `Home` / `End` | First / last slide |
| Text, JSON, XML, CSV | `Ctrl`/`⌘` + `A` | Select the document content only |

## Internationalization

```tsx
<DocumentPreviewProvider locale="vi">…</DocumentPreviewProvider>

// Override a few messages (any locale):
<DocumentPreviewProvider locale="en" messages={{ download: "Get file", slidePosition: "Slide {current}/{total}" }}>
```

Placeholders use `{name}`. Message keys:

| Key | Used for |
|---|---|
| `preview`, `download`, `close` | Header label and buttons |
| `fullscreen`, `exitFullscreen` | Fullscreen button |
| `copyContent`, `copied`, `copyFailed` | Copy button (text, JSON, XML, CSV) |
| `loading`, `loadFailed` (`{status}`), `renderFailed` | Loading and errors |
| `unavailable`, `fileUrlUnavailable`, `unsupported`, `legacyUnsupported` | Messages instead of a preview |
| `noRows`, `spreadsheetUnavailable` | Tables and spreadsheets |
| `cellAddress`, `cellContent` | Excel formula bar |
| `slideList`, `slideThumbnail` (`{index}`), `slidePosition` (`{current}`, `{total}`) | PowerPoint pane and status bar |
| `previousSlide`, `nextSlide`, `previousPage`, `nextPage` | Navigation |
| `zoomIn`, `zoomOut`, `fitToWindow` | Zoom controls |

The built-in texts are in [`src/i18n`](./src/i18n). Pull requests for new languages are welcome.

## Theming

- App chrome (dialog, header, buttons, slide pane, status bar) follows your Tailwind tokens, including dark mode.
- Excel-like grid: Office green `#217346`, grey headers, light gridlines.
- PowerPoint-like accent: `#c43e1c` for the active thumbnail.
- Office fonts (Calibri, Cambria, Times New Roman, Arial, Courier) get metric-compatible fallbacks
  (Carlito, Caladea, Liberation, …) so spreadsheets never fall back to a serif font on Linux/Android.
  Install those fonts on Linux/kiosk machines for the closest match.

## Security

- **Slide thumbnails** re-insert HTML produced by the PowerPoint renderer. It always passes through
  `stripActiveContent` (scripts, iframes, objects, forms, `on*` handlers and `javascript:` URLs are removed).
  This cannot be turned off.
- **SVG** is shown through `<img>`, which does not execute scripts. Still validate and sanitize uploads on the server.
- **Network**: file bytes are fetched with your `fetcher`; the library makes no other requests except loading
  its own lazy chunks and (unless `pdfWasmUrl` is set) the PDF engine.
- Files are rendered entirely in the browser; nothing is uploaded anywhere.

Report vulnerabilities privately through [GitHub security advisories](https://github.com/faker6996/document-preview/security/advisories/new).

## Browser support

Current Chrome, Edge, Firefox and Safari (desktop and mobile). Requires `ResizeObserver`, `DOMParser`,
WebAssembly (PDF) and the Fullscreen API (optional).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Unstyled dialog / missing colors | Add the `@source` line and make sure the color tokens exist ([Styling setup](#styling-setup-tailwind-css-v4)) |
| "Failed to load (401/403)" | Pass a `fetcher` that sends your credentials, or check CORS for cross-origin file servers |
| PDF stays blank in an intranet | Serve `pdfium.wasm` yourself and set `pdfWasmUrl` |
| Spreadsheet text looks serif | Install Carlito/Liberation fonts, or the original Office fonts |
| `.doc` / `.ppt` not rendered | Legacy binary formats are not supported in browsers; convert to PDF/DOCX/PPTX on your server |
| Dialog behind your header | The overlay uses `z-index: 9999`; lower conflicting fixed elements |

## Development

```bash
git clone https://github.com/faker6996/document-preview.git
cd document-preview
npm install
npm run check   # typecheck + tests + build
npm run dev     # rebuild on change (use `npm link` to try it in an app)
```

Project layout:

```
src/
  components/   DocumentPreviewDialog, UniversalDocumentViewer, Excel/PowerPoint/PDF previews
  lib/          kind detection & sizing, sanitizer, spreadsheet/slide helpers
  i18n/         en / vi / ko / ja messages
  context.tsx   DocumentPreviewProvider
tests/          unit tests (vitest)
```

## Releasing

Every push to `main` is released automatically by CI when library code changed (`feat:` → minor, breaking →
major, anything else → patch; `[skip release]` in the commit subject to opt out), published with npm Trusted Publishing.
See [PUBLISHING.md](./PUBLISHING.md) and [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT](./LICENSE) © Tran Van Bach
