import { calculateTopSellersFromOrders } from "@/lib/analytics/topSellers";
import { getShopifyClient } from "@/lib/shopify";
import { getShopifyMode } from "@/lib/shopify/mode";
import { mockShopifyClient } from "@/lib/shopify/mockShopifyClient";
import type { OrderFilters, ProductFilters } from "@/lib/shopify/types";
import type { AgentToolTraceEntry } from "@/types/agentUi";
import type { Order, Product } from "@/types/domain";

export type ToolTraceEntry = AgentToolTraceEntry;

export interface ResolvedRecentOrders {
  orders: Order[];
  source: "live" | "mock" | "mock-fallback";
  fallbackReason?: string;
}

export async function get_recent_orders(filters: OrderFilters = {}) {
  return getShopifyClient().getRecentOrders(filters);
}

export function isProtectedOrderAccessError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("ACCESS_DENIED") &&
    error.message.includes("Order object")
  );
}

const SPARSE_DATA_THRESHOLD = 30;

export async function get_recent_orders_with_fallback(
  filters: OrderFilters = {},
): Promise<ResolvedRecentOrders> {
  try {
    const result = await get_recent_orders(filters);
    const orders = result.orders;

    if (getShopifyMode() === "live" && orders.length < SPARSE_DATA_THRESHOLD) {
      const mockResult = await mockShopifyClient.getRecentOrders(filters);
      return {
        orders: mockResult.orders,
        source: "mock-fallback",
        fallbackReason:
          "Live store has limited order history, using demo dataset for richer analytics.",
      };
    }

    return {
      orders,
      source: getShopifyMode() === "live" ? "live" : "mock",
    };
  } catch (error) {
    if (getShopifyMode() === "live" && isProtectedOrderAccessError(error)) {
      const fallback = await mockShopifyClient.getRecentOrders(filters);
      return {
        orders: fallback.orders,
        source: "mock-fallback",
        fallbackReason:
          "Live Shopify order access is not approved yet, so order-based analytics are using generated mock orders.",
      };
    }

    throw error;
  }
}

export async function get_shopify_products(filters: ProductFilters = {}) {
  return getShopifyClient().getProducts(filters);
}

export function calculate_top_sellers(
  orders: Order[],
  products: Product[],
  limit = 8,
) {
  const productsBySku = new Map(
    products.flatMap((product) =>
      product.variants.map((variant) => [variant.sku, product] as const),
    ),
  );

  return calculateTopSellersFromOrders(orders, productsBySku, limit);
}


function getConfiguredDemoNow() {
  const configured = process.env.DEMO_NOW ?? process.env.NEXT_PUBLIC_DEMO_NOW;
  if (!configured) {
    return null;
  }

  const parsed = new Date(configured);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function resolveAnalysisReferenceDate() {
  const configuredDemoNow = getConfiguredDemoNow();

  if (configuredDemoNow) {
    return configuredDemoNow;
  }

  const recentOrders = await get_recent_orders_with_fallback();
  const latestOrder = recentOrders.orders
    .map((order) => new Date(order.createdAt))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return latestOrder ?? new Date("2026-06-14T00:00:00.000Z");
}
