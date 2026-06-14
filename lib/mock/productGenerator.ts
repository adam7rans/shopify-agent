import { fulfillmentRegions } from "@/lib/mock/regions";
import { productBlueprints } from "@/lib/mock/taxonomy";
import type { Product, ProductVariant } from "@/types/domain";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateProducts(): Product[] {
  return productBlueprints.map((blueprint, index) => {
    const price = Number((4.49 + (index % 6) * 0.9 + index * 0.07).toFixed(2));
    const cost = Number((price * (0.36 + (index % 4) * 0.04)).toFixed(2));
    const margin = Number((price - cost).toFixed(2));
    const inventoryQuantity = 140 + (index % 5) * 38 + index * 7;
    const productId = `product-${String(index + 1).padStart(3, "0")}`;
    const variantId = `variant-${String(index + 1).padStart(3, "0")}`;
    const fulfillmentRegion = fulfillmentRegions[index % fulfillmentRegions.length];
    const variant: ProductVariant = {
      id: variantId,
      productId,
      title: "Standard pack",
      sku: blueprint.sku,
      price,
      cost,
      margin,
      inventoryQuantity,
      fulfillmentRegion,
    };

    return {
      id: productId,
      title: blueprint.title,
      handle: slugify(blueprint.title),
      description: `${blueprint.title} is a Kandwii catalog item built for mock-first Shopify testing.`,
      category: blueprint.category,
      countryOfOrigin: blueprint.origin,
      vendor: blueprint.vendor,
      distributor: blueprint.distributor,
      flavorProfile: [...blueprint.flavors],
      tags: [...blueprint.tags],
      price,
      cost,
      margin,
      inventoryQuantity,
      fulfillmentRegion,
      variants: [variant],
      createdAt: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
      salesHistoryDays: 180,
    };
  });
}
