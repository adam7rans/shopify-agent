import { liveShopifyClient } from "@/lib/shopify/liveShopifyClient";
import { mockShopifyClient } from "@/lib/shopify/mockShopifyClient";
import type { ShopifyClient } from "@/lib/shopify/types";

export function getShopifyClient(): ShopifyClient {
  return process.env.SHOPIFY_MODE === "live" ? liveShopifyClient : mockShopifyClient;
}
