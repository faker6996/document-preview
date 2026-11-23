// Framework-free helpers (no React): file-kind detection and dialog sizing.
export {
  type DocumentPreviewFile,
  type DocumentPreviewFrame,
  type DocumentViewerKind,
  canPreviewDocumentFile,
  getDocumentPreviewFrame,
  resolveDocumentExtension,
  resolveDocumentViewerKind,
} from "./lib/document-kind";
export { stripActiveContent } from "./lib/sanitize";
export { DOCUMENT_PREVIEW_MESSAGES, type DocumentPreviewLocale, type DocumentPreviewMessages } from "./i18n";
