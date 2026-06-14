import { NextResponse } from "next/server";
import {
  calculate_top_sellers,
  get_recent_orders,
  get_shopify_products,
  resolveBestSellersMonthRange,
} from "@/lib/tools/bestSellers";
import { routeAgentIntent } from "@/lib/agent/intentRouter";
import { runSourCandyReorderFlow } from "@/lib/tools/reorderSourCandy";
import { runWarehouseHealthFlow } from "@/lib/tools/warehouseHealth";
import type { AgentToolTraceEntry, AgentUiResponse } from "@/types/agentUi";

async function buildBestSellersResponse(): Promise<AgentUiResponse> {
  const previousMonth = await resolveBestSellersMonthRange();
  const recentOrders = await get_recent_orders({
    startDate: previousMonth.startDate,
    endDate: previousMonth.endDate,
  });
  const products = await get_shopify_products();
  const topSellers = calculate_top_sellers(recentOrders.orders, products.products);
  const topProduct = topSellers.rows[0];

  return {
    kind: "best_sellers",
    answer: {
      title: `${previousMonth.label} best-sellers snapshot`,
      body: `Last month, ${topProduct.product} was your best-selling candy with ${topProduct.unitsSold} units sold. ${topSellers.topCategory} led the catalog overall with ${topSellers.topCategoryUnitsSold} units sold across the month.`,
      badge: "Mock Shopify",
    },
    primaryCards: [
      {
        type: "insight",
        title: `${previousMonth.label} top seller`,
        confidence: "High",
        metric: `${topProduct.unitsSold} units sold`,
        explanation: `${topProduct.product} generated $${topProduct.revenue.toFixed(2)} in revenue and helped ${topSellers.topCategory} finish as the leading category.`,
        recommendedAction: `Feature ${topProduct.product} in the next merchandising pass and keep an eye on other ${topSellers.topCategory.toLowerCase()} SKUs.`,
      },
    ],
    secondaryCards: [],
    tables: [
      {
        type: "product_table",
        title: `Best-selling candies for ${previousMonth.label}`,
        rows: topSellers.rows.map((row) => ({
          product: row.product,
          sku: row.sku,
          category: row.category,
          unitsSold: row.unitsSold,
          revenue: row.revenue,
          margin: row.margin,
        })),
      },
    ],
    toolTrace: [
      {
        toolName: "get_recent_orders",
        input: {
          startDate: previousMonth.startDate,
          endDate: previousMonth.endDate,
        },
        outputSummary: `Fetched ${recentOrders.orders.length} mock orders for ${previousMonth.label}.`,
      },
      {
        toolName: "get_shopify_products",
        input: {
          mode: "mock",
        },
        outputSummary: `Loaded ${products.products.length} products from the Shopify adapter for SKU metadata.`,
      },
      {
        toolName: "calculate_top_sellers",
        input: {
          orders: recentOrders.orders.length,
          products: products.products.length,
        },
        outputSummary: `Ranked ${topSellers.rows.length} top-selling products and identified ${topSellers.topCategory} as the strongest category.`,
      },
    ],
  };
}

async function buildSourReorderResponse(): Promise<AgentUiResponse> {
  const result = await runSourCandyReorderFlow();
  const primaryRisk = result.risks.find((risk) => risk.reorderNeeded) ?? result.risks[0];
  const reorderCount = result.risks.filter((risk) => risk.reorderNeeded).length;

  return {
    kind: "sour_reorder",
    answer: {
      title: "Sour candy reorder check",
      body: primaryRisk.reorderNeeded
        ? `Yes. Sour candy is at risk. ${primaryRisk.product} is projected to stock out in ${primaryRisk.daysUntilStockout.toFixed(1)} days, while the distributor lead time is ${primaryRisk.leadTimeDays} days. I recommend drafting a reorder for ${primaryRisk.recommendedCases} cases.`
        : `Not yet. Sour candy is still covered, but ${primaryRisk.product} is the closest watch item with roughly ${primaryRisk.daysUntilStockout.toFixed(1)} days of inventory left.`,
      badge: "Mock Shopify",
    },
    primaryCards: result.reorderDraft
      ? [
          {
            type: "reorder_draft",
            title: `Draft reorder for ${result.reorderDraft.product}`,
            supplierName: result.reorderDraft.supplierName,
            sku: result.reorderDraft.sku,
            recommendedCases: result.reorderDraft.recommendedCases,
            recommendedUnits: result.reorderDraft.recommendedUnits,
            estimatedCost: result.reorderDraft.estimatedCost,
            leadTimeDays: result.reorderDraft.leadTimeDays,
            daysUntilStockout: result.reorderDraft.daysUntilStockout,
            rationale: result.reorderDraft.rationale,
            nextRestockDate: result.reorderDraft.nextRestockDate,
          },
        ]
      : [],
    secondaryCards: result.risks.slice(0, 3).map((risk) => ({
      type: "inventory_risk" as const,
      title: risk.product,
      sku: risk.sku,
      availableInventory: risk.availableInventory,
      dailySalesVelocity: risk.dailySalesVelocity,
      daysUntilStockout: risk.daysUntilStockout,
      leadTimeDays: risk.leadTimeDays,
      recommendedCases: risk.recommendedCases,
      severity: risk.daysUntilStockout <= risk.leadTimeDays ? "high" : "medium",
    })),
    tables: [
      {
        type: "risk_table",
        title: `Sour candy stockout risk for ${result.salesWindow.label}`,
        rows: result.risks.map((risk) => ({
          product: risk.product,
          sku: risk.sku,
          availableInventory: risk.availableInventory,
          recentUnitsSold: risk.recentUnitsSold,
          dailySalesVelocity: risk.dailySalesVelocity,
          daysUntilStockout: risk.daysUntilStockout,
          leadTimeDays: risk.leadTimeDays,
          recommendedCases: risk.recommendedCases,
        })),
      },
    ],
    toolTrace: [
      ...result.toolTrace,
      {
        toolName: "reorder_summary",
        input: { reorderCandidates: reorderCount },
        outputSummary: `Built ${Math.min(result.risks.length, 3)} inventory risk cards and one sour-candy reorder recommendation.`,
      },
    ],
  };
}

async function buildWarehouseHealthResponse(): Promise<AgentUiResponse> {
  const result = await runWarehouseHealthFlow();
  const hottestCenter = result.hottestCenter;

  return {
    kind: "warehouse_health",
    answer: {
      title: "Global warehouse / fulfillment issues",
      body: hottestCenter
        ? `${hottestCenter.label} is the warehouse that needs the most attention right now. Across the network there are ${result.totalDelayedShipments} delayed shipments, ${result.totalStuckFulfillments} stuck fulfillment events, and average fulfillment time is ${result.averageFulfillmentHours} hours.`
        : `Warehouse health is stable overall, with no single fulfillment center standing out as the primary risk.`,
      badge: "Mock ops data",
    },
    primaryCards: [
      {
        type: "insight",
        title: hottestCenter
          ? `${hottestCenter.label} is the current bottleneck`
          : "Warehouse network looks stable",
        confidence: "High",
        metric: `${result.totalDelayedShipments} delayed shipments`,
        explanation: hottestCenter
          ? `${hottestCenter.label} is showing the heaviest delay and stuck-fulfillment load, while the network average fulfillment time is ${result.averageFulfillmentHours} hours.`
          : `Regional warehouse snapshots are within expected thresholds and no center has crossed the high-severity boundary.`,
        recommendedAction: hottestCenter
          ? `Prioritize ${hottestCenter.label} for carrier backlog cleanup and pick-pack recovery before expanding promotional volume in that region.`
          : "Keep monitoring carrier performance and receiving accuracy across the global network.",
      },
    ],
    secondaryCards: result.regionalCards,
    tables: [
      {
        type: "issue_table",
        title: "Delayed and problem shipments",
        rows: result.delayedIssuesTable,
      },
    ],
    toolTrace: result.toolTrace,
  };
}

function buildUnsupportedResponse(traceEntry: AgentToolTraceEntry): AgentUiResponse {
  return {
    kind: "unsupported",
    answer: {
      title: "This demo supports three store-ops questions today",
      body: "I can currently help with best sellers, sour candy reorder or stockout checks, and global warehouse or fulfillment issues. Try one of the suggested prompts below to see the supported workflows.",
      badge: "Demo scope",
    },
    primaryCards: [],
    secondaryCards: [],
    tables: [],
    toolTrace: [traceEntry],
    suggestedPrompts: [
      "What were our best-selling candies last month?",
      "Do we need to reorder sour candy?",
      "Show me warehouse issues globally.",
    ],
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as { prompt?: string };
  const prompt = body.prompt?.trim() ?? "";

  const intentDecision = await routeAgentIntent(prompt);
  let response: AgentUiResponse | null = null;

  if (intentDecision.intent === "best_sellers") {
    response = await buildBestSellersResponse();
  }

  if (intentDecision.intent === "sour_reorder") {
    response = await buildSourReorderResponse();
  }

  if (intentDecision.intent === "warehouse_health") {
    response = await buildWarehouseHealthResponse();
  }

  if (response) {
    return NextResponse.json({
      ...response,
      toolTrace: [intentDecision.traceEntry, ...response.toolTrace],
    });
  }

  return NextResponse.json(buildUnsupportedResponse(intentDecision.traceEntry));
}
