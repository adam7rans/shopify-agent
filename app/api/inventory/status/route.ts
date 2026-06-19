import { NextResponse } from "next/server";
import { getShopifyClient } from "@/lib/shopify";

export async function GET() {
  const client = getShopifyClient();
  const { products } = await client.getProducts();
  const { inventory } = await client.getInventory();

  const searchTerms = ["hi-chew", "puccho", "kasugai muscat", "kitkat matcha", "pocky straw", "ramune", "bourbon elise", "malang"];

  const results = products
    .filter((p) => searchTerms.some((t) => p.title.toLowerCase().includes(t)))
    .map((product) => {
      const variant = product.variants[0];
      const level = inventory.find((l) => l.sku === variant?.sku);
      return {
        product: product.title,
        sku: variant?.sku,
        available: level?.available ?? null,
        onHand: level?.onHand ?? null,
      };
    });

  return NextResponse.json(results);
}
