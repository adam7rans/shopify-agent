import { NextResponse } from "next/server";
import { getShopifyClient } from "@/lib/shopify";
import { shopifyAdminGraphql } from "@/lib/shopify/graphql";

interface ResetEntry {
  sku: string;
  targetAvailable: number;
}

export async function POST(request: Request) {
  const { resets } = (await request.json()) as { resets: ResetEntry[] };

  const client = getShopifyClient();
  const { products } = await client.getProducts();
  const { inventory } = await client.getInventory();

  const results: Array<{ sku: string; product: string; from: number; to: number; success: boolean; error?: string }> = [];

  for (const entry of resets) {
    const level = inventory.find((l) => l.sku === entry.sku);
    if (!level) {
      results.push({ sku: entry.sku, product: "not found", from: 0, to: entry.targetAvailable, success: false, error: "SKU not found" });
      continue;
    }

    const product = products.find((p) => p.variants.some((v) => v.sku === entry.sku));
    const variant = product?.variants.find((v) => v.sku === entry.sku);
    if (!variant?.inventoryItemId) {
      results.push({ sku: entry.sku, product: product?.title ?? "unknown", from: level.available, to: entry.targetAvailable, success: false, error: "No inventoryItemId" });
      continue;
    }

    const delta = entry.targetAvailable - level.available;
    if (delta === 0) {
      results.push({ sku: entry.sku, product: product?.title ?? "", from: level.available, to: entry.targetAvailable, success: true });
      continue;
    }

    try {
      const result = await shopifyAdminGraphql<{
        inventoryAdjustQuantities: {
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(
        `mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
          inventoryAdjustQuantities(input: $input) {
            userErrors { field message }
          }
        }`,
        {
          input: {
            reason: "correction",
            name: "available",
            changes: [{
              inventoryItemId: variant.inventoryItemId,
              locationId: level.locationId,
              delta,
            }],
          },
        },
      );

      const errors = result.inventoryAdjustQuantities.userErrors;
      results.push({
        sku: entry.sku,
        product: product?.title ?? "",
        from: level.available,
        to: entry.targetAvailable,
        success: errors.length === 0,
        error: errors.length > 0 ? errors[0].message : undefined,
      });
    } catch (err) {
      results.push({
        sku: entry.sku,
        product: product?.title ?? "",
        from: level.available,
        to: entry.targetAvailable,
        success: false,
        error: err instanceof Error ? err.message : "Unknown",
      });
    }
  }

  return NextResponse.json(results);
}
