import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { get_inventory_products, get_inventory_levels, summarizeInventory } from "@/lib/tools/inventoryOverview";

const DOCUMENTS_DIR = path.join(process.cwd(), "public", "mock-invoices");

interface DocumentMeta {
  filename: string;
  supplier: string;
  documentType: "invoice" | "delivery_receipt";
  invoiceNumber: string;
  dateReceived: string;
  totalAmount: number;
  status: "pending_review" | "reviewed" | "flagged";
  hasImage: boolean;
  notes?: string;
}

const DOCUMENT_METADATA: DocumentMeta[] = [
  {
    filename: "invoice-1-sweet-distribution.png",
    supplier: "Sweet Distribution Co.",
    documentType: "invoice",
    invoiceNumber: "SD-2024-0847",
    dateReceived: "2026-06-12",
    totalAmount: 692.50,
    status: "pending_review",
    hasImage: true,
  },
  {
    filename: "invoice-2-pacific-snack.png",
    supplier: "Pacific Snack Imports",
    documentType: "invoice",
    invoiceNumber: "PSI-9031",
    dateReceived: "2026-06-15",
    totalAmount: 1049.00,
    status: "pending_review",
    hasImage: true,
  },
  {
    filename: "invoice-3-k-snacks-partial.png",
    supplier: "K-Snacks Wholesale",
    documentType: "invoice",
    invoiceNumber: "KSW-4420",
    dateReceived: "2026-06-16",
    totalAmount: 582.00,
    status: "flagged",
    hasImage: true,
    notes: "Partial shipment — backordered items pending",
  },
  {
    filename: "invoice-4-tokyo-treats-packing-slip.png",
    supplier: "Tokyo Treats Direct",
    documentType: "delivery_receipt",
    invoiceNumber: "TTD-0612",
    dateReceived: "2026-06-17",
    totalAmount: 0,
    status: "flagged",
    hasImage: true,
    notes: "Delivery receipt with damage report — 2 cases Kanro Pure Gummy crushed",
  },
];

export async function listAvailableDocuments() {
  try {
    const files = await readdir(DOCUMENTS_DIR);
    const imageFiles = files.filter((f) => f.endsWith(".png"));

    return imageFiles.map((filename) => {
      const meta = DOCUMENT_METADATA.find((m) => m.filename === filename);
      if (meta) return meta;
      return {
        filename,
        supplier: "Unknown",
        documentType: "invoice" as const,
        invoiceNumber: "—",
        dateReceived: "—",
        totalAmount: 0,
        status: "pending_review" as const,
        hasImage: true,
      };
    });
  } catch {
    return [];
  }
}

interface ParsedLineItem {
  itemCode: string;
  description: string;
  quantity: number;
  quantityShipped?: number;
  unitPrice: number;
  lineTotal: number;
  condition?: string;
  backordered?: boolean;
}

interface ParsedInvoice {
  supplier: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  paymentTerms?: string;
  poReference?: string;
  documentType: string;
  billTo: string;
  shipTo: string;
  lineItems: ParsedLineItem[];
  subtotal: number;
  freight: number;
  tax: number;
  totalDue: number;
  notes?: string;
  damageReport?: string;
  shipmentNotes?: string;
}

interface InventoryCrossRef {
  invoiceItem: string;
  matchedProduct: string | null;
  matchedSku: string | null;
  currentStock: number | null;
  incomingQuantity: number;
  projectedStock: number | null;
  status: "matched" | "partial_match" | "no_match";
}

const EXTRACTION_PROMPT = `You are a document parser for an Asian candy ecommerce business. Extract structured data from this supplier invoice or delivery receipt image.

Return a JSON object with these fields:
{
  "supplier": "company name",
  "invoiceNumber": "invoice/receipt number",
  "date": "document date",
  "dueDate": "payment due date if shown",
  "paymentTerms": "e.g. Net 30",
  "poReference": "PO number if shown",
  "documentType": "invoice or delivery_receipt",
  "billTo": "billing address (one line)",
  "shipTo": "shipping address (one line)",
  "lineItems": [
    {
      "itemCode": "supplier SKU/item code",
      "description": "product description",
      "quantity": 100,
      "quantityShipped": 80,
      "unitPrice": 1.25,
      "lineTotal": 100.00,
      "condition": "OK or DAMAGED if noted",
      "backordered": false
    }
  ],
  "subtotal": 500.00,
  "freight": 45.00,
  "tax": 0.00,
  "totalDue": 545.00,
  "notes": "any general notes",
  "damageReport": "damage details if any",
  "shipmentNotes": "backorder or partial shipment notes if any"
}

For delivery receipts that show cases/units instead of prices, set unitPrice to 0 and lineTotal to 0, and use total units as quantity.
If quantityShipped differs from quantity ordered, include both. If they're the same, omit quantityShipped.
Return ONLY the JSON object, no markdown fences.`;

export async function parseDocument(filename: string): Promise<{
  filename: string;
  parsed: ParsedInvoice;
  inventoryCrossReference: InventoryCrossRef[];
  meta: DocumentMeta | null;
}> {
  const safeName = path.basename(filename);

  const pngName = safeName.replace(/\.pdf$/, ".png");
  const imagePath = path.join(DOCUMENTS_DIR, pngName);
  const imageBuffer = await readFile(imagePath);
  const base64Image = imageBuffer.toString("base64");

  const openai = new OpenAI();
  const visionResponse = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: EXTRACTION_PROMPT },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${base64Image}`,
              detail: "high",
            },
          },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 2000,
  });

  const rawText = visionResponse.choices[0]?.message?.content ?? "{}";
  const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed: ParsedInvoice = JSON.parse(cleaned);

  const crossRef = await crossReferenceInventory(parsed.lineItems);

  const meta = DOCUMENT_METADATA.find(
    (m) => m.filename === pngName || m.filename === safeName,
  ) ?? null;

  return {
    filename: safeName,
    parsed,
    inventoryCrossReference: crossRef,
    meta,
  };
}

async function crossReferenceInventory(
  lineItems: ParsedLineItem[],
): Promise<InventoryCrossRef[]> {
  const productsResponse = await get_inventory_products();
  const inventoryResponse = await get_inventory_levels();
  const inventoryRows = summarizeInventory(
    inventoryResponse.inventory,
    productsResponse.products,
    { focus: "all_inventory" },
  );

  return lineItems.map((item) => {
    const desc = item.description.toLowerCase();

    const exactMatch = inventoryRows.find((row) => {
      const productLower = row.product.toLowerCase();
      return productLower.includes(desc) || desc.includes(productLower);
    });

    if (exactMatch) {
      const incoming = item.quantityShipped ?? item.quantity;
      return {
        invoiceItem: item.description,
        matchedProduct: exactMatch.product,
        matchedSku: exactMatch.sku,
        currentStock: exactMatch.availableInventory,
        incomingQuantity: incoming,
        projectedStock: exactMatch.availableInventory + incoming,
        status: "matched" as const,
      };
    }

    const keywords = desc.split(/[\s,()-]+/).filter((w) => w.length > 3);
    const partialMatch = inventoryRows.find((row) => {
      const productLower = row.product.toLowerCase();
      return keywords.filter((kw) => productLower.includes(kw)).length >= 2;
    });

    if (partialMatch) {
      const incoming = item.quantityShipped ?? item.quantity;
      return {
        invoiceItem: item.description,
        matchedProduct: partialMatch.product,
        matchedSku: partialMatch.sku,
        currentStock: partialMatch.availableInventory,
        incomingQuantity: incoming,
        projectedStock: partialMatch.availableInventory + incoming,
        status: "partial_match" as const,
      };
    }

    return {
      invoiceItem: item.description,
      matchedProduct: null,
      matchedSku: null,
      currentStock: null,
      incomingQuantity: item.quantityShipped ?? item.quantity,
      projectedStock: null,
      status: "no_match" as const,
    };
  });
}
