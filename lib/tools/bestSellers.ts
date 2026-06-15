import { calculateTopSellersFromOrders } from "@/lib/analytics/topSellers";
import { getShopifyClient } from "@/lib/shopify";
import { getShopifyMode } from "@/lib/shopify/mode";
import { mockShopifyClient } from "@/lib/shopify/mockShopifyClient";
import type { OrderFilters, ProductFilters } from "@/lib/shopify/types";
import type { AgentToolTraceEntry } from "@/types/agentUi";
import type { Order, Product } from "@/types/domain";

export type ToolTraceEntry = AgentToolTraceEntry;

export async function get_recent_orders(filters: OrderFilters = {}) {
  return getShopifyClient().getRecentOrders(filters);
}

export interface ResolvedRecentOrders {
  orders: Order[];
  source: "live" | "mock" | "mock-fallback";
  fallbackReason?: string;
}

export interface BestSellersWindowResolution {
  requestedPromptMode: "last_month" | "recent";
  windowStrategy: "requested_previous_month" | "latest_30_days" | "latest_60_days";
  label: string;
  startDate: string;
  endDate: string;
  orders: Order[];
  ordersSource: ResolvedRecentOrders["source"];
  sourceLabel: string;
  fallbackMessage?: string;
  requestedWindowLabel?: string;
}

export function isProtectedOrderAccessError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("ACCESS_DENIED") &&
    error.message.includes("Order object")
  );
}

export async function get_recent_orders_with_fallback(
  filters: OrderFilters = {},
): Promise<ResolvedRecentOrders> {
  try {
    const result = await get_recent_orders(filters);
    return {
      orders: result.orders,
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
    "what are our best selling candies recently",
    "what is the most popular candy",
    "what candy sold the most",
    "show me top sellers",
    "best sellers last month",
    "which candy is performing best",
  ]).has(normalized);
}

export function isLastMonthBestSellersPrompt(prompt: string) {
  const normalized = normalizeBestSellersPrompt(prompt);

  return new Set([
    "what were our best selling candies last month",
    "best sellers last month",
  ]).has(normalized);
}

export function isRecentBestSellersPrompt(prompt: string) {
  return !isLastMonthBestSellersPrompt(prompt);
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

export function getRollingWindow(referenceDate: Date, days: number) {
  const end = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);

  return {
    label: `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`,
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

  const recentOrders = await get_recent_orders_with_fallback();
  const latestOrder = recentOrders.orders
    .map((order) => new Date(order.createdAt))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return latestOrder ?? new Date("2026-06-14T00:00:00.000Z");
}

function getSourceLabel(source: ResolvedRecentOrders["source"]) {
  if (source === "live") {
    return "Live Shopify Orders";
  }

  if (source === "mock-fallback") {
    return "Mock Orders fallback";
  }

  return "Mock Shopify Orders";
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

  const recentOrders = await get_recent_orders_with_fallback();
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

export async function resolveBestSellersWindow(
  prompt: string,
): Promise<BestSellersWindowResolution> {
  const requestedPromptMode = isLastMonthBestSellersPrompt(prompt) ? "last_month" : "recent";
  const allOrders = await get_recent_orders_with_fallback({ limit: 100 });
  const latestOrderDate = allOrders.orders
    .map((order) => new Date(order.createdAt))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const referenceDate = latestOrderDate ?? (await resolveAnalysisReferenceDate());

  if (requestedPromptMode === "last_month") {
    const requestedReferenceDate = await resolveAnalysisReferenceDate();
    const previousMonth = getPreviousMonthRange(requestedReferenceDate);
    const requestedOrders = await get_recent_orders_with_fallback({
      startDate: previousMonth.startDate,
      endDate: previousMonth.endDate,
    });

    if (requestedOrders.orders.length > 0) {
      return {
        requestedPromptMode,
        windowStrategy: "requested_previous_month",
        label: previousMonth.label,
        startDate: previousMonth.startDate,
        endDate: previousMonth.endDate,
        orders: requestedOrders.orders,
        ordersSource: requestedOrders.source,
        sourceLabel: getSourceLabel(requestedOrders.source),
      };
    }

    const latestThirtyDayWindow = getRollingWindow(referenceDate, 30);
    const latestThirtyDayOrders = await get_recent_orders_with_fallback({
      startDate: latestThirtyDayWindow.startDate,
      endDate: latestThirtyDayWindow.endDate,
    });

    if (latestThirtyDayOrders.orders.length > 0) {
      return {
        requestedPromptMode,
        windowStrategy: "latest_30_days",
        label: latestThirtyDayWindow.label,
        startDate: latestThirtyDayWindow.startDate,
        endDate: latestThirtyDayWindow.endDate,
        orders: latestThirtyDayOrders.orders,
        ordersSource: latestThirtyDayOrders.source,
        sourceLabel: getSourceLabel(latestThirtyDayOrders.source),
        requestedWindowLabel: previousMonth.label,
        fallbackMessage: `No live Shopify orders found for ${previousMonth.label}. Falling back to latest 30-day live Shopify order window.`,
      };
    }

    const latestSixtyDayWindow = getRollingWindow(referenceDate, 60);
    const latestSixtyDayOrders = await get_recent_orders_with_fallback({
      startDate: latestSixtyDayWindow.startDate,
      endDate: latestSixtyDayWindow.endDate,
    });

    return {
      requestedPromptMode,
      windowStrategy: "latest_60_days",
      label: latestSixtyDayWindow.label,
      startDate: latestSixtyDayWindow.startDate,
      endDate: latestSixtyDayWindow.endDate,
      orders: latestSixtyDayOrders.orders,
      ordersSource: latestSixtyDayOrders.source,
      sourceLabel: getSourceLabel(latestSixtyDayOrders.source),
      requestedWindowLabel: previousMonth.label,
      fallbackMessage: `No live Shopify orders found for ${previousMonth.label}. Falling back to latest 60-day live Shopify order window.`,
    };
  }

  const latestThirtyDayWindow = getRollingWindow(referenceDate, 30);
  const latestThirtyDayOrders = await get_recent_orders_with_fallback({
    startDate: latestThirtyDayWindow.startDate,
    endDate: latestThirtyDayWindow.endDate,
  });

  if (latestThirtyDayOrders.orders.length > 0) {
    return {
      requestedPromptMode,
      windowStrategy: "latest_30_days",
      label: latestThirtyDayWindow.label,
      startDate: latestThirtyDayWindow.startDate,
      endDate: latestThirtyDayWindow.endDate,
      orders: latestThirtyDayOrders.orders,
      ordersSource: latestThirtyDayOrders.source,
      sourceLabel: getSourceLabel(latestThirtyDayOrders.source),
    };
  }

  const latestSixtyDayWindow = getRollingWindow(referenceDate, 60);
  const latestSixtyDayOrders = await get_recent_orders_with_fallback({
    startDate: latestSixtyDayWindow.startDate,
    endDate: latestSixtyDayWindow.endDate,
  });

  return {
    requestedPromptMode,
    windowStrategy: "latest_60_days",
    label: latestSixtyDayWindow.label,
    startDate: latestSixtyDayWindow.startDate,
    endDate: latestSixtyDayWindow.endDate,
    orders: latestSixtyDayOrders.orders,
    ordersSource: latestSixtyDayOrders.source,
    sourceLabel: getSourceLabel(latestSixtyDayOrders.source),
    fallbackMessage:
      "No live Shopify orders were found in the latest 30-day window. Falling back to the latest 60-day live Shopify order window.",
  };
}
