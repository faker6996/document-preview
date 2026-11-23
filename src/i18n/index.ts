import en from "./en.json";
import ja from "./ja.json";
import ko from "./ko.json";
import vi from "./vi.json";

export type DocumentPreviewMessages = typeof en;
export type DocumentPreviewLocale = "en" | "vi" | "ko" | "ja";

export const DOCUMENT_PREVIEW_MESSAGES: Record<DocumentPreviewLocale, DocumentPreviewMessages> = { en, vi, ko, ja };

export function resolveMessages(locale: string | undefined, overrides?: Partial<DocumentPreviewMessages>): DocumentPreviewMessages {
  const base = DOCUMENT_PREVIEW_MESSAGES[(locale?.slice(0, 2) as DocumentPreviewLocale) ?? "en"] ?? en;
  return overrides ? { ...base, ...overrides } : base;
}

/** "{name}" placeholders, like next-intl / ICU simple arguments. */
export function formatMessage(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
