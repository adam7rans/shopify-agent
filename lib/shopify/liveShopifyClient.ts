import type {
  InventoryFilters,
  OrderFilters,
  ProductFilters,
  ShopifyClient,
  ShopifyInventoryResponse,
  ShopifyOrdersResponse,
  ShopifyProductsResponse,
} from "@/lib/shopify/types";

const REQUIRED_ENV_VARS = [
  "SHOPIFY_SHOP_DOMAIN",
  "SHOPIFY_ADMIN_ACCESS_TOKEN",
  "SHOPIFY_API_VERSION",
] as const;

function validateLiveEnv() {
  const missing = REQUIRED_ENV_VARS.filter((envVar) => !process.env[envVar]);
  if (missing.length > 0) {
    throw new Error(
      `Missing Shopify live mode environment variables: ${missing.join(", ")}`,
    );
  }
}

function notImplemented(): never {
  throw new Error("Live Shopify client is not implemented in this checkpoint.");
}

class LiveShopifyClient implements ShopifyClient {
  async getProducts(_filters?: ProductFilters): Promise<ShopifyProductsResponse> {
    validateLiveEnv();
    notImplemented();
  }

  async getInventory(_filters?: InventoryFilters): Promise<ShopifyInventoryResponse> {
    validateLiveEnv();
    notImplemented();
  }

  async getRecentOrders(_filters?: OrderFilters): Promise<ShopifyOrdersResponse> {
    validateLiveEnv();
    notImplemented();
  }
}

export const liveShopifyClient = new LiveShopifyClient();
export { validateLiveEnv };
