import JSZip from "jszip";

const SPREADSHEET_NAMESPACE = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

// ExcelJS matches literal element names and cannot read OpenXML's valid x: prefixes.
// Normalize only the preview copy; keep formulas, styles and the stored file intact.
export async function prepareSpreadsheetPreview(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const archive = await JSZip.loadAsync(buffer);
  let changed = false;
  for (const entry of Object.values(archive.files)) {
    if (entry.dir || !entry.name.startsWith("xl/") || !entry.name.endsWith(".xml")) continue;
    const xml = await entry.async("string");
    const document = new DOMParser().parseFromString(xml, "application/xml");
    if (document.querySelector("parsererror")) throw new Error("Invalid spreadsheet XML");
    const elements = Array.from(document.getElementsByTagNameNS(SPREADSHEET_NAMESPACE, "*"));
    if (!elements.some((element) => element.prefix)) continue;
    // Descendants first so replacing a parent retains its already-normalized children.
    for (const element of elements.reverse()) {
      const replacement = document.createElementNS(SPREADSHEET_NAMESPACE, element.localName);
      for (const attribute of Array.from(element.attributes)) {
        replacement.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
      }
      replacement.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", SPREADSHEET_NAMESPACE);
      while (element.firstChild) replacement.appendChild(element.firstChild);
      element.parentNode?.replaceChild(replacement, element);
    }
    archive.file(entry.name, new XMLSerializer().serializeToString(document));
    changed = true;
  }
  return changed ? archive.generateAsync({ type: "arraybuffer" }) : buffer;
}
