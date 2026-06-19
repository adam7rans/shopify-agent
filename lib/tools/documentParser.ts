import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { get_inventory_products, get_inventory_levels, summarizeInventory } from "@/lib/tools/inventoryOverview";

const DOCUMENTS_DIR = path.join(process.cwd(), "public", "mock-invoices");

const SUPPLIER_EMAILS: Record<string, string> = {
  "Sweet Distribution Co.": "accounts@sweetdistribution.com",
  "Pacific Snack Imports": "orders@pacificsnackimports.com",
  "K-Snacks Wholesale": "support@ksnacks-wholesale.com",
  "Tokyo Treats Direct": "claims@tokyotreatsdirect.jp",
};

function detectFlags(parsed: ParsedInvoice): { hasBackorder: boolean; hasDamage: boolean } {
  const hasBackorder = parsed.lineItems.some(
    (item) => item.backordered || (item.quantityShipped !== undefined && item.quantityShipped < item.quantity),
  );
  const hasDamage = parsed.lineItems.some(
    (item) => item.condition?.toLowerCase().includes("damaged") || item.condition?.toLowerCase().includes("crush"),
  ) || !!parsed.damageReport;
  return { hasBackorder, hasDamage };
}

function generateDraftEmail(
  parsed: ParsedInvoice,
  flag: "backorder" | "damage",
): { to: string; from: string; subject: string; body: string; emailType: "backorder_followup" | "damage_claim" } {
  const supplier = parsed.supplier;
  const to = SUPPLIER_EMAILS[supplier] ?? `info@${supplier.toLowerCase().replace(/[^a-z]+/g, "")}.com`;
  const from = "adam@kandwii.com";

  if (flag === "backorder") {
    const missingItems = parsed.lineItems
      .filter((item) => item.backordered || (item.quantityShipped !== undefined && item.quantityShipped < item.quantity))
      .map((item) => {
        const short = (item.quantity - (item.quantityShipped ?? item.quantity));
        return `  - ${item.description}: ordered ${item.quantity}, received ${item.quantityShipped ?? "unknown"} (${short} short)`;
      });

    const itemList = missingItems.length > 0
      ? missingItems.join("\n")
      : parsed.lineItems.map((item) => `  - ${item.description}`).join("\n");

    return {
      to,
      from,
      subject: `Re: Invoice ${parsed.invoiceNumber} — Partial Shipment Follow-up`,
      body: `Hi ${supplier.split(" ")[0]} team,\n\nWe received invoice ${parsed.invoiceNumber} on ${parsed.date}, but the shipment appears to be incomplete. The following items are short or backordered:\n\n${itemList}\n\nCould you provide an updated timeline for the remaining items? Please let us know if we should expect a separate shipment or if there are any supply issues we should be aware of.\n\nThanks,\nAdam\nKandwii Store`,
      emailType: "backorder_followup",
    };
  }

  const damagedItems = parsed.lineItems
    .filter((item) => item.condition?.toLowerCase().includes("damaged") || item.condition?.toLowerCase().includes("crush"))
    .map((item) => `  - ${item.description}: ${item.quantity} units — ${item.condition ?? "damaged"}`);

  const damageList = damagedItems.length > 0
    ? damagedItems.join("\n")
    : parsed.damageReport ?? "See attached photos for damage details.";

  return {
    to,
    from,
    subject: `Damage Claim — Delivery ${parsed.invoiceNumber}`,
    body: `Hi ${supplier.split(" ")[0]} team,\n\nWe received delivery ${parsed.invoiceNumber} on ${parsed.date} and found the following items damaged during transit:\n\n${damageList}\n\nWe'd like to file a damage claim for replacement or credit. Photos of the damaged goods are available upon request.\n\nPlease advise on next steps.\n\nThanks,\nAdam\nKandwii Store`,
    emailType: "damage_claim",
  };
}

export interface ProcessedDocument {
  supplier: string;
  invoiceNumber: string;
  total: number;
  status: "pending_review" | "flagged";
  lineItems: {
    description: string;
    quantity: number;
    quantityShipped?: number;
    unitPrice: number;
    lineTotal: number;
    condition?: string;
    backordered?: boolean;
  }[];
  inventoryImpact: {
    item: string;
    sku?: string;
    currentStock: number;
    incoming: number;
    projectedStock: number;
  }[];
  draftEmail?: {
    to: string;
    from: string;
    subject: string;
    body: string;
    emailType: "backorder_followup" | "damage_claim";
  };
  flagReason?: string;
}

export async function scanDocuments(
  onProgress?: (step: string, data?: Record<string, unknown>) => void,
): Promise<{ documents: ProcessedDocument[] }> {
  onProgress?.("Connecting to Gmail", { event: "gmail_connect" });
  await new Promise((r) => setTimeout(r, 1000));

  onProgress?.("Scanning supplier inbox for attachments", { event: "gmail_scan" });
  await new Promise((r) => setTimeout(r, 1500));

  let files: string[];
  try {
    const all = await readdir(DOCUMENTS_DIR);
    files = all.filter((f) => f.endsWith(".png") || f.endsWith(".pdf"));
  } catch {
    return { documents: [] };
  }

  onProgress?.(`Found ${files.length} documents attached to supplier emails`, {
    event: "scan_start",
    totalFiles: files.length,
    files: files.map((f) => ({
      filename: f,
      fileType: f.endsWith(".png") ? "image" : "pdf",
    })),
  });

  const results: ProcessedDocument[] = [];

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const fileType = filename.endsWith(".png") ? "image" : "pdf";

    onProgress?.(`Parsing ${filename} with AI vision`, {
      event: "parse_start",
      index: i,
      filename,
      fileType,
    });

    const { parsed, inventoryCrossReference } = await parseDocument(filename);

    const { hasBackorder, hasDamage } = detectFlags(parsed);
    const isFlagged = hasBackorder || hasDamage;

    const impact = inventoryCrossReference
      .filter((ref) => ref.status === "matched" || ref.status === "partial_match")
      .map((ref) => ({
        item: ref.matchedProduct ?? ref.invoiceItem,
        sku: ref.matchedSku ?? undefined,
        currentStock: ref.currentStock ?? 0,
        incoming: ref.incomingQuantity,
        projectedStock: ref.projectedStock ?? ref.incomingQuantity,
      }));

    const doc: ProcessedDocument = {
      supplier: parsed.supplier,
      invoiceNumber: parsed.invoiceNumber,
      total: parsed.totalDue,
      status: isFlagged ? "flagged" : "pending_review",
      lineItems: parsed.lineItems.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        quantityShipped: li.quantityShipped,
        unitPrice: li.unitPrice,
        lineTotal: li.lineTotal,
        condition: li.condition,
        backordered: li.backordered,
      })),
      inventoryImpact: impact,
    };

    if (hasBackorder) {
      doc.flagReason = "Partial shipment — backordered items detected";
      doc.draftEmail = generateDraftEmail(parsed, "backorder");
    } else if (hasDamage) {
      doc.flagReason = "Damaged items detected in shipment";
      doc.draftEmail = generateDraftEmail(parsed, "damage");
    }

    results.push(doc);

    onProgress?.(`Parsed ${parsed.supplier} — ${parsed.invoiceNumber}`, {
      event: "parse_complete",
      index: i,
      filename,
      fileType,
      document: doc as unknown as Record<string, unknown>,
    });
  }

  return { documents: results };
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
}> {
  const safeName = path.basename(filename);

  const filePath = path.join(DOCUMENTS_DIR, safeName);
  const fileBuffer = await readFile(filePath);
  const base64 = fileBuffer.toString("base64");
  const isPdf = safeName.endsWith(".pdf");

  const fileContent: OpenAI.Chat.Completions.ChatCompletionContentPart = isPdf
    ? {
        type: "file" as const,
        file: {
          filename: safeName,
          file_data: `data:application/pdf;base64,${base64}`,
        },
      } as unknown as OpenAI.Chat.Completions.ChatCompletionContentPart
    : {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${base64}`,
          detail: "high" as const,
        },
      };

  const openai = new OpenAI();
  const visionResponse = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: EXTRACTION_PROMPT },
          fileContent,
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

  return {
    filename: safeName,
    parsed,
    inventoryCrossReference: crossRef,
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
