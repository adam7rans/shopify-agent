export type ShopifyMode = "mock" | "live";

export function getShopifyMode(): ShopifyMode {
  return process.env.SHOPIFY_MODE === "live" ? "live" : "mock";
}

export function getShopifyModeBadge() {
  return getShopifyMode() === "live" ? "Live Shopify" : "Mock Shopify";
}

export function getHybridOpsBadge() {
  return getShopifyMode() === "live" ? "Live Shopify + Mock ops" : "Mock ops data";
}
