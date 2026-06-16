import { fulfillmentRegions } from "@/lib/mock/regions";
import { productBlueprints } from "@/lib/mock/taxonomy";
import type { Product, ProductVariant } from "@/types/domain";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getStartingInventory(title: string, category: string, index: number) {
  const categoryProfiles: Record<
    string,
    { base: number; min: number; max: number; spread: number }
  > = {
    "Japanese gummies": { base: 192, min: 96, max: 288, spread: 30 },
    "Korean gummies": { base: 176, min: 82, max: 264, spread: 34 },
    "Sour candy": { base: 122, min: 38, max: 212, spread: 26 },
    "Ramune / soda candy": { base: 144, min: 72, max: 236, spread: 22 },
    "Chocolate biscuit sticks": { base: 206, min: 118, max: 314, spread: 28 },
    "Mochi candy": { base: 126, min: 54, max: 218, spread: 22 },
    "Matcha chocolate/snacks": { base: 158, min: 66, max: 246, spread: 24 },
    "Hard candy": { base: 168, min: 76, max: 258, spread: 22 },
    "Jelly candy": { base: 151, min: 68, max: 232, spread: 24 },
    "Character / kawaii candy": { base: 141, min: 52, max: 224, spread: 26 },
    "Variety boxes": { base: 108, min: 28, max: 174, spread: 20 },
    "Seasonal limited editions": { base: 84, min: 18, max: 152, spread: 24 },
  };

  const profile = categoryProfiles[category] ?? {
    base: 150,
    min: 60,
    max: 240,
    spread: 24,
  };
  const hash = hashString(`${category}:${title}:${index}`);
  const wave = ((hash % 7) - 3) * profile.spread;
  const jitter = (((hash >>> 3) % 17) - 8) * 4;
  const laneShift = ((index % 4) - 1.5) * 7;
  const scarcityPull = (hash & 1) === 0 ? 0 : -((hash >>> 9) % 20);
  const abundanceLift = (hash & 4) === 0 ? 0 : ((hash >>> 12) % 26);

  return clamp(
    Math.round(profile.base + wave + jitter + laneShift + scarcityPull + abundanceLift),
    profile.min,
    profile.max,
  );
}

export function generateProducts(): Product[] {
  return productBlueprints.map((blueprint, index) => {
    const price = getRetailPrice(blueprint.category, index);
    const cost = getCost(price, blueprint.category, index);
    const margin = Number((price - cost).toFixed(2));
    const startingInventory = getStartingInventory(
      blueprint.title,
      blueprint.category,
      index,
    );
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
