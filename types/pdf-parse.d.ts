declare module "pdf-parse" {
  interface PdfParsePage {
    text: string;
  }

  interface PdfParseTextResult {
    pages: PdfParsePage[];
  }

  class PDFParse {
    constructor(data: Uint8Array);
    load(): Promise<void>;
    getText(): Promise<PdfParseTextResult>;
  }

  export { PDFParse };
}
