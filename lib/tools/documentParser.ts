import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const DOCUMENTS_DIR = path.join(process.cwd(), "data", "sample-documents");

export async function listAvailableDocuments() {
  try {
    const files = await readdir(DOCUMENTS_DIR);
    return files.filter((f) => f.endsWith(".pdf"));
  } catch {
    return [];
  }
}

export async function parseDocument(filename: string) {
  const safeName = path.basename(filename);
  const filePath = path.join(DOCUMENTS_DIR, safeName);

  const buffer = await readFile(filePath);
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse(new Uint8Array(buffer));
  await parser.load();
  const result = await parser.getText();
  const text = result.pages.map((pg: { text: string }) => pg.text).join("\n");

  return {
    filename: safeName,
    pages: result.pages.length,
    text,
  };
}
