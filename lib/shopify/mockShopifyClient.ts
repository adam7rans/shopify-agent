import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  InventoryFilters,
  OrderFilters,
  ProductFilters,
  ShopifyClient,
  ShopifyInventoryResponse,
  ShopifyOrdersResponse,
  ShopifyProductsResponse,
} from "@/lib/shopify/types";
import type { InventoryLevel, Order, Product } from "@/types/domain";

async function readGeneratedFile<T>(fileName: string): Promise<T> {
  const filePath = path.join(process.cwd(), "data", "generated", fileName);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function applyLimit<T>(items: T[], limit?: number) {
  return typeof limit === "number" ? items.slice(0, limit) : items;
}

class MockShopifyClient implements ShopifyClient {
  async getProducts(filters: ProductFilters = {}): Promise<ShopifyProductsResponse> {
    const products = await readGeneratedFile<Product[]>("products.json");
    const filtered = products.filter((product) => {
      if (filters.sku && !product.variants.some((variant) => variant.sku === filters.sku)) {
        return false;
      }
      if (filters.tag && !product.tags.includes(filters.tag)) {
        return false;
      }
      if (filters.category && product.category !== filters.category) {
        return false;
      }
      return true;
    });

    return { products: applyLimit(filtered, filters.limit) };
  }

  async getInventory(filters: InventoryFilters = {}): Promise<ShopifyInventoryResponse> {
    const inventory = await readGeneratedFile<InventoryLevel[]>("inventory.json");
    const filtered = inventory.filter((record) => {
      if (filters.sku && record.sku !== filters.sku) {
        return false;
      }
      if (filters.region && record.region !== filters.region) {
        return false;
      }
      if (filters.locationName && record.locationName !== filters.locationName) {
        return false;
      }
      return true;
    });

    return { inventory: applyLimit(filtered, filters.limit) };
  }

  async getRecentOrders(filters: OrderFilters = {}): Promise<ShopifyOrdersResponse> {
    const orders = await readGeneratedFile<Order[]>("orders.json");
    const filtered = orders
      .filter((order) => {
        if (filters.startDate && order.createdAt < filters.startDate) {
          return false;
        }
        if (filters.endDate && order.createdAt > filters.endDate) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { orders: applyLimit(filtered, filters.limit) };
  }
}

export const mockShopifyClient = new MockShopifyClient();
