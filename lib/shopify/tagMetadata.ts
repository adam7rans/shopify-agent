import type { FulfillmentRegion, Product } from "@/types/domain";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const regionByTag = new Map<string, FulfillmentRegion>([
  ["europe", "Europe"],
  ["middle-east", "Middle East"],
  ["united-states", "United States"],
  ["china-asia", "China / Asia"],
]);

export function buildShopifySeedTags(product: Product) {
  const tags = new Set<string>(["kandwii-seed", "asian-candy", "real-world-inspired"]);

  for (const tag of product.tags) {
    tags.add(tag);
  }

  tags.add(`origin:${slugify(product.countryOfOrigin)}`);
  tags.add(`distributor:${slugify(product.distributor)}`);
  tags.add(`region:${slugify(product.fulfillmentRegion)}`);

  for (const flavor of product.flavorProfile) {
    tags.add(`flavor:${slugify(flavor)}`);
  }

  return Array.from(tags);
}

export function parseShopifySeedTags(tags: string[]) {
  const prefixValues = new Map<string, string[]>();
  const plainTags: string[] = [];

  for (const tag of tags) {
    const separatorIndex = tag.indexOf(":");
    if (separatorIndex <= 0) {
      plainTags.push(tag);
      continue;
    }

    const prefix = tag.slice(0, separatorIndex);
    const value = tag.slice(separatorIndex + 1);
    prefixValues.set(prefix, [...(prefixValues.get(prefix) ?? []), value]);
  }

  const regionTag = prefixValues.get("region")?.[0];
  const distributorTag = prefixValues.get("distributor")?.[0];
  const originTag = prefixValues.get("origin")?.[0];
  const flavorTags = prefixValues.get("flavor") ?? [];

  return {
    countryOfOrigin: originTag ? originTag.replace(/-/g, " ") : undefined,
    distributor: distributorTag ? distributorTag.replace(/-/g, " ") : undefined,
    fulfillmentRegion: regionTag ? regionByTag.get(regionTag) : undefined,
    flavorProfile: flavorTags.map((value) => value.replace(/-/g, " ")),
    plainTags,
  };
}
