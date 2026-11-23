const DOCUMENT_PREVIEW_EXTENSIONS = new Set([
  "pdf",
  "docx",
  "xlsx",
  "xls",
  "csv",
  "tsv",
  "pptx",
  "txt",
  "md",
  "log",
  "xml",
  "json",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "svg",
  "bmp",
  "ico",
  "avif",
  // Legacy Office/OpenDocument formats cannot be rendered in the browser; the dialog still opens
  // so the user gets an explanation and a download button instead of a silent new tab.
  "doc",
  "ppt",
  "rtf",
  "odt",
  "ods",
  "odp",
]);

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
  "text/csv": "csv",
  "text/tab-separated-values": "tsv",
  "text/plain": "txt",
  "text/xml": "xml",
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
  const nameExtension = normalizedName.includes(".") ? normalizedName.split(".").pop()?.trim().toLowerCase() : "";
  if (nameExtension) return nameExtension;

  return MIME_EXTENSION_MAP[String(contentType || "").trim().toLowerCase()] || "";
}

export function canPreviewDocumentFile(fileName?: string | null, fileExt?: string | null, contentType?: string | null) {
  return DOCUMENT_PREVIEW_EXTENSIONS.has(resolveDocumentExtension(fileName, fileExt, contentType));
}

export type DocumentViewerKind =
  | "pdf"
  | "docx"
  | "xlsx"
  | "csv"
  | "pptx"
  | "text"
  | "xml"
  | "json"
  | "image"
  | "legacy"
  | "unsupported";

const VIEWER_TEXT_EXTENSIONS = new Set(["txt", "log", "md", "sql", "conf", "ini", "env", "yaml", "yml", "sh", "py", "js", "ts", "tsx", "jsx", "html", "css"]);
const VIEWER_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "avif"]);
const VIEWER_LEGACY_EXTENSIONS = new Set(["doc", "ppt", "rtf", "odt", "ods", "odp"]);

export function resolveDocumentViewerKind(extension: string, contentType?: string | null): DocumentViewerKind {
  const mime = String(contentType || "").toLowerCase();
  if (VIEWER_IMAGE_EXTENSIONS.has(extension) || mime.startsWith("image/")) return "image";
  if (extension === "pdf" || mime.includes("pdf")) return "pdf";
  if (extension === "docx") return "docx";
  if (extension === "xlsx" || extension === "xls") return "xlsx";
  if (extension === "csv" || extension === "tsv" || mime.includes("csv") || mime.includes("tab-separated")) return "csv";
  if (extension === "pptx") return "pptx";
  if (extension === "xml" || mime.includes("xml")) return "xml";
  if (extension === "json" || mime.includes("json")) return "json";
  if (VIEWER_TEXT_EXTENSIONS.has(extension) || mime.startsWith("text/")) return "text";
  if (VIEWER_LEGACY_EXTENSIONS.has(extension)) return "legacy";
  return "unsupported";
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
  // Code/text: a readable line length.
  text: { width: "min(960px, 100%)", viewportHeight: fitHeight("880px") },
  xml: { width: "min(960px, 100%)", viewportHeight: fitHeight("880px") },
  json: { width: "min(960px, 100%)", viewportHeight: fitHeight("880px") },
  // The dialog wraps the image; ImagePreview clamps it to the screen and keeps a minimum size.
  image: { width: "fit-content" },
  // Only a message and a download button are shown.
  legacy: { width: "min(560px, 100%)", viewportHeight: "320px" },
  unsupported: { width: "min(560px, 100%)", viewportHeight: "320px" },
};

export function getDocumentPreviewFrame(kind: DocumentViewerKind): DocumentPreviewFrame {
  return DOCUMENT_PREVIEW_FRAMES[kind];
}
