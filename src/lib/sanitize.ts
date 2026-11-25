const ACTIVE_CONTENT_TAGS = "script,iframe,object,embed,frame,frameset,base,meta,link,form,noscript,template";
const URL_ATTRIBUTES = new Set(["href", "src", "xlink:href", "action", "formaction"]);
const DANGEROUS_URL_RE = /^(?:javascript|vbscript):|^data:\s*(?:text\/html|image\/svg\+xml)/i;

/**
 * Removes anything executable from layout HTML produced by a document renderer (e.g. slide
 * thumbnails, Markdown or sandboxed HTML previews): script-like elements, `on*` handlers and
 * javascript:/vbscript:/data:text/html URLs. Tags and styles are kept for fidelity.
 * Returns "" outside the browser.
 */
export function stripActiveContent(html: string | null | undefined): string {
  const raw = html ?? "";
  if (!raw || typeof window === "undefined" || typeof DOMParser === "undefined") return "";

  const doc = new DOMParser().parseFromString(`<body>${raw}</body>`, "text/html");
  doc.body.querySelectorAll(ACTIVE_CONTENT_TAGS).forEach((el) => el.remove());
  doc.body.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (name.startsWith("on") || (URL_ATTRIBUTES.has(name) && DANGEROUS_URL_RE.test(value))) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return doc.body.innerHTML;
}
