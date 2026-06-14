import { calculateTopSellersFromOrders } from "@/lib/analytics/topSellers";
import { getShopifyClient } from "@/lib/shopify";
import type { OrderFilters, ProductFilters } from "@/lib/shopify/types";
import type { AgentToolTraceEntry } from "@/types/agentUi";
import type { Order, Product } from "@/types/domain";

export type ToolTraceEntry = AgentToolTraceEntry;

export async function get_recent_orders(filters: OrderFilters = {}) {
  return getShopifyClient().getRecentOrders(filters);
}

export async function get_shopify_products(filters: ProductFilters = {}) {
  return getShopifyClient().getProducts(filters);
}

export function calculate_top_sellers(orders: Order[], products: Product[]) {
  const productsBySku = new Map(
    products.flatMap((product) =>
      product.variants.map((variant) => [variant.sku, product] as const),
    ),
  );

  return calculateTopSellersFromOrders(orders, productsBySku);
}

export function normalizeBestSellersPrompt(prompt: string) {
  return prompt
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isBestSellersPrompt(prompt: string) {
  const normalized = normalizeBestSellersPrompt(prompt);

  return new Set([
    "what were our best selling candies last month",
    "what is the most popular candy",
    "what candy sold the most",
    "show me top sellers",
    "best sellers last month",
    "which candy is performing best",
  ]).has(normalized);
}

export function getPreviousMonthRange(referenceDate: Date) {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return {
    label: start.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
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

  const recentOrders = await get_recent_orders();
  const latestOrder = recentOrders.orders
    .map((order) => new Date(order.createdAt))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return latestOrder ?? new Date("2026-06-14T00:00:00.000Z");
}

function getMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getMonthDayCount(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function inferLatestFullMonthFromOrders(orders: Order[]) {
  const orderDayKeys = new Set(
    orders.map((order) => new Date(order.createdAt).toISOString().slice(0, 10)),
  );
  const monthsDesc = Array.from(
    new Set(orders.map((order) => getMonthKey(new Date(order.createdAt)))),
  ).sort((a, b) => b.localeCompare(a));

  for (const monthKey of monthsDesc) {
    const [yearText, monthText] = monthKey.split("-");
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;
    const dayCount = getMonthDayCount(year, monthIndex);

    let isComplete = true;
    for (let day = 1; day <= dayCount; day += 1) {
      const dayKey = new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
      if (!orderDayKeys.has(dayKey)) {
        isComplete = false;
        break;
      }
    }

    if (isComplete) {
      return new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    }
  }

  return null;
}

export async function resolveBestSellersMonthRange() {
  const referenceDate = await resolveAnalysisReferenceDate();

  if (getConfiguredDemoNow()) {
    return getPreviousMonthRange(referenceDate);
  }

  const recentOrders = await get_recent_orders();
  const inferredReferenceDate = inferLatestFullMonthFromOrders(recentOrders.orders);

  if (inferredReferenceDate) {
    return {
      label: inferredReferenceDate.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
      startDate: new Date(
        Date.UTC(
          inferredReferenceDate.getUTCFullYear(),
          inferredReferenceDate.getUTCMonth(),
          1,
          0,
          0,
          0,
          0,
        ),
      ).toISOString(),
      endDate: new Date(
        Date.UTC(
          inferredReferenceDate.getUTCFullYear(),
          inferredReferenceDate.getUTCMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      ).toISOString(),
    };
  }

  return getPreviousMonthRange(new Date("2026-06-14T00:00:00.000Z"));
}
