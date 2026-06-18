import { getShopifyClient } from "@/lib/shopify";
import {
  get_recent_orders_with_fallback,
  get_shopify_products,
  calculate_top_sellers,
  resolveAnalysisReferenceDate,
} from "@/lib/tools/bestSellers";
import {
  resolveExplicitTimeWindow,
  resolveTimeWindowFromPrompt,
  type TimeGrain,
} from "@/lib/agent/timeWindows";
import {
  summarizeInventory,
  get_inventory_products,
  get_inventory_levels,
  type InventoryPromptSpec,
} from "@/lib/tools/inventoryOverview";
import {
  calculate_sales_velocity,
  forecast_stockout_risk,
  get_mock_distributor_availability,
} from "@/lib/tools/reorderSourCandy";
import {
  get_mock_fulfillment_centers,
  get_mock_warehouse_inventory,
  get_mock_fulfillment_issues,
} from "@/lib/tools/warehouseHealth";
import {
  listAvailableDocuments,
  parseDocument,
} from "@/lib/tools/documentParser";

function looseMatch(actual: string, expected: string) {
  const a = actual.toLowerCase().trim();
  const b = expected.toLowerCase().trim();
  return a === b || a.includes(b) || b.includes(a);
}

interface SearchProductsArgs {
  category?: string;
  country?: string;
  tags?: string[];
  sort_by?: "price_asc" | "price_desc" | "title" | "inventory";
  limit?: number;
}

async function executeSearchProducts(args: SearchProductsArgs) {
  const response = await get_shopify_products();
  let products = response.products;

  if (args.category) {
    products = products.filter((p) => looseMatch(p.category, args.category!));
  }
  if (args.country) {
    products = products.filter((p) =>
      looseMatch(p.countryOfOrigin, args.country!),
    );
  }
  if (args.tags && args.tags.length > 0) {
    products = products.filter((p) =>
      args.tags!.some((tag) =>
        p.tags.some((pt) => looseMatch(pt, tag)),
      ),
    );
  }

  if (args.sort_by === "price_asc") products.sort((a, b) => a.price - b.price);
  if (args.sort_by === "price_desc") products.sort((a, b) => b.price - a.price);
  if (args.sort_by === "title") products.sort((a, b) => a.title.localeCompare(b.title));
  if (args.sort_by === "inventory") products.sort((a, b) => a.inventoryQuantity - b.inventoryQuantity);

  const limit = args.limit ?? 50;
  products = products.slice(0, limit);

  return {
    count: products.length,
    products: products.map((p) => ({
      title: p.title,
      sku: p.variants[0]?.sku,
      category: p.category,
      countryOfOrigin: p.countryOfOrigin,
      price: p.price,
      cost: p.cost,
      margin: p.margin,
      tags: p.tags,
      handle: p.handle,
      inventoryQuantity: p.inventoryQuantity,
      brand: p.brand,
      vendor: p.vendor,
      distributor: p.distributor,
      description: p.productDescription,
    })),
  };
}

interface GetInventoryArgs {
  category?: string;
  country?: string;
  status?: "low" | "all";
  sku?: string;
  limit?: number;
}

async function executeGetInventory(args: GetInventoryArgs) {
  const productsResponse = await get_inventory_products();
  const inventoryResponse = await get_inventory_levels();

  const promptSpec: InventoryPromptSpec = {
    focus: args.status === "low" ? "low_stock" : "all_inventory",
    category: args.category,
    countryOfOrigin: args.country,
  };

  let rows = summarizeInventory(
    inventoryResponse.inventory,
    productsResponse.products,
    promptSpec,
  );

  if (args.sku) {
    rows = rows.filter((r) => looseMatch(r.sku, args.sku!));
  }

  if (args.status === "low") {
    rows = rows.filter((r) => r.status === "low");
  }

  const limit = args.limit ?? 50;
  rows = rows.slice(0, limit);

  return {
    count: rows.length,
    lowStockCount: rows.filter((r) => r.status === "low").length,
    rows: rows.map((r) => ({
      product: r.product,
      sku: r.sku,
      category: r.category,
      regions: r.regions,
      locations: r.locations,
      available: r.availableInventory,
      committed: r.committedInventory,
      incoming: r.incomingInventory,
      onHand: r.onHandInventory,
      status: r.status,
    })),
  };
}

export interface GetSalesDataArgs {
  time_query?: string;
  date_range?: string;
  start_date?: string;
  end_date?: string;
  grain?: "auto" | TimeGrain;
  category?: string;
  country?: string;
  sku?: string;
  sort_by?: "units" | "revenue" | "margin";
  limit?: number;
}

function filterOrdersBySkus(orders: Awaited<ReturnType<typeof get_recent_orders_with_fallback>>["orders"], allowedSkus: Set<string>) {
  return orders
    .map((order) => {
      const filteredLineItems = order.lineItems.filter((lineItem) =>
        allowedSkus.has(lineItem.sku),
      );
      const subtotalPrice = Number(
        filteredLineItems.reduce((sum, lineItem) => sum + lineItem.lineRevenue, 0).toFixed(2),
      );

      return {
        ...order,
        lineItems: filteredLineItems,
        subtotalPrice,
        totalPrice: subtotalPrice,
      };
    })
    .filter((order) => order.lineItems.length > 0);
}

function buildSalesTimeSeries(
  orders: Awaited<ReturnType<typeof get_recent_orders_with_fallback>>["orders"],
  timeWindow: { startDate: string; endDate: string; grain: TimeGrain },
) {
  const formatter =
    timeWindow.grain === "month"
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })
      : new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        });

  const buckets = new Map<
    string,
    { periodStart: string; periodLabel: string; unitsSold: number; revenue: number; orders: number }
  >();

  for (const order of orders) {
    const createdAt = new Date(order.createdAt);
    const bucketDate =
      timeWindow.grain === "month"
        ? new Date(Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), 1))
        : timeWindow.grain === "week"
          ? (() => {
              const start = new Date(
                Date.UTC(
                  createdAt.getUTCFullYear(),
                  createdAt.getUTCMonth(),
                  createdAt.getUTCDate(),
                  0,
                  0,
                  0,
                  0,
                ),
              );
              const day = start.getUTCDay();
              const offset = day === 0 ? -6 : 1 - day;
              start.setUTCDate(start.getUTCDate() + offset);
              return start;
            })()
        : new Date(
            Date.UTC(
              createdAt.getUTCFullYear(),
              createdAt.getUTCMonth(),
              createdAt.getUTCDate(),
            ),
          );
    const key = bucketDate.toISOString();
    const existing = buckets.get(key);
    const unitsSold = order.lineItems.reduce((sum, lineItem) => sum + lineItem.quantity, 0);
    const revenue = order.lineItems.reduce((sum, lineItem) => sum + lineItem.lineRevenue, 0);

    if (existing) {
      existing.unitsSold += unitsSold;
      existing.revenue = Number((existing.revenue + revenue).toFixed(2));
      existing.orders += 1;
    } else {
      buckets.set(key, {
        periodStart: key,
        periodLabel: formatter.format(bucketDate),
        unitsSold,
        revenue: Number(revenue.toFixed(2)),
        orders: 1,
      });
    }
  }

  const series: Array<{
    periodStart: string;
    periodLabel: string;
    unitsSold: number;
    revenue: number;
    orders: number;
  }> = [];

  const cursor = new Date(timeWindow.startDate);
  const end = new Date(timeWindow.endDate);

  while (cursor <= end) {
    const bucketStart =
      timeWindow.grain === "month"
        ? new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1))
        : timeWindow.grain === "week"
          ? (() => {
              const start = new Date(
                Date.UTC(
                  cursor.getUTCFullYear(),
                  cursor.getUTCMonth(),
                  cursor.getUTCDate(),
                  0,
                  0,
                  0,
                  0,
                ),
              );
              const day = start.getUTCDay();
              const offset = day === 0 ? -6 : 1 - day;
              start.setUTCDate(start.getUTCDate() + offset);
              return start;
            })()
          : new Date(
              Date.UTC(
                cursor.getUTCFullYear(),
                cursor.getUTCMonth(),
                cursor.getUTCDate(),
                0,
                0,
                0,
                0,
              ),
            );
    const key = bucketStart.toISOString();
    const existing = buckets.get(key);

    if (!series.some((entry) => entry.periodStart === key)) {
      series.push({
        periodStart: key,
        periodLabel: formatter.format(bucketStart),
        unitsSold: existing?.unitsSold ?? 0,
        revenue: existing?.revenue ?? 0,
        orders: existing?.orders ?? 0,
      });
    }

    if (timeWindow.grain === "month") {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
    } else if (timeWindow.grain === "week") {
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    } else {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return series.sort((a, b) => a.periodStart.localeCompare(b.periodStart));
}

export async function executeGetSalesData(
  args: GetSalesDataArgs,
  userPrompt?: string,
) {
  const referenceDate = await resolveAnalysisReferenceDate();
  const timeQuery = args.time_query ?? args.date_range ?? userPrompt ?? "";
  const window =
    args.start_date && args.end_date
      ? resolveExplicitTimeWindow(
          args.start_date,
          args.end_date,
          referenceDate,
          args.grain,
        )
      : resolveTimeWindowFromPrompt(timeQuery, referenceDate);
  const orderFetchLimit = window.dayCount > 180 ? 2400 : window.dayCount > 90 ? 1200 : 400;

  const ordersResult = await get_recent_orders_with_fallback({
    startDate: window.startDate,
    endDate: window.endDate,
    limit: orderFetchLimit,
  });

  const productsResponse = await get_shopify_products();
  let products = productsResponse.products;

  if (args.category) {
    products = products.filter((p) => looseMatch(p.category, args.category!));
  }
  if (args.country) {
    products = products.filter((p) =>
      looseMatch(p.countryOfOrigin, args.country!),
    );
  }
  if (args.sku) {
    products = products.filter((p) =>
      p.variants.some((variant) => looseMatch(variant.sku, args.sku!)) ||
      looseMatch(p.title, args.sku!) ||
      looseMatch(p.handle, args.sku!),
    );
  }

  const allowedSkus = new Set(
    products.map((product) => product.variants[0]?.sku).filter(Boolean),
  );
  const filteredOrders =
    args.category || args.country || args.sku
      ? filterOrdersBySkus(ordersResult.orders, allowedSkus)
      : ordersResult.orders;

  const topSellers = calculate_top_sellers(
    filteredOrders,
    products,
    args.limit ?? 50,
  );

  const sortedRows = [...topSellers.rows];
  if (args.sort_by === "revenue") sortedRows.sort((a, b) => b.revenue - a.revenue);
  if (args.sort_by === "margin") sortedRows.sort((a, b) => b.margin - a.margin);

  const categoryMap = new Map<string, { units: number; revenue: number; margin: number; products: number }>();
  for (const r of sortedRows) {
    const existing = categoryMap.get(r.category);
    if (existing) {
      existing.units += r.unitsSold;
      existing.revenue += r.revenue;
      existing.margin += r.margin;
      existing.products += 1;
    } else {
      categoryMap.set(r.category, { units: r.unitsSold, revenue: r.revenue, margin: r.margin, products: 1 });
    }
  }
  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      unitsSold: data.units,
      revenue: Number(data.revenue.toFixed(2)),
      margin: Number(data.margin.toFixed(2)),
      productCount: data.products,
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold);
  const timeSeries = buildSalesTimeSeries(filteredOrders, window);

  return {
    window: window.label,
    grain: window.grain,
    ordersAnalyzed: filteredOrders.length,
    orderSource: ordersResult.source,
    totalUnitsSold: topSellers.totalUnitsSold,
    topCategory: topSellers.topCategory,
    count: sortedRows.length,
    categoryBreakdown,
    timeSeries,
    rows: sortedRows.map((r) => ({
      product: r.product,
      sku: r.sku,
      category: r.category,
      unitsSold: r.unitsSold,
      revenue: Number(r.revenue.toFixed(2)),
      margin: Number(r.margin.toFixed(2)),
      averageSellingPrice: Number(r.averageSellingPrice.toFixed(2)),
    })),
  };
}

interface CheckReorderRiskArgs {
  category?: string;
  sku?: string;
}

async function executeCheckReorderRisk(args: CheckReorderRiskArgs) {
  const referenceDate = await resolveAnalysisReferenceDate();
  const window = resolveTimeWindowFromPrompt("past 30 days", referenceDate);

  const productsResponse = await get_shopify_products();
  let products = productsResponse.products;

  if (args.category) {
    products = products.filter((p) => looseMatch(p.category, args.category!));
  }
  if (args.sku) {
    products = products.filter((p) =>
      p.variants.some((v) => looseMatch(v.sku, args.sku!)),
    );
  }

  const inventoryResponse = await getShopifyClient().getInventory();
  const ordersResult = await get_recent_orders_with_fallback({
    startDate: window.startDate,
    endDate: window.endDate,
  });

  const skus = products.map((p) => p.variants[0]?.sku).filter(Boolean);
  const distributorAvailability = await get_mock_distributor_availability(skus);
  const velocity = calculate_sales_velocity(ordersResult.orders, products);
  const risks = forecast_stockout_risk(
    products,
    inventoryResponse.inventory,
    distributorAvailability,
    velocity,
  );

  return {
    window: window.label,
    productsAnalyzed: products.length,
    risksFound: risks.filter((r) => r.reorderNeeded).length,
    risks: risks.map((r) => ({
      product: r.product,
      sku: r.sku,
      category: r.category,
      available: r.availableInventory,
      dailyVelocity: r.dailySalesVelocity,
      daysUntilStockout:
        r.daysUntilStockout === Number.POSITIVE_INFINITY
          ? "no sales"
          : Number(r.daysUntilStockout.toFixed(1)),
      leadTimeDays: r.leadTimeDays,
      reorderNeeded: r.reorderNeeded,
      recommendedCases: r.recommendedCases,
      estimatedCost: r.estimatedCost,
      supplierName: r.supplierName,
      nextRestockDate: r.nextRestockDate,
    })),
  };
}

interface GetWarehouseHealthArgs {
  region?: string;
  severity?: "high" | "medium" | "all";
}

async function executeGetWarehouseHealth(args: GetWarehouseHealthArgs) {
  let centers = await get_mock_fulfillment_centers();
  let snapshots = await get_mock_warehouse_inventory();
  let issues = await get_mock_fulfillment_issues();

  if (args.region) {
    centers = centers.filter((c) => looseMatch(c.region, args.region!));
    const centerIds = new Set(centers.map((c) => c.id));
    snapshots = snapshots.filter((s) => centerIds.has(s.centerId));
    issues = issues.filter((i) => centerIds.has(i.centerId));
  }

  if (args.severity && args.severity !== "all") {
    snapshots = snapshots.filter((s) => s.severity === args.severity);
    issues = issues.filter((i) => i.severity === args.severity);
  }

  const totalDelayed = snapshots.reduce((s, snap) => s + snap.delayedShipments, 0);
  const totalStuck = snapshots.reduce((s, snap) => s + snap.stuckFulfillments, 0);
  const totalDamaged = snapshots.reduce((s, snap) => s + snap.damagedUnits, 0);
  const avgHours = snapshots.length > 0
    ? Number(
        (snapshots.reduce((s, snap) => s + snap.averageFulfillmentHours, 0) / snapshots.length).toFixed(1),
      )
    : 0;

  return {
    centersCount: centers.length,
    totalDelayedShipments: totalDelayed,
    totalStuckFulfillments: totalStuck,
    totalDamagedUnits: totalDamaged,
    averageFulfillmentHours: avgHours,
    centers: snapshots.map((s) => ({
      label: s.label,
      region: s.region,
      provider: s.provider,
      available: s.availableInventory,
      committed: s.committedInventory,
      delayed: s.delayedShipments,
      stuck: s.stuckFulfillments,
      damaged: s.damagedUnits,
      avgFulfillmentHours: s.averageFulfillmentHours,
      severity: s.severity,
    })),
    issues: issues.map((i) => ({
      warehouse: i.label,
      region: i.region,
      type: i.issueType.replace(/_/g, " "),
      severity: i.severity,
      impactedOrders: i.impactedOrders,
      status: i.status,
      description: i.description,
    })),
  };
}

interface GetDistributorAvailabilityArgs {
  category?: string;
  sku?: string;
}

async function executeGetDistributorAvailability(args: GetDistributorAvailabilityArgs) {
  const productsResponse = await get_shopify_products();
  let products = productsResponse.products;

  if (args.category) {
    products = products.filter((p) => looseMatch(p.category, args.category!));
  }
  if (args.sku) {
    products = products.filter((p) =>
      p.variants.some((v) => looseMatch(v.sku, args.sku!)),
    );
  }

  const skus = products.map((p) => p.variants[0]?.sku).filter(Boolean);
  const availability = await get_mock_distributor_availability(skus);

  return {
    count: availability.length,
    suppliers: availability.map((a) => ({
      supplierName: a.supplierName,
      sku: a.sku,
      productTitle: a.productTitle,
      availableCases: a.availableCases,
      unitsPerCase: a.unitsPerCase,
      minimumOrderCases: a.minimumOrderCases,
      unitCost: a.unitCost,
      leadTimeDays: a.estimatedLeadTimeDays,
      nextRestockDate: a.nextRestockDate,
    })),
  };
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context?: { userPrompt?: string },
): Promise<unknown> {
  switch (name) {
    case "search_products":
      return executeSearchProducts(args as SearchProductsArgs);
    case "get_inventory":
      return executeGetInventory(args as GetInventoryArgs);
    case "get_sales_data":
      return executeGetSalesData(args as GetSalesDataArgs, context?.userPrompt);
    case "check_reorder_risk":
      return executeCheckReorderRisk(args as CheckReorderRiskArgs);
    case "get_warehouse_health":
      return executeGetWarehouseHealth(args as GetWarehouseHealthArgs);
    case "get_distributor_availability":
      return executeGetDistributorAvailability(
        args as GetDistributorAvailabilityArgs,
      );
    case "list_documents": {
      const docs = await listAvailableDocuments();
      return {
        count: docs.length,
        documents: docs,
      };
    }
    case "parse_document":
      return parseDocument(args.filename as string);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
