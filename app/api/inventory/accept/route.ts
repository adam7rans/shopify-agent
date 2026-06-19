import { NextResponse } from "next/server";
import { getShopifyClient } from "@/lib/shopify";
import { getShopifyMode } from "@/lib/shopify/mode";
import { shopifyAdminGraphql } from "@/lib/shopify/graphql";

interface InventoryImpactRow {
  item: string;
  sku?: string;
  currentStock: number;
  incoming: number;
  projectedStock: number;
}

interface AcceptRequest {
  supplier: string;
  invoiceNumber: string;
  inventoryImpact: InventoryImpactRow[];
}

export async function POST(request: Request) {
  const body = (await request.json()) as AcceptRequest;
  const { supplier, invoiceNumber, inventoryImpact } = body;

  if (!supplier || !invoiceNumber || !inventoryImpact?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (getShopifyMode() === "live") {
    try {
      const client = getShopifyClient();
      const { products } = await client.getProducts();
      const { inventory } = await client.getInventory();

      let adjustedCount = 0;

      for (const impact of inventoryImpact) {
        let variant: { inventoryItemId?: string; sku: string } | undefined;
        let level: typeof inventory[number] | undefined;

        if (impact.sku) {
          level = inventory.find((l) => l.sku === impact.sku);
          const product = products.find((p) => p.variants.some((v) => v.sku === impact.sku));
          variant = product?.variants.find((v) => v.sku === impact.sku);
        } else {
          const itemLower = impact.item.toLowerCase();
          const keywords = itemLower.split(/[\s,()-]+/).filter((w) => w.length > 3);
          for (const product of products) {
            const titleLower = product.title.toLowerCase();
            const matched = keywords.filter((kw) => titleLower.includes(kw)).length >= 2;
            if (!matched) continue;
            variant = product.variants.find((v) => v.inventoryItemId);
            if (!variant) continue;
            level = inventory.find((l) => l.sku === variant!.sku);
            if (level) break;
          }
        }

        if (!variant?.inventoryItemId || !level) continue;

          const idempotencyKey = `kandwii-${invoiceNumber}-${variant.sku}-${Date.now()}`;

          const result = await shopifyAdminGraphql<{
            inventoryAdjustQuantities: {
              userErrors: Array<{ field: string[]; message: string }>;
              inventoryAdjustmentGroup: { reason: string } | null;
            };
          }>(
            `mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
              inventoryAdjustQuantities(input: $input) @idempotent(key: "${idempotencyKey}") {
                userErrors { field message }
                inventoryAdjustmentGroup { reason }
              }
            }`,
            {
              input: {
                reason: "correction",
                name: "available",
                changes: [
                  {
                    inventoryItemId: variant.inventoryItemId,
                    locationId: level.locationId,
                    delta: impact.incoming,
                    changeFromQuantity: level.available,
                  },
                ],
              },
            },
          );

          const errors = result.inventoryAdjustQuantities.userErrors;
          if (errors.length > 0) {
            console.error("[inventory/accept] userErrors:", JSON.stringify(errors));
          } else {
            adjustedCount++;
          }
      }

      return NextResponse.json({
        success: true,
        supplier,
        invoiceNumber,
        adjustedItems: adjustedCount,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Mock mode: simulate a brief delay and return success
  await new Promise((r) => setTimeout(r, 800));

  return NextResponse.json({
    success: true,
    supplier,
    invoiceNumber,
    adjustedItems: inventoryImpact.length,
  });
}
