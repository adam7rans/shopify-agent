import { NextResponse } from "next/server";
import { getHybridOpsBadge, getShopifyModeBadge } from "@/lib/shopify";
import {
  calculate_top_sellers,
  get_shopify_products,
  resolveBestSellersWindow,
} from "@/lib/tools/bestSellers";
import { routeAgentIntent } from "@/lib/agent/intentRouter";
import { runInventoryOverviewFlow } from "@/lib/tools/inventoryOverview";
import { runSourCandyReorderFlow } from "@/lib/tools/reorderSourCandy";
import { runWarehouseHealthFlow } from "@/lib/tools/warehouseHealth";
import { runAgentLoop } from "@/lib/agent/agentLoop";
import { hasLlmRoutingConfig } from "@/lib/agent/llmIntentRouter";
import type { AgentToolTraceEntry, AgentUiResponse, DiagnosticsSummaryBlock } from "@/types/agentUi";

function normalizeHelpPrompt(prompt: string) {
  return prompt
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isHelpPrompt(prompt: string) {
  const normalized = normalizeHelpPrompt(prompt);
  return [
    "what is this app for",
    "what can i ask",
    "how do i use this app",
    "what can this app do",
  ].includes(normalized);
}

function buildBestSellersDiagnostics(
  sourceLabel: string,
  queryWindowLabel: string,
  orders: number,
  products: number,
  rows: number,
  note?: string,
): DiagnosticsSummaryBlock {
  return {
    title: "Sales analytics diagnostics",
    sources: [sourceLabel, getShopifyModeBadge()],
    queryWindowLabel,
    counts: [
      { label: "Orders", value: orders },
      { label: "Catalog products", value: products },
      { label: "Ranked rows", value: rows },
    ],
    notes: note ? [note] : undefined,
  };
}

async function buildBestSellersResponse(prompt: string): Promise<AgentUiResponse> {
  const resolvedWindow = await resolveBestSellersWindow(prompt);
  const products = await get_shopify_products();
  const topSellers = calculate_top_sellers(
    resolvedWindow.orders,
    products.products,
    resolvedWindow.promptSpec.limit,
  );
  const topProduct = topSellers.rows[0];
  const usingMockOrderFallback = resolvedWindow.ordersSource === "mock-fallback";
  const isRecentWindow = resolvedWindow.requestedPromptMode === "recent";
  const isSixMonthWindow = resolvedWindow.requestedPromptMode === "rolling_six_months";
  const answerTitle = isSixMonthWindow
    ? "Six-month best-sellers snapshot"
    : isRecentWindow
      ? "Recent best-sellers snapshot"
      : `${resolvedWindow.requestedWindowLabel ?? resolvedWindow.label} best-sellers snapshot`;
  const orderSourceSummary =
    resolvedWindow.ordersSource === "live"
      ? `Fetched ${resolvedWindow.orders.length} live orders for ${resolvedWindow.label}.`
      : usingMockOrderFallback
        ? `Fetched ${resolvedWindow.orders.length} generated mock orders because live Shopify Order access is not approved yet.`
        : `Fetched ${resolvedWindow.orders.length} mock orders for ${resolvedWindow.label}.`;
  const diagnostics = buildBestSellersDiagnostics(
    resolvedWindow.sourceLabel,
    resolvedWindow.label,
    resolvedWindow.orders.length,
    products.products.length,
    topSellers.rows.length,
    resolvedWindow.fallbackMessage,
  );

  if (!topProduct) {
    return {
      kind: "best_sellers",
      answer: {
        title: answerTitle,
        body: usingMockOrderFallback
          ? `I can read the live Shopify catalog, but this app is not approved for live Order access yet. Order-based analytics are temporarily using mock history, and there still isn't enough matching activity in ${resolvedWindow.label} to rank top sellers.`
          : resolvedWindow.fallbackMessage
            ? `${resolvedWindow.fallbackMessage} I still did not find enough matching line items to rank best sellers in ${resolvedWindow.label}.`
            : `I reached the Shopify catalog, but there isn't enough order history in ${resolvedWindow.label} to calculate top sellers yet.`,
        badge: getShopifyModeBadge(),
      },
      primaryCards: [],
      secondaryCards: [],
      tables: [
        {
          type: "product_table",
          title: "Best-selling candies",
          dateWindowLabel: resolvedWindow.label,
          ordersIncluded: resolvedWindow.orders.length,
          sourceLabel: resolvedWindow.sourceLabel,
          rows: [],
        },
      ],
      diagnostics,
      toolTrace: [
        {
          toolName: "resolve_best_sellers_window",
          input: {
            promptMode: resolvedWindow.requestedPromptMode,
            windowStrategy: resolvedWindow.windowStrategy,
          },
          outputSummary:
            resolvedWindow.fallbackMessage ??
            `Using ${resolvedWindow.label} as the best-sellers analysis window.`,
        },
        {
          toolName: "get_recent_orders",
          input: {
            startDate: resolvedWindow.startDate,
            endDate: resolvedWindow.endDate,
            source: resolvedWindow.sourceLabel,
          },
          outputSummary: orderSourceSummary,
        },
        {
          toolName: "get_shopify_products",
          input: {
            mode: getShopifyModeBadge(),
          },
          outputSummary: `Loaded ${products.products.length} products from the Shopify adapter.`,
        },
        {
          toolName: "calculate_top_sellers",
          input: {
            orders: resolvedWindow.orders.length,
            products: products.products.length,
            limit: resolvedWindow.promptSpec.limit,
          },
          outputSummary:
            "No ranked top sellers were available because the selected order window returned zero matching line items.",
        },
      ],
    };
  }

  const rankingLabel = resolvedWindow.promptSpec.limit === 10 ? "Top 10 sellers" : "Best-selling candies";

  return {
    kind: "best_sellers",
    answer: {
      title: answerTitle,
      body: usingMockOrderFallback
        ? `${topProduct.product} is the strongest performer in the fallback order history with ${topProduct.unitsSold} units sold. Live Shopify products are in use, but order-based ranking is temporarily using generated mock orders until the app is approved for the Order object.`
        : resolvedWindow.fallbackMessage
          ? `${resolvedWindow.fallbackMessage} In ${resolvedWindow.label}, ${topProduct.product} leads with ${topProduct.unitsSold} units sold across ${resolvedWindow.orders.length} live Shopify orders.`
          : isRecentWindow
            ? `In the latest live Shopify order window, ${topProduct.product} is performing best with ${topProduct.unitsSold} units sold across ${resolvedWindow.orders.length} orders. ${topSellers.topCategory} is the strongest category overall.`
            : isSixMonthWindow
              ? `Across the latest six-month live Shopify window, ${topProduct.product} leads with ${topProduct.unitsSold} units sold. ${topSellers.topCategory} is the strongest category overall.`
              : `${topProduct.product} was your best-selling candy in ${resolvedWindow.label} with ${topProduct.unitsSold} units sold across ${resolvedWindow.orders.length} live Shopify orders. ${topSellers.topCategory} led the catalog overall.`,
      badge: getShopifyModeBadge(),
    },
    primaryCards: [
      {
        type: "insight",
        title: `${resolvedWindow.label} top seller`,
        confidence: "High",
        metric: `${topProduct.unitsSold} units sold`,
        explanation: `${topProduct.product} generated $${topProduct.revenue.toFixed(2)} in revenue across ${resolvedWindow.orders.length} ${resolvedWindow.sourceLabel.toLowerCase()} and helped ${topSellers.topCategory} finish as the leading category.`,
        recommendedAction: resolvedWindow.fallbackMessage
          ? `${resolvedWindow.fallbackMessage} Feature ${topProduct.product} in the next merchandising pass while live order history fills in.`
          : `Feature ${topProduct.product} in the next merchandising pass and keep an eye on other ${topSellers.topCategory.toLowerCase()} SKUs.`,
      },
    ],
    secondaryCards: [],
    tables: [
      {
        type: "product_table",
        title: rankingLabel,
        dateWindowLabel: resolvedWindow.label,
        ordersIncluded: resolvedWindow.orders.length,
        sourceLabel: resolvedWindow.sourceLabel,
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
    diagnostics,
    toolTrace: [
      {
        toolName: "resolve_best_sellers_window",
        input: {
          promptMode: resolvedWindow.requestedPromptMode,
          windowStrategy: resolvedWindow.windowStrategy,
        },
        outputSummary:
          resolvedWindow.fallbackMessage ??
          `Using ${resolvedWindow.label} as the best-sellers analysis window.`,
      },
      {
        toolName: "get_recent_orders",
        input: {
          startDate: resolvedWindow.startDate,
          endDate: resolvedWindow.endDate,
          source: resolvedWindow.sourceLabel,
        },
        outputSummary: orderSourceSummary,
      },
      {
        toolName: "get_shopify_products",
        input: {
          mode: getShopifyModeBadge(),
        },
        outputSummary: `Loaded ${products.products.length} products from the Shopify adapter for SKU metadata.`,
      },
      {
        toolName: "calculate_top_sellers",
        input: {
          orders: resolvedWindow.orders.length,
          products: products.products.length,
          limit: resolvedWindow.promptSpec.limit,
        },
        outputSummary: `Ranked ${topSellers.rows.length} top-selling products and identified ${topSellers.topCategory} as the strongest category.`,
      },
    ],
  };
}

async function buildInventoryOverviewResponse(prompt: string): Promise<AgentUiResponse> {
  const result = await runInventoryOverviewFlow(prompt);
  const showLowStockFocus = result.promptSpec.focus === "low_stock";
  const lowStockRows = result.lowStockRows;
  const filterLabel = result.promptSpec.filterLabel;
  const filteredLabelLower = filterLabel?.toLowerCase();
  const answerBody = showLowStockFocus
    ? lowStockRows.length > 0
      ? filterLabel
        ? `${lowStockRows[0].product} is currently the lowest-stock SKU in the ${filteredLabelLower} view, and ${lowStockRows.length} ${filteredLabelLower} SKUs are flagged as low on available inventory right now.`
        : `${lowStockRows[0].product} is currently the lowest-stock SKU in the catalog, and ${lowStockRows.length} SKUs are flagged as low on available inventory right now.`
      : filterLabel
        ? `I filtered the catalog to ${filteredLabelLower}, and none of those SKUs are currently flagged as low on stock.`
        : "The current catalog does not have any SKUs flagged as low on stock right now."
    : filterLabel
      ? result.rowsToShow.length > 0
        ? `I filtered the live inventory to ${filteredLabelLower} and found ${result.rowsToShow.length} matching SKUs across ${result.rowsToShow.length} inventory summaries.`
        : `I filtered the live inventory to ${filteredLabelLower}, but there are no matching SKUs in the current catalog.`
      : `You currently have ${result.summarizedRows.length} sellable SKUs across ${result.inventory.length} inventory rows. ${result.lowStockRows.length} SKUs are currently flagged as low on available inventory.`;
  const answerTitle = showLowStockFocus
    ? filterLabel
      ? `${filterLabel} low-stock overview`
      : "Low-stock inventory overview"
    : filterLabel
      ? `${filterLabel} inventory overview`
      : "Current inventory overview";
  const primaryInsightTitle = showLowStockFocus
    ? filterLabel
      ? `${filterLabel} low-stock snapshot`
      : "Current low-stock snapshot"
    : filterLabel
      ? `${filterLabel} inventory status`
      : "Inventory status at a glance";
  const primaryMetric = showLowStockFocus
    ? `${lowStockRows.length} low-stock SKU${lowStockRows.length === 1 ? "" : "s"}`
    : filterLabel
      ? `${result.rowsToShow.length} matching SKU${result.rowsToShow.length === 1 ? "" : "s"}`
      : `${result.lowStockRows.length} low-stock SKUs`;
  const primaryExplanation = filterLabel
    ? `${result.sourceLabel} currently returns ${result.rowsToShow.length} SKU${result.rowsToShow.length === 1 ? "" : "s"} in the ${filteredLabelLower} slice.`
    : `${result.sourceLabel} currently covers ${result.summarizedRows.length} SKUs aggregated across active locations.`;
  const recommendedAction = showLowStockFocus
    ? "Review the highlighted SKUs first, then decide whether they need a reorder or closer warehouse-level inspection."
    : filterLabel
      ? `Use the filtered table below to inspect only ${filteredLabelLower} SKUs and compare their current coverage side by side.`
      : "Use the full table below to inspect coverage by SKU, then drill into low-stock items or regions as needed.";

  return {
    kind: "inventory_overview",
    answer: {
      title: answerTitle,
      body: answerBody,
      badge: getShopifyModeBadge(),
    },
    primaryCards: [
      {
        type: "insight",
        title: primaryInsightTitle,
        confidence: "High",
        metric: primaryMetric,
        explanation: primaryExplanation,
        recommendedAction,
      },
    ],
    secondaryCards: result.lowStockHighlights,
    tables: [
      {
        type: "inventory_table",
        title: showLowStockFocus
          ? filterLabel
            ? `${filterLabel} low-stock inventory`
            : "Low-stock inventory view"
          : filterLabel
            ? `${filterLabel} inventory`
            : "Inventory by SKU",
        sourceLabel: result.sourceLabel,
        rows: result.rowsToShow,
      },
    ],
    diagnostics: result.diagnostics,
    toolTrace: result.toolTrace,
  };
}

async function buildSourReorderResponse(): Promise<AgentUiResponse> {
  const result = await runSourCandyReorderFlow();
  const usingMockOrderFallback = result.orderDataSource === "mock-fallback";
  const diagnostics: DiagnosticsSummaryBlock = {
    title: "Reorder diagnostics",
    sources: [getShopifyModeBadge(), "Mock distributor data"],
    queryWindowLabel: result.salesWindow.label,
    counts: [
      { label: "Sour SKUs", value: result.sourProducts.length },
      { label: "Inventory rows", value: result.inventory.length },
      { label: "Orders", value: result.recentOrders.length },
      { label: "Risk rows", value: result.risks.length },
    ],
    notes: result.orderFallbackReason ? [result.orderFallbackReason] : undefined,
  };

  if (result.risks.length === 0) {
    return {
      kind: "sour_reorder",
      answer: {
        title: "Sour candy reorder check",
        body: "I couldn't find any sour candy SKUs in the active Shopify catalog yet. Sync the Kandwii seed products or switch back to mock mode to test the reorder workflow.",
        badge: getShopifyModeBadge(),
      },
      primaryCards: [],
      secondaryCards: [],
      tables: [
        {
          type: "risk_table",
          title: `Sour candy stockout risk for ${result.salesWindow.label}`,
          rows: [],
        },
      ],
      diagnostics,
      toolTrace: result.toolTrace,
    };
  }
  const primaryRisk = result.risks.find((risk) => risk.reorderNeeded) ?? result.risks[0];
  const reorderCount = result.risks.filter((risk) => risk.reorderNeeded).length;

  return {
    kind: "sour_reorder",
    answer: {
      title: "Sour candy reorder check",
      body: primaryRisk.reorderNeeded
        ? usingMockOrderFallback
          ? `Yes, with a caveat. Live Shopify inventory is in use, and ${primaryRisk.product} is projected to stock out in ${primaryRisk.daysUntilStockout.toFixed(1)} days against a ${primaryRisk.leadTimeDays}-day lead time. Recent sales velocity is temporarily using mock order history because the app is not yet approved for the Shopify Order object, so the reorder draft should be treated as provisional.`
          : `Yes. Sour candy is at risk. ${primaryRisk.product} is projected to stock out in ${primaryRisk.daysUntilStockout.toFixed(1)} days, while the distributor lead time is ${primaryRisk.leadTimeDays} days. I recommend drafting a reorder for ${primaryRisk.recommendedCases} cases.`
        : usingMockOrderFallback
          ? `Not yet. Live Shopify inventory shows coverage for now, and ${primaryRisk.product} is the closest watch item. Sales velocity is temporarily using mock order history because Shopify Order access is not approved for this app yet.`
          : `Not yet. Sour candy is still covered, but ${primaryRisk.product} is the closest watch item with roughly ${primaryRisk.daysUntilStockout.toFixed(1)} days of inventory left.`,
      badge: getShopifyModeBadge(),
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
    diagnostics,
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
  const diagnostics: DiagnosticsSummaryBlock = {
    title: "Warehouse diagnostics",
    sources: [getHybridOpsBadge(), "Mock fulfillment centers", "Mock issue events"],
    counts: [
      { label: "Centers", value: result.regionalCards.length },
      { label: "Issue rows", value: result.delayedIssuesTable.length },
      { label: "Delayed shipments", value: result.totalDelayedShipments },
    ],
  };

  return {
    kind: "warehouse_health",
    answer: {
      title: "Global warehouse / fulfillment issues",
      body: hottestCenter
        ? `${hottestCenter.label} is the warehouse that needs the most attention right now. Across the network there are ${result.totalDelayedShipments} delayed shipments, ${result.totalStuckFulfillments} stuck fulfillment events, and average fulfillment time is ${result.averageFulfillmentHours} hours.`
        : `Warehouse health is stable overall, with no single fulfillment center standing out as the primary risk.`,
      badge: getHybridOpsBadge(),
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
    diagnostics,
    toolTrace: result.toolTrace,
  };
}

function buildHelpResponse(traceEntry: AgentToolTraceEntry): AgentUiResponse {
  return {
    kind: "unsupported",
    answer: {
      title: "Kandwii helps with store operations questions",
      body: "Ask Kandwii about sales performance, inventory visibility, stock risk, and warehouse or fulfillment health. It works best when you phrase the question like an operations task you want answered with tables, cards, and recommendations.",
      badge: "How to use Kandwii",
    },
    primaryCards: [
      {
        type: "insight",
        title: "Best first questions to ask",
        confidence: "High",
        metric: "Sales, Inventory, Operations",
        explanation:
          "Kandwii is strongest when you ask about what is selling, what inventory looks risky, and where operational bottlenecks are emerging.",
        recommendedAction:
          "Start with one of the suggested prompts below, then branch into inventory and sales follow-up questions from there.",
      },
    ],
    secondaryCards: [],
    tables: [],
    diagnostics: {
      title: "Help diagnostics",
      sources: ["Product onboarding"],
      counts: [{ label: "Supported workflow families", value: 4 }],
    },
    toolTrace: [traceEntry],
    suggestedPrompts: [
      "Which candy is performing best?",
      "What does our inventory look like?",
      "Do we need to reorder sour candy?",
      "Where is fulfillment getting stuck?",
    ],
  };
}

function buildUnsupportedResponse(traceEntry: AgentToolTraceEntry): AgentUiResponse {
  return {
    kind: "unsupported",
    answer: {
      title: "This demo supports four store-ops question families today",
      body: "I can currently help with sales performance, inventory visibility, sour candy reorder or stockout checks, and global warehouse or fulfillment issues. Try one of the suggested prompts below to stay inside the supported workflows.",
      badge: "Demo scope",
    },
    primaryCards: [],
    secondaryCards: [],
    tables: [],
    diagnostics: {
      title: "Routing diagnostics",
      sources: ["Intent router"],
      counts: [{ label: "Supported workflow families", value: 4 }],
    },
    toolTrace: [traceEntry],
    suggestedPrompts: [
      "Which candy is performing best?",
      "What does our inventory look like?",
      "Do we need to reorder sour candy?",
      "Show me warehouse issues globally.",
    ],
  };
}

async function runDeterministicFallback(prompt: string): Promise<AgentUiResponse> {
  const intentDecision = await routeAgentIntent(prompt);
  let response: AgentUiResponse | null = null;

  if (intentDecision.intent === "best_sellers") {
    response = await buildBestSellersResponse(prompt);
  }

  if (intentDecision.intent === "inventory_overview") {
    response = await buildInventoryOverviewResponse(prompt);
  }

  if (intentDecision.intent === "sour_reorder") {
    response = await buildSourReorderResponse();
  }

  if (intentDecision.intent === "warehouse_health") {
    response = await buildWarehouseHealthResponse();
  }

  if (response) {
    return {
      ...response,
      toolTrace: [intentDecision.traceEntry, ...response.toolTrace],
    };
  }

  return isHelpPrompt(prompt)
    ? buildHelpResponse(intentDecision.traceEntry)
    : buildUnsupportedResponse(intentDecision.traceEntry);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { prompt?: string };
  const prompt = body.prompt?.trim() ?? "";

  if (hasLlmRoutingConfig()) {
    try {
      const agentResponse = await runAgentLoop(prompt);
      return NextResponse.json(agentResponse);
    } catch (error) {
      console.error("Agent loop failed, falling back to deterministic:", error);
      const fallbackResponse = await runDeterministicFallback(prompt);
      return NextResponse.json(fallbackResponse);
    }
  }

  const fallbackResponse = await runDeterministicFallback(prompt);
  return NextResponse.json(fallbackResponse);
}
