import { readFile } from "node:fs/promises";
import path from "node:path";
import { getShopifyClient } from "@/lib/shopify";
import {
  get_recent_orders_with_fallback,
  resolveAnalysisReferenceDate,
  type ToolTraceEntry,
} from "@/lib/tools/bestSellers";
import type { DistributorAvailability, InventoryLevel, Order, Product } from "@/types/domain";

export interface SourInventoryRisk {
  product: string;
  sku: string;
  category: string;
  availableInventory: number;
  recentUnitsSold: number;
  dailySalesVelocity: number;
  daysUntilStockout: number;
  leadTimeDays: number;
  safetyStockUnits: number;
  recommendedCases: number;
  recommendedUnits: number;
  reorderNeeded: boolean;
  supplierName: string;
  unitsPerCase: number;
  minimumOrderCases: number;
  unitCost: number;
  nextRestockDate: string;
  estimatedCost: number;
}

export interface SourReorderDraft {
  product: string;
  sku: string;
  supplierName: string;
  recommendedCases: number;
  recommendedUnits: number;
  estimatedCost: number;
  leadTimeDays: number;
  daysUntilStockout: number;
  rationale: string;
  nextRestockDate: string;
}

export function normalizeSourReorderPrompt(prompt: string) {
  return prompt
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSourReorderPrompt(prompt: string) {
  const normalized = normalizeSourReorderPrompt(prompt);

  return new Set([
    "do we need to reorder sour candy",
    "should we reorder sour candy",
    "what sour candy is at risk of stockout",
    "show sour candy stockout risk",
    "are we going to run out of sour products",
  ]).has(normalized);
}

export async function get_sour_shopify_products() {
  const response = await getShopifyClient().getProducts();
  return {
    products: response.products.filter(
      (product) => product.tags.includes("sour") || product.category === "Sour candy",
    ),
  };
}

export async function get_shopify_inventory() {
  return getShopifyClient().getInventory();
}

function getLastThirtyDayWindow(referenceDate: Date) {
  const endDate = new Date(
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
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 29);
  startDate.setUTCHours(0, 0, 0, 0);

  return {
    label: `${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

export function calculate_sales_velocity(orders: Order[], sourProducts: Product[]) {
  const skuSet = new Set(sourProducts.map((product) => product.variants[0].sku));
  const rows = sourProducts.map((product) => {
    const sku = product.variants[0].sku;
    const recentUnitsSold = orders
      .flatMap((order) => order.lineItems)
      .filter((lineItem) => lineItem.sku === sku)
      .reduce((sum, lineItem) => sum + lineItem.quantity, 0);
    const dailySalesVelocity = Number((recentUnitsSold / 30).toFixed(2));

    return {
      sku,
      product: product.title,
      category: product.category,
      recentUnitsSold,
      dailySalesVelocity,
    };
  });

  return rows.filter((row) => skuSet.has(row.sku));
}

async function readDistributorAvailability(): Promise<DistributorAvailability[]> {
  const filePath = path.join(process.cwd(), "data", "generated", "distributorAvailability.json");
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as DistributorAvailability[];
}

export async function get_mock_distributor_availability(skus: string[]) {
  const distributorAvailability = await readDistributorAvailability();
  const skuSet = new Set(skus);

  return distributorAvailability.filter((entry) => skuSet.has(entry.sku));
}

function sumAvailableInventory(inventory: InventoryLevel[], sku: string) {
  return inventory
    .filter((entry) => entry.sku === sku)
    .reduce((sum, entry) => sum + entry.available, 0);
}

export function forecast_stockout_risk(
  sourProducts: Product[],
  inventory: InventoryLevel[],
  distributorAvailability: DistributorAvailability[],
  salesVelocity: ReturnType<typeof calculate_sales_velocity>,
) {
  return sourProducts
    .map((product) => {
      const sku = product.variants[0].sku;
      const distributor = distributorAvailability.find((entry) => entry.sku === sku);
      const velocity = salesVelocity.find((entry) => entry.sku === sku);
      const availableInventory = sumAvailableInventory(inventory, sku);
      const dailySalesVelocity = velocity?.dailySalesVelocity ?? 0;
      const leadTimeDays = distributor?.estimatedLeadTimeDays ?? 14;
      const safetyStockUnits = Math.max(Math.ceil(dailySalesVelocity * 14), 12);
      const daysUntilStockout =
        dailySalesVelocity > 0
          ? Number((availableInventory / dailySalesVelocity).toFixed(1))
          : Number.POSITIVE_INFINITY;
      const reorderNeeded = daysUntilStockout <= leadTimeDays + 14;

      const targetUnits = Math.ceil(dailySalesVelocity * (leadTimeDays + 21) + safetyStockUnits);
      const unitsPerCase = distributor?.unitsPerCase ?? 24;
      const minimumOrderCases = distributor?.minimumOrderCases ?? 4;
      const recommendedUnits = reorderNeeded
        ? Math.max(targetUnits - availableInventory, minimumOrderCases * unitsPerCase)
        : 0;
      const recommendedCases = reorderNeeded
        ? Math.max(Math.ceil(recommendedUnits / unitsPerCase), minimumOrderCases)
        : 0;
      const estimatedCost = distributor
        ? Number((recommendedCases * unitsPerCase * distributor.unitCost).toFixed(2))
        : 0;

      return {
        product: product.title,
        sku,
        category: product.category,
        availableInventory,
        recentUnitsSold: velocity?.recentUnitsSold ?? 0,
        dailySalesVelocity,
        daysUntilStockout,
        leadTimeDays,
        safetyStockUnits,
        recommendedCases,
        recommendedUnits: reorderNeeded ? recommendedCases * unitsPerCase : 0,
        reorderNeeded,
        supplierName: distributor?.supplierName ?? product.distributor,
        unitsPerCase,
        minimumOrderCases,
        unitCost: distributor?.unitCost ?? product.cost,
        nextRestockDate: distributor?.nextRestockDate ?? "2026-06-30",
        estimatedCost,
      } satisfies SourInventoryRisk;
    })
    .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
}

export function draft_reorder_recommendation(risks: SourInventoryRisk[]): SourReorderDraft | null {
  const candidate = risks.find((risk) => risk.reorderNeeded) ?? risks[0];

  if (!candidate) {
    return null;
  }

  return {
    product: candidate.product,
    sku: candidate.sku,
    supplierName: candidate.supplierName,
    recommendedCases: candidate.recommendedCases,
    recommendedUnits: candidate.recommendedUnits,
    estimatedCost: candidate.estimatedCost,
    leadTimeDays: candidate.leadTimeDays,
    daysUntilStockout: candidate.daysUntilStockout,
    rationale: `${candidate.product} is moving at ${candidate.dailySalesVelocity.toFixed(2)} units/day with ${candidate.availableInventory} units available. That leaves roughly ${candidate.daysUntilStockout.toFixed(1)} days of cover against a ${candidate.leadTimeDays}-day lead time.`,
    nextRestockDate: candidate.nextRestockDate,
  };
}

export async function runSourCandyReorderFlow() {
  const referenceDate = await resolveAnalysisReferenceDate();
  const salesWindow = getLastThirtyDayWindow(referenceDate);
  const sourProducts = await get_sour_shopify_products();
  const inventory = await get_shopify_inventory();
  const recentOrders = await get_recent_orders_with_fallback({
    startDate: salesWindow.startDate,
    endDate: salesWindow.endDate,
  });
  const distributorAvailability = await get_mock_distributor_availability(
    sourProducts.products.map((product) => product.variants[0].sku),
  );
  const salesVelocity = calculate_sales_velocity(recentOrders.orders, sourProducts.products);
  const risks = forecast_stockout_risk(
    sourProducts.products,
    inventory.inventory,
    distributorAvailability,
    salesVelocity,
  );
  const reorderDraft = draft_reorder_recommendation(risks);

  const toolTrace: ToolTraceEntry[] = [
    {
      toolName: "get_shopify_products",
      input: { filter: "tag:sour or category:Sour candy" },
      outputSummary: `Loaded ${sourProducts.products.length} sour candy products from the Shopify adapter.`,
    },
    {
      toolName: "get_shopify_inventory",
      input: { scope: "all locations" },
      outputSummary: `Loaded ${inventory.inventory.length} inventory rows, then matched them to sour candy SKUs.`,
    },
    {
      toolName: "get_recent_orders",
      input: { startDate: salesWindow.startDate, endDate: salesWindow.endDate },
      outputSummary:
        recentOrders.source === "mock-fallback"
          ? `Live Shopify order access is unavailable, so 30-day sales velocity is using ${recentOrders.orders.length} generated mock orders instead.`
          : `Loaded ${recentOrders.orders.length} ${recentOrders.source} orders for the 30-day sales window.`,
    },
    {
      toolName: "calculate_sales_velocity",
      input: { startDate: salesWindow.startDate, endDate: salesWindow.endDate },
      outputSummary: `Calculated 30-day sales velocity for ${salesVelocity.length} sour candy SKUs.`,
    },
    {
      toolName: "forecast_stockout_risk",
      input: { sourSkus: sourProducts.products.length },
      outputSummary: `Projected stockout timing for ${risks.length} sour products using available inventory, sales velocity, and safety stock.`,
    },
    {
      toolName: "get_mock_distributor_availability",
      input: { skus: sourProducts.products.length },
      outputSummary: `Loaded distributor availability, MOQ, case size, and lead times for sour candy suppliers.`,
    },
    {
      toolName: "draft_reorder_recommendation",
      input: { candidates: risks.filter((risk) => risk.reorderNeeded).length || risks.length },
      outputSummary: reorderDraft
        ? `Drafted a reorder recommendation for ${reorderDraft.product}.`
        : "No reorder recommendation was needed.",
    },
  ];

  return {
    referenceDate,
    salesWindow,
    sourProducts: sourProducts.products,
    inventory: inventory.inventory,
    recentOrders: recentOrders.orders,
    orderDataSource: recentOrders.source,
    orderFallbackReason: recentOrders.fallbackReason,
    risks,
    reorderDraft,
    toolTrace,
  };
}
