import type { InventoryLevel, Order, Product } from "@/types/domain";

export interface ProductFilters {
  sku?: string;
  tag?: string;
  category?: string;
  limit?: number;
}

export interface InventoryFilters {
  sku?: string;
  region?: string;
  locationName?: string;
  limit?: number;
}

export interface OrderFilters {
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface ShopifyProductsResponse {
  products: Product[];
}

export interface ShopifyInventoryResponse {
  inventory: InventoryLevel[];
}

export interface ShopifyOrdersResponse {
  orders: Order[];
}

export interface ShopifyClient {
  getProducts(filters?: ProductFilters): Promise<ShopifyProductsResponse>;
  getInventory(filters?: InventoryFilters): Promise<ShopifyInventoryResponse>;
  getRecentOrders(filters?: OrderFilters): Promise<ShopifyOrdersResponse>;
}
