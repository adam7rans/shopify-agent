import { fulfillmentRegions } from "@/lib/mock/regions";
import { productBlueprints } from "@/lib/mock/taxonomy";
import type { Product, ProductVariant } from "@/types/domain";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getRetailPrice(category: string, index: number) {
  const categoryBasePrice: Record<string, number> = {
    "Japanese gummies": 4.89,
    "Korean gummies": 4.59,
    "Sour candy": 3.99,
    "Ramune / soda candy": 3.79,
    "Chocolate biscuit sticks": 5.29,
    "Mochi candy": 4.69,
    "Matcha chocolate/snacks": 5.79,
    "Hard candy": 3.49,
    "Jelly candy": 4.39,
    "Character / kawaii candy": 5.49,
    "Variety boxes": 18.99,
    "Seasonal limited editions": 12.49,
  };

  return Number(((categoryBasePrice[category] ?? 4.99) + (index % 3) * 0.35).toFixed(2));
}

function getCost(price: number, category: string, index: number) {
  const categoryMultiplier: Record<string, number> = {
    "Japanese gummies": 0.46,
    "Korean gummies": 0.44,
    "Sour candy": 0.42,
    "Ramune / soda candy": 0.4,
    "Chocolate biscuit sticks": 0.48,
    "Mochi candy": 0.45,
    "Matcha chocolate/snacks": 0.49,
    "Hard candy": 0.38,
    "Jelly candy": 0.43,
    "Character / kawaii candy": 0.47,
    "Variety boxes": 0.58,
    "Seasonal limited editions": 0.52,
  };

  const multiplier = (categoryMultiplier[category] ?? 0.45) + (index % 2) * 0.01;
  return Number((price * multiplier).toFixed(2));
}

function getStartingInventory(category: string, index: number) {
  const categoryBaseInventory: Record<string, number> = {
    "Japanese gummies": 180,
    "Korean gummies": 170,
    "Sour candy": 84,
    "Ramune / soda candy": 130,
    "Chocolate biscuit sticks": 210,
    "Mochi candy": 120,
    "Matcha chocolate/snacks": 145,
    "Hard candy": 160,
    "Jelly candy": 135,
    "Character / kawaii candy": 110,
    "Variety boxes": 60,
    "Seasonal limited editions": 48,
  };

  return categoryBaseInventory[category] + (index % 5) * 18;
}

export function generateProducts(): Product[] {
  return productBlueprints.map((blueprint, index) => {
    const price = getRetailPrice(blueprint.category, index);
    const cost = getCost(price, blueprint.category, index);
    const margin = Number((price - cost).toFixed(2));
    const startingInventory = getStartingInventory(blueprint.category, index);
    const inventoryQuantity = startingInventory;
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
      brand: blueprint.brand,
      productDescription: blueprint.productDescription,
      description: blueprint.productDescription,
      category: blueprint.category,
      countryOfOrigin: blueprint.origin,
      vendor: blueprint.vendor,
      distributor: blueprint.distributor,
      flavorProfile: [...blueprint.flavors],
      tags: [...blueprint.tags],
      price,
      cost,
      margin,
      startingInventory,
      inventoryQuantity,
      fulfillmentRegion,
      isRealWorldInspired: true,
      sourceNote: blueprint.referenceNote,
      referenceNote: blueprint.referenceNote,
      variants: [variant],
      createdAt: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
      salesHistoryDays: 180,
    };
  });
}
