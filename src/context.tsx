"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { type DocumentPreviewMessages, formatMessage, resolveMessages } from "./i18n";

export type DocumentFetcher = (url: string, init?: RequestInit) => Promise<Response>;

export type DocumentPreviewConfig = {
  /** UI language: "en" (default), "vi", "ko", "ja". */
  locale?: string;
  /** Override any built-in message. */
  messages?: Partial<DocumentPreviewMessages>;
  /**
   * Downloads the file bytes for PDF/Office/text previews. Default: `fetch(url, { credentials: "include" })`.
   * Pass your authenticated fetch (token refresh, headers...) here.
   */
  fetcher?: DocumentFetcher;
  /** Maps a stored path/URL to the URL the browser should load (e.g. prefix your API/file origin). */
  resolveUrl?: (url: string) => string | undefined;
  /** URL of `@embedpdf/pdfium/pdfium.wasm` served by your app. Default: the PDF viewer's own default. */
  pdfWasmUrl?: string;
};

type ResolvedConfig = {
  fetcher: DocumentFetcher;
  resolveUrl: (url: string) => string | undefined;
  pdfWasmUrl?: string;
  t: (key: keyof DocumentPreviewMessages, values?: Record<string, string | number>) => string;
};

const defaultFetcher: DocumentFetcher = (url, init) => fetch(url, { credentials: "include", ...init });

const DocumentPreviewContext = createContext<DocumentPreviewConfig>({});

export function DocumentPreviewProvider({ children, ...config }: DocumentPreviewConfig & { children: ReactNode }) {
  const { locale, messages, fetcher, resolveUrl, pdfWasmUrl } = config;
  const value = useMemo(() => ({ locale, messages, fetcher, resolveUrl, pdfWasmUrl }), [locale, messages, fetcher, resolveUrl, pdfWasmUrl]);
  return <DocumentPreviewContext.Provider value={value}>{children}</DocumentPreviewContext.Provider>;
}

export function useDocumentPreviewConfig(): ResolvedConfig {
  const config = useContext(DocumentPreviewContext);
  return useMemo(() => {
    const messages = resolveMessages(config.locale, config.messages);
    return {
      fetcher: config.fetcher ?? defaultFetcher,
      resolveUrl: config.resolveUrl ?? ((url: string) => url),
      pdfWasmUrl: config.pdfWasmUrl,
      t: (key, values) => formatMessage(messages[key] ?? String(key), values),
    };
  }, [config]);
}
