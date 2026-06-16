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

export interface BestSellersPromptSpec {
  mode: "last_month" | "recent" | "rolling_six_months";
  limit: number;
}

export interface BestSellersWindowResolution {
  requestedPromptMode: BestSellersPromptSpec["mode"];
  windowStrategy:
    | "requested_previous_month"
    | "latest_30_days"
    | "latest_60_days"
    | "rolling_six_months";
  label: string;
  startDate: string;
  endDate: string;
  orders: Order[];
  ordersSource: ResolvedRecentOrders["source"];
  sourceLabel: string;
  fallbackMessage?: string;
  requestedWindowLabel?: string;
  promptSpec: BestSellersPromptSpec;
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
  const signalPhrases = [
    "best selling",
    "best sellers",
    "top sellers",
    "top 10 sellers",
    "most popular candy",
    "candy sold the most",
    "performing best",
  ];

  return signalPhrases.some((phrase) => normalized.includes(phrase));
}

export function isLastMonthBestSellersPrompt(prompt: string) {
  return normalizeBestSellersPrompt(prompt).includes("last month");
}

export function resolveBestSellersPromptSpec(prompt: string): BestSellersPromptSpec {
  const normalized = normalizeBestSellersPrompt(prompt);
  const limit = normalized.includes("top 10") ? 10 : 8;

  if (normalized.includes("six months") || normalized.includes("6 months")) {
    return {
      mode: "rolling_six_months",
      limit,
    };
  }

  if (normalized.includes("last month")) {
    return {
      mode: "last_month",
      limit,
    };
  }

  return {
    mode: "recent",
    limit,
  };
}

export function getPreviousMonthRange(referenceDate: Date) {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return {
    label: formatMonthWindowLabel(start, referenceDate),
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
    label: formatDateRangeLabel(start, end, referenceDate),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

function formatMonthWindowLabel(date: Date, referenceDate: Date) {
  const sameYearAsReference = date.getUTCFullYear() === referenceDate.getUTCFullYear();

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    ...(sameYearAsReference ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(date);
}

function formatMonthDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatMonthDayYear(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatDateRangeLabel(start: Date, end: Date, referenceDate: Date) {
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameYearAsReference = sameYear && end.getUTCFullYear() === referenceDate.getUTCFullYear();

  if (sameYearAsReference) {
    return `${formatMonthDay(start)} to ${formatMonthDay(end)}`;
  }

  if (sameYear) {
    return `${formatMonthDay(start)} to ${formatMonthDay(end)}, ${end.getUTCFullYear()}`;
  }

  return `${formatMonthDayYear(start)} to ${formatMonthDayYear(end)}`;
}

function getConfiguredDemoNow() {
  const configured = process.env.DEMO_NOW ?? process.env.NEXT_PUBLIC_DEMO_NOW;
  if (!configured) {
    return null;
  }

  const parsed = new Date(configured);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

export async function resolveBestSellersWindow(
  prompt: string,
): Promise<BestSellersWindowResolution> {
  const promptSpec = resolveBestSellersPromptSpec(prompt);
  const allOrders = await get_recent_orders_with_fallback({ limit: 200 });
  const latestOrderDate = allOrders.orders
    .map((order) => new Date(order.createdAt))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const referenceDate = latestOrderDate ?? (await resolveAnalysisReferenceDate());

  if (promptSpec.mode === "rolling_six_months") {
    const window = getRollingWindow(referenceDate, 180);
    const orders = await get_recent_orders_with_fallback({
      startDate: window.startDate,
      endDate: window.endDate,
      limit: 200,
    });

    return {
      requestedPromptMode: promptSpec.mode,
      windowStrategy: "rolling_six_months",
      label: window.label,
      startDate: window.startDate,
      endDate: window.endDate,
      orders: orders.orders,
      ordersSource: orders.source,
      sourceLabel: getSourceLabel(orders.source),
      promptSpec,
    };
  }

  if (promptSpec.mode === "last_month") {
    const requestedReferenceDate = await resolveAnalysisReferenceDate();
    const previousMonth = getPreviousMonthRange(requestedReferenceDate);
    const requestedOrders = await get_recent_orders_with_fallback({
      startDate: previousMonth.startDate,
      endDate: previousMonth.endDate,
      limit: 200,
    });

    if (requestedOrders.orders.length > 0) {
      return {
        requestedPromptMode: promptSpec.mode,
        windowStrategy: "requested_previous_month",
        label: previousMonth.label,
        startDate: previousMonth.startDate,
        endDate: previousMonth.endDate,
        orders: requestedOrders.orders,
        ordersSource: requestedOrders.source,
        sourceLabel: getSourceLabel(requestedOrders.source),
        promptSpec,
      };
    }

    const latestThirtyDayWindow = getRollingWindow(referenceDate, 30);
    const latestThirtyDayOrders = await get_recent_orders_with_fallback({
      startDate: latestThirtyDayWindow.startDate,
      endDate: latestThirtyDayWindow.endDate,
      limit: 200,
    });

    if (latestThirtyDayOrders.orders.length > 0) {
      return {
        requestedPromptMode: promptSpec.mode,
        windowStrategy: "latest_30_days",
        label: latestThirtyDayWindow.label,
        startDate: latestThirtyDayWindow.startDate,
        endDate: latestThirtyDayWindow.endDate,
        orders: latestThirtyDayOrders.orders,
        ordersSource: latestThirtyDayOrders.source,
        sourceLabel: getSourceLabel(latestThirtyDayOrders.source),
        requestedWindowLabel: previousMonth.label,
        fallbackMessage: `No live Shopify orders found for ${previousMonth.label}. Falling back to latest 30-day live Shopify order window.`,
        promptSpec,
      };
    }

    const latestSixtyDayWindow = getRollingWindow(referenceDate, 60);
    const latestSixtyDayOrders = await get_recent_orders_with_fallback({
      startDate: latestSixtyDayWindow.startDate,
      endDate: latestSixtyDayWindow.endDate,
      limit: 200,
    });

    return {
      requestedPromptMode: promptSpec.mode,
      windowStrategy: "latest_60_days",
      label: latestSixtyDayWindow.label,
      startDate: latestSixtyDayWindow.startDate,
      endDate: latestSixtyDayWindow.endDate,
      orders: latestSixtyDayOrders.orders,
      ordersSource: latestSixtyDayOrders.source,
      sourceLabel: getSourceLabel(latestSixtyDayOrders.source),
      requestedWindowLabel: previousMonth.label,
      fallbackMessage: `No live Shopify orders found for ${previousMonth.label}. Falling back to latest 60-day live Shopify order window.`,
      promptSpec,
    };
  }

  const latestThirtyDayWindow = getRollingWindow(referenceDate, 30);
  const latestThirtyDayOrders = await get_recent_orders_with_fallback({
    startDate: latestThirtyDayWindow.startDate,
    endDate: latestThirtyDayWindow.endDate,
    limit: 200,
  });

  if (latestThirtyDayOrders.orders.length > 0) {
    return {
      requestedPromptMode: promptSpec.mode,
      windowStrategy: "latest_30_days",
      label: latestThirtyDayWindow.label,
      startDate: latestThirtyDayWindow.startDate,
      endDate: latestThirtyDayWindow.endDate,
      orders: latestThirtyDayOrders.orders,
      ordersSource: latestThirtyDayOrders.source,
      sourceLabel: getSourceLabel(latestThirtyDayOrders.source),
      promptSpec,
    };
  }

  const latestSixtyDayWindow = getRollingWindow(referenceDate, 60);
  const latestSixtyDayOrders = await get_recent_orders_with_fallback({
    startDate: latestSixtyDayWindow.startDate,
    endDate: latestSixtyDayWindow.endDate,
    limit: 200,
  });

  return {
    requestedPromptMode: promptSpec.mode,
    windowStrategy: "latest_60_days",
    label: latestSixtyDayWindow.label,
    startDate: latestSixtyDayWindow.startDate,
    endDate: latestSixtyDayWindow.endDate,
    orders: latestSixtyDayOrders.orders,
    ordersSource: latestSixtyDayOrders.source,
    sourceLabel: getSourceLabel(latestSixtyDayOrders.source),
    fallbackMessage:
      "No live Shopify orders were found in the latest 30-day window. Falling back to the latest 60-day live Shopify order window.",
    promptSpec,
  };
}
