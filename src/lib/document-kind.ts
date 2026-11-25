const KNOWN_FILENAMES: Record<string, string> = {
  dockerfile: "dockerfile",
  makefile: "makefile",
  readme: "txt",
  license: "txt",
  changelog: "txt",
};

const MIME_EXTENSION_MAP: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/msword": "doc",
  "application/vnd.ms-excel": "xls",
  "application/vnd.ms-powerpoint": "ppt",
  "application/json": "json",
  "application/xml": "xml",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "application/javascript": "js",
  "application/typescript": "ts",
  "application/x-typescript": "ts",
  "application/yaml": "yaml",
  "application/x-yaml": "yaml",
  "application/sql": "sql",
  "text/csv": "csv",
  "text/tab-separated-values": "tsv",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/html": "html",
  "text/css": "css",
  "text/javascript": "js",
  "text/typescript": "ts",
  "text/yaml": "yaml",
  "text/xml": "xml",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/flac": "flac",
  "audio/aac": "aac",
  "audio/webm": "weba",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/avif": "avif",
  "image/x-icon": "ico",
};

export type DocumentPreviewFile = {
  url: string;
  name: string;
  extension?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
};

export function resolveDocumentExtension(fileName?: string | null, fileExt?: string | null, contentType?: string | null) {
  const explicit = String(fileExt || "").trim().replace(/^\./, "").toLowerCase();
  if (explicit) return explicit;

  const normalizedName = String(fileName || "").trim();
  const baseName = normalizedName.split(/[\\/]/).pop()?.trim() || "";
  if (baseName) {
    const known = KNOWN_FILENAMES[baseName.toLowerCase()];
    if (known) return known;
    const dotIndex = baseName.lastIndexOf(".");
    if (dotIndex !== -1 && dotIndex < baseName.length - 1) {
      return baseName.slice(dotIndex + 1).trim().toLowerCase();
    }
  }

  const mime = String(contentType || "").split(";")[0].trim().toLowerCase();
  return MIME_EXTENSION_MAP[mime] || "";
}

export type DocumentViewerKind =
  | "pdf"
  | "docx"
  | "xlsx"
  | "csv"
  | "pptx"
  | "markdown"
  | "html"
  | "code"
  | "text"
  | "xml"
  | "json"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "legacy"
  | "unsupported";

const VIEWER_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "avif"]);
const VIEWER_VIDEO_EXTENSIONS = new Set(["mp4", "webm", "ogv", "mov", "m4v"]);
const VIEWER_AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "m4a", "flac", "aac", "opus", "weba"]);
const VIEWER_MARKDOWN_EXTENSIONS = new Set(["md", "markdown", "mdx"]);
const VIEWER_HTML_EXTENSIONS = new Set(["html", "htm"]);
const VIEWER_CODE_EXTENSIONS = new Set([
  "js",
  "mjs",
  "cjs",
  "jsx",
  "ts",
  "mts",
  "cts",
  "tsx",
  "py",
  "java",
  "c",
  "h",
  "cpp",
  "hpp",
  "cc",
  "cs",
  "go",
  "rs",
  "rb",
  "php",
  "swift",
  "kt",
  "kts",
  "sql",
  "sh",
  "bash",
  "zsh",
  "yaml",
  "yml",
  "toml",
  "ini",
  "conf",
  "env",
  "css",
  "scss",
  "less",
  "graphql",
  "gql",
  "diff",
  "patch",
  "dockerfile",
  "makefile",
  "gitignore",
  "dockerignore",
  "editorconfig",
]);
const VIEWER_TEXT_EXTENSIONS = new Set(["txt", "log"]);
const VIEWER_ARCHIVE_EXTENSIONS = new Set(["zip"]);
const VIEWER_LEGACY_EXTENSIONS = new Set(["doc", "ppt", "rtf", "odt", "ods", "odp"]);

export function resolveDocumentViewerKind(extension: string, contentType?: string | null): DocumentViewerKind {
  const ext = String(extension || "").trim().replace(/^\./, "").toLowerCase();
  const mime = String(contentType || "").split(";")[0].trim().toLowerCase();

  if (VIEWER_IMAGE_EXTENSIONS.has(ext) || mime.startsWith("image/")) return "image";
  if (VIEWER_VIDEO_EXTENSIONS.has(ext) || mime.startsWith("video/")) return "video";
  if (VIEWER_AUDIO_EXTENSIONS.has(ext) || mime.startsWith("audio/")) return "audio";
  if (ext === "pdf" || mime.includes("pdf")) return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  if (ext === "csv" || ext === "tsv" || mime.includes("csv") || mime.includes("tab-separated")) return "csv";
  if (ext === "pptx") return "pptx";
  if (VIEWER_ARCHIVE_EXTENSIONS.has(ext) || mime === "application/zip" || mime === "application/x-zip-compressed") return "archive";
  if (VIEWER_MARKDOWN_EXTENSIONS.has(ext) || mime === "text/markdown") return "markdown";
  if (VIEWER_HTML_EXTENSIONS.has(ext) || mime === "text/html") return "html";
  if (ext === "xml" || mime.includes("xml")) return "xml";
  if (ext === "json" || mime.includes("json")) return "json";
  if (VIEWER_CODE_EXTENSIONS.has(ext)) return "code";
  if (VIEWER_TEXT_EXTENSIONS.has(ext) || mime.startsWith("text/")) return "text";
  if (VIEWER_LEGACY_EXTENSIONS.has(ext)) return "legacy";
  return "unsupported";
}

export function canPreviewDocumentFile(fileName?: string | null, fileExt?: string | null, contentType?: string | null) {
  const extension = resolveDocumentExtension(fileName, fileExt, contentType);
  return resolveDocumentViewerKind(extension, contentType) !== "unsupported";
}

/**
 * Dialog frame per document kind: wide enough to read, never larger than the screen.
 * `viewportHeight` is the content area below the viewer header; undefined = sized by content (images).
 * The available height subtracts the modal overlay padding (1.5rem × 2) and the 3rem viewer header.
 */
export type DocumentPreviewFrame = { width: string; viewportHeight?: string };

const DIALOG_VIEWPORT_MAX = "calc(100dvh - 7rem)";
const fitHeight = (preferred: string) => `min(${DIALOG_VIEWPORT_MAX}, ${preferred})`;

const DOCUMENT_PREVIEW_FRAMES: Record<DocumentViewerKind, DocumentPreviewFrame> = {
  // Paged portrait documents: an A4 page at comfortable zoom plus the PDF toolbar.
  pdf: { width: "min(1080px, 100%)", viewportHeight: fitHeight("1240px") },
  docx: { width: "min(1080px, 100%)", viewportHeight: fitHeight("1240px") },
  // 16:9 slides.
  pptx: { width: "min(1280px, 100%)", viewportHeight: fitHeight("840px") },
  // Tables need width more than height.
  xlsx: { width: "min(1440px, 100%)", viewportHeight: fitHeight("920px") },
  csv: { width: "min(1440px, 100%)", viewportHeight: fitHeight("920px") },
  // Rendered rich text / web pages / archives.
  markdown: { width: "min(960px, 100%)", viewportHeight: fitHeight("920px") },
  html: { width: "min(1120px, 100%)", viewportHeight: fitHeight("920px") },
  archive: { width: "min(1040px, 100%)", viewportHeight: fitHeight("820px") },
  // Code/text: a readable line length.
  code: { width: "min(1040px, 100%)", viewportHeight: fitHeight("880px") },
  text: { width: "min(960px, 100%)", viewportHeight: fitHeight("880px") },
  xml: { width: "min(960px, 100%)", viewportHeight: fitHeight("880px") },
  json: { width: "min(960px, 100%)", viewportHeight: fitHeight("880px") },
  // Media.
  video: { width: "min(1120px, 100%)", viewportHeight: fitHeight("720px") },
  audio: { width: "min(560px, 100%)", viewportHeight: "280px" },
  // The dialog wraps the image; ImagePreview clamps it to the screen and keeps a minimum size.
  image: { width: "fit-content" },
  // Only a message and a download button are shown.
  legacy: { width: "min(560px, 100%)", viewportHeight: "320px" },
  unsupported: { width: "min(560px, 100%)", viewportHeight: "320px" },
};

export function getDocumentPreviewFrame(kind: DocumentViewerKind): DocumentPreviewFrame {
  return DOCUMENT_PREVIEW_FRAMES[kind];
}
