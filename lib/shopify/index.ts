import { liveShopifyClient } from "@/lib/shopify/liveShopifyClient";
import { mockShopifyClient } from "@/lib/shopify/mockShopifyClient";
import {
  getHybridOpsBadge,
  getRawShopifyMode,
  getShopifyMode,
  getShopifyModeBadge,
  isLiveShopifyConfigured,
} from "@/lib/shopify/mode";
import type { ShopifyClient } from "@/lib/shopify/types";

export function getShopifyClient(): ShopifyClient {
  return getShopifyMode() === "live" ? liveShopifyClient : mockShopifyClient;
}

export {
  getHybridOpsBadge,
  getRawShopifyMode,
  getShopifyMode,
  getShopifyModeBadge,
  isLiveShopifyConfigured,
};
