import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.join(process.cwd(), "data", "sample-documents");

mkdirSync(OUTPUT_DIR, { recursive: true });

function generateInvoice(filename: string, options: {
  supplierName: string;
  invoiceNumber: string;
  date: string;
  items: { sku: string; product: string; qty: number; unitCost: number }[];
  notes?: string;
}) {
  return new Promise<void>((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = createWriteStream(path.join(OUTPUT_DIR, filename));
    doc.pipe(stream);

    doc.fontSize(20).text(options.supplierName, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).text("SUPPLIER INVOICE", { align: "center" });
    doc.moveDown(1);

    doc.fontSize(10);
    doc.text(`Invoice Number: ${options.invoiceNumber}`);
    doc.text(`Date: ${options.date}`);
    doc.text(`Ship To: Kandwii LLC, Rotterdam, Netherlands`);
    doc.text(`Payment Terms: Net 30`);
    doc.moveDown(1);

    doc.fontSize(9).font("Helvetica-Bold");
    const tableTop = doc.y;
    doc.text("SKU", 50, tableTop, { width: 130 });
    doc.text("Product", 180, tableTop, { width: 180 });
    doc.text("Qty", 360, tableTop, { width: 50, align: "right" });
    doc.text("Unit Cost", 410, tableTop, { width: 70, align: "right" });
    doc.text("Total", 480, tableTop, { width: 70, align: "right" });

    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown(0.5);

    doc.font("Helvetica");
    let grandTotal = 0;
    for (const item of options.items) {
      const total = item.qty * item.unitCost;
      grandTotal += total;
      const y = doc.y;
      doc.text(item.sku, 50, y, { width: 130 });
      doc.text(item.product, 180, y, { width: 180 });
      doc.text(String(item.qty), 360, y, { width: 50, align: "right" });
      doc.text(`$${item.unitCost.toFixed(2)}`, 410, y, { width: 70, align: "right" });
      doc.text(`$${total.toFixed(2)}`, 480, y, { width: 70, align: "right" });
      doc.moveDown(0.8);
    }

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold");
    doc.text(`Grand Total: $${grandTotal.toFixed(2)}`, 50, doc.y, { align: "right", width: 500 });

    if (options.notes) {
      doc.moveDown(2);
      doc.font("Helvetica").fontSize(9);
      doc.text(`Notes: ${options.notes}`);
    }

    doc.end();
    stream.on("finish", resolve);
  });
}

async function main() {
  await generateInvoice("tokyo-treats-invoice-2024.pdf", {
    supplierName: "Tokyo Treats Distribution Co.",
    invoiceNumber: "TT-INV-2024-0847",
    date: "2026-06-01",
    items: [
      { sku: "JP-HICHEW-APPLE-001", product: "Hi-Chew Green Apple Fruit Chews", qty: 120, unitCost: 2.18 },
      { sku: "JP-HICHEW-STRAW-002", product: "Hi-Chew Strawberry Fruit Chews", qty: 144, unitCost: 2.18 },
      { sku: "JP-KASUGAI-PEACH-003", product: "Kasugai Peach Gummy", qty: 96, unitCost: 2.45 },
      { sku: "JP-KASUGAI-MUSCAT-004", product: "Kasugai Muscat Gummy", qty: 96, unitCost: 2.45 },
      { sku: "JP-KORORO-GRAPE-005", product: "UHA Kororo Grape Jelly Bites", qty: 72, unitCost: 2.62 },
      { sku: "JP-KORORO-PEACH-006", product: "UHA Kororo Peach Jelly Bites", qty: 72, unitCost: 2.62 },
      { sku: "JP-NOBEL-LEMON-009", product: "Nobel Super Lemon Hard Candy", qty: 48, unitCost: 1.95 },
      { sku: "JP-KITKAT-MATCHA-023", product: "KitKat Matcha Wafer Bars", qty: 240, unitCost: 3.85 },
    ],
    notes: "Shipping via ocean freight, ETA Rotterdam 2026-06-18. Customs clearance handled by FreightLink EU. Contact: sales@tokyotreats.jp",
  });

  await generateInvoice("korea-snacks-po-0042.pdf", {
    supplierName: "Seoul Snacks International",
    invoiceNumber: "SS-PO-2024-0042",
    date: "2026-05-28",
    items: [
      { sku: "KR-SOUR-PEACH-043", product: "Korean Sour Peach Belts", qty: 200, unitCost: 1.85 },
      { sku: "KR-SOUR-WATERMELON-044", product: "Korean Sour Watermelon Strips", qty: 150, unitCost: 1.85 },
      { sku: "KR-MALANG-STRAW-034", product: "Lotte Malang Cow Strawberry Chews", qty: 180, unitCost: 2.10 },
      { sku: "KR-MYCHEW-GRAPE-036", product: "Crown MyChew Grape Fruit Chews", qty: 120, unitCost: 1.92 },
      { sku: "KR-PEPERO-ALMOND-031", product: "Lotte Pepero Almond Biscuit Sticks", qty: 360, unitCost: 2.35 },
      { sku: "KR-BINCH-039", product: "Lotte Binch Cocoa Biscuits", qty: 144, unitCost: 2.48 },
    ],
    notes: "Partial shipment — remaining 50 cases of KR-SOUR-PEACH-043 backordered until 2026-06-25. Contact: orders@seoulsnacks.kr",
  });

  await generateInvoice("seasonal-restock-q3.pdf", {
    supplierName: "Asia Candy Wholesale Group",
    invoiceNumber: "ACW-Q3-2024-115",
    date: "2026-06-10",
    items: [
      { sku: "JP-SAKURA-KITKAT-030", product: "Limited Edition Sakura KitKat Box", qty: 48, unitCost: 5.20 },
      { sku: "MIX-SEASONAL-WINTER-050", product: "Winter Strawberry Chocolate Box", qty: 36, unitCost: 4.80 },
      { sku: "JP-MELTYKISS-MAT-017", product: "Meiji Meltykiss Matcha Truffles", qty: 60, unitCost: 3.95 },
      { sku: "JP-VARIETY-BOX-049", product: "Japanese Variety Treat Box", qty: 24, unitCost: 8.50 },
      { sku: "KR-VARIETY-BOX-048", product: "Korea Variety Snack Box", qty: 24, unitCost: 7.90 },
    ],
    notes: "Seasonal restock for Q3 2026. Priority handling requested for Sakura KitKat — limited seasonal run. Contact: wholesale@asiacandy.com",
  });

  console.log(`Generated 3 sample documents in ${OUTPUT_DIR}`);
}

main().catch(console.error);
