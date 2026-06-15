export type ShopifyMode = "mock" | "live";

export function getRawShopifyMode() {
  return process.env.SHOPIFY_MODE ?? null;
}

function normalizeShopifyMode(rawMode: string | null) {
  return rawMode?.trim().toLowerCase() ?? "";
}

export function getShopifyMode(): ShopifyMode {
  return normalizeShopifyMode(getRawShopifyMode()) === "live" ? "live" : "mock";
}

export function isLiveShopifyConfigured() {
  return Boolean(
    process.env.SHOPIFY_SHOP_DOMAIN &&
      process.env.SHOPIFY_API_VERSION &&
      ((process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET) ||
        process.env.SHOPIFY_ADMIN_ACCESS_TOKEN),
  );
}

export function getShopifyModeBadge() {
  return getShopifyMode() === "live" ? "Live Shopify" : "Mock Shopify";
}

export function getHybridOpsBadge() {
  return getShopifyMode() === "live" ? "Live Shopify + Mock ops" : "Mock ops data";
}
