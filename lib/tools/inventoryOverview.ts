import { getShopifyClient } from "@/lib/shopify";
import { getShopifyModeBadge } from "@/lib/shopify/mode";
import type { InventoryLevel, Product } from "@/types/domain";
import type {
  AgentCardBlock,
  DiagnosticsSummaryBlock,
  InventoryTableRow,
} from "@/types/agentUi";
import type { ToolTraceEntry } from "@/lib/tools/bestSellers";

export interface InventoryPromptSpec {
  focus: "all_inventory" | "low_stock";
  category?: string;
  countryOfOrigin?: string;
  tag?: string;
  filterLabel?: string;
}

export interface InventorySummaryRow extends InventoryTableRow {
  status: "low" | "healthy";
}

function normalizeInventoryPrompt(prompt: string) {
  return prompt
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isInventoryOverviewPrompt(prompt: string) {
  const normalized = normalizeInventoryPrompt(prompt);

  return [
    "what does our inventory look like",
    "show me our inventory",
    "which skus are low on stock",
    "show inventory",
    "show me inventory",
    "what inventory is low",
  ].some((entry) => entry === normalized);
}

export function resolveInventoryPromptSpec(prompt: string): InventoryPromptSpec {
  const normalized = normalizeInventoryPrompt(prompt);
  const lowStockPhrases = ["low on stock", "what inventory is low", "which skus are low"];

  return {
    focus: lowStockPhrases.some((phrase) => normalized.includes(phrase))
      ? "low_stock"
      : "all_inventory",
  };
}

function normalizeValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looselyMatchesValue(actualValue: string, expectedValue: string) {
  const normalizedActual = normalizeValue(actualValue);
  const normalizedExpected = normalizeValue(expectedValue);

  return (
    normalizedActual === normalizedExpected ||
    normalizedActual.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedActual)
  );
}

function resolveInventoryFilters(
  prompt: string,
  products: Product[],
): Pick<InventoryPromptSpec, "category" | "countryOfOrigin" | "tag" | "filterLabel"> {
  const normalizedPrompt = normalizeInventoryPrompt(prompt);
  const categories = Array.from(new Set(products.map((product) => product.category))).sort(
    (left, right) => right.length - left.length,
  );
  const matchedCategory = categories.find((category) =>
    normalizedPrompt.includes(normalizeValue(category)),
  );

  let countryOfOrigin: string | undefined;
  let countryLabel: string | undefined;

  if (normalizedPrompt.includes("japanese") || normalizedPrompt.includes("japan")) {
    countryOfOrigin = "Japan";
    countryLabel = "Japanese";
  } else if (normalizedPrompt.includes("korean") || normalizedPrompt.includes("korea")) {
    countryOfOrigin = "Korea";
    countryLabel = "Korean";
  }

  const tags = Array.from(new Set(products.flatMap((product) => product.tags))).sort(
    (left, right) => right.length - left.length,
  );
  const matchedTag = tags.find((tag) => {
    const normalizedTag = normalizeValue(tag);
    return (
      normalizedPrompt.includes(normalizedTag) ||
      normalizedPrompt.includes(normalizedTag.endsWith("s") ? normalizedTag.slice(0, -1) : `${normalizedTag}s`)
    );
  });

  const filterLabel =
    matchedCategory ??
    (countryLabel && matchedTag ? `${countryLabel} ${matchedTag}` : undefined) ??
    countryLabel ??
    matchedTag;

  return {
    category: matchedCategory,
    countryOfOrigin,
    tag: matchedTag,
    filterLabel,
  };
}

export async function get_inventory_products() {
  return getShopifyClient().getProducts();
}

export async function get_inventory_levels() {
  return getShopifyClient().getInventory();
}

function regionsLabel(rows: InventoryLevel[]) {
  return Array.from(new Set(rows.map((row) => row.region))).join(", ");
}

export function summarizeInventory(
  inventory: InventoryLevel[],
  products: Product[],
  promptSpec?: InventoryPromptSpec,
): InventorySummaryRow[] {
  const productsBySku = new Map(
    products.flatMap((product) =>
      product.variants.map((variant) => [variant.sku, product] as const),
    ),
  );
  const grouped = new Map<string, InventoryLevel[]>();

  for (const row of inventory) {
    const existing = grouped.get(row.sku) ?? [];
    existing.push(row);
    grouped.set(row.sku, existing);
  }

  const totals = Array.from(grouped.entries())
    .map(([sku, rows]) => {
      const product = productsBySku.get(sku);
      if (product && promptSpec && !matchesInventoryFilter(product, promptSpec)) {
        return null;
      }

      if (!product && promptSpec?.filterLabel) {
        return null;
      }

      const availableInventory = rows.reduce((sum, row) => sum + row.available, 0);
      const committedInventory = rows.reduce((sum, row) => sum + row.committed, 0);
      const incomingInventory = rows.reduce((sum, row) => sum + row.incoming, 0);
      const onHandInventory = rows.reduce((sum, row) => sum + row.onHand, 0);

      return {
        product: product?.title ?? sku,
        sku,
        category: product?.category ?? "Unknown",
        regions: regionsLabel(rows),
        locations: rows.length,
        availableInventory,
        committedInventory,
        incomingInventory,
        onHandInventory,
        status: "healthy" as const,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const thresholdIndex = Math.max(Math.ceil(totals.length * 0.2) - 1, 0);
  const sortedAvailable = totals
    .map((row) => row.availableInventory)
    .sort((a, b) => a - b);
  const dynamicThreshold = sortedAvailable[thresholdIndex] ?? 24;
  const lowStockThreshold = Math.max(24, dynamicThreshold);

  return totals
    .map<InventorySummaryRow>((row) => ({
      ...row,
      status: row.availableInventory <= lowStockThreshold ? "low" : "healthy",
    }))
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "low" ? -1 : 1;
      }

      if (a.availableInventory !== b.availableInventory) {
        return a.availableInventory - b.availableInventory;
      }

      return a.product.localeCompare(b.product);
    });
}

function matchesInventoryFilter(product: Product, promptSpec: InventoryPromptSpec) {
  if (
    promptSpec.category &&
    !looselyMatchesValue(product.category, promptSpec.category)
  ) {
    return false;
  }

  if (
    promptSpec.countryOfOrigin &&
    !looselyMatchesValue(product.countryOfOrigin, promptSpec.countryOfOrigin)
  ) {
    return false;
  }

  const tagFilter = promptSpec.tag;
  if (
    tagFilter &&
    !product.tags.some((tag) => normalizeValue(tag) === normalizeValue(tagFilter))
  ) {
    return false;
  }

  return true;
}

export function buildInventoryHighlights(rows: InventorySummaryRow[]): AgentCardBlock[] {
  return rows
    .filter((row) => row.status === "low")
    .slice(0, 3)
    .map((row) => ({
      type: "inventory_highlight",
      title: row.product,
      sku: row.sku,
      availableInventory: row.availableInventory,
      onHandInventory: row.onHandInventory,
      locationCount: row.locations,
      regionsLabel: row.regions,
      status: "low",
      note: `${row.product} is one of the lowest-stock SKUs in the active catalog.`,
    }));
}

export async function runInventoryOverviewFlow(prompt: string) {
  const products = await get_inventory_products();
  const basePromptSpec = resolveInventoryPromptSpec(prompt);
  const filterSpec = resolveInventoryFilters(prompt, products.products);
  const promptSpec: InventoryPromptSpec = {
    ...basePromptSpec,
    ...filterSpec,
  };
  const inventory = await get_inventory_levels();
  const summarizedRows = summarizeInventory(inventory.inventory, products.products, promptSpec);
  const lowStockRows = summarizedRows.filter((row) => row.status === "low");
  const rowsToShow = promptSpec.focus === "low_stock" ? lowStockRows : summarizedRows;
  const appliedFilterLabel = promptSpec.filterLabel;
  const filteredProductsCount = summarizedRows.length;

  const diagnostics: DiagnosticsSummaryBlock = {
    title: "Inventory data summary",
    sources: [`${getShopifyModeBadge()} inventory`, `${getShopifyModeBadge()} catalog`],
    counts: [
      { label: "Inventory rows", value: inventory.inventory.length },
      { label: "Catalog SKUs", value: summarizedRows.length },
      { label: "Low-stock SKUs", value: lowStockRows.length },
    ],
    notes: [
      ...(appliedFilterLabel
        ? [`Applied inventory filter: ${appliedFilterLabel}.`]
        : []),
      promptSpec.focus === "low_stock"
        ? "The low-stock view prioritizes the lowest-available SKUs in the current catalog."
        : "Inventory is aggregated by SKU across active locations before ranking and display.",
    ],
  };

  const toolTrace: ToolTraceEntry[] = [
    {
      toolName: "get_shopify_inventory",
      input: { scope: "all active locations" },
      outputSummary: `Loaded ${inventory.inventory.length} inventory rows from the Shopify adapter.`,
    },
    {
      toolName: "get_shopify_products",
      input: { scope: "catalog metadata" },
      outputSummary: `Loaded ${products.products.length} products from the Shopify adapter for category and title mapping.`,
    },
    {
      toolName: "summarize_inventory_overview",
      input: {
        focus: promptSpec.focus,
        ...(promptSpec.category ? { category: promptSpec.category } : {}),
        ...(promptSpec.countryOfOrigin
          ? { countryOfOrigin: promptSpec.countryOfOrigin }
          : {}),
        ...(promptSpec.tag ? { tag: promptSpec.tag } : {}),
      },
      outputSummary:
        promptSpec.focus === "low_stock"
          ? `Ranked ${lowStockRows.length} low-stock SKUs${appliedFilterLabel ? ` within ${appliedFilterLabel}` : ""} and prepared the lowest-risk highlights.`
          : appliedFilterLabel
            ? `Filtered the inventory table to ${filteredProductsCount} ${appliedFilterLabel.toLowerCase()} SKU${filteredProductsCount === 1 ? "" : "s"}.`
            : `Aggregated ${summarizedRows.length} catalog SKUs into an inventory overview table.`,
    },
  ];

  return {
    promptSpec,
    products: products.products,
    inventory: inventory.inventory,
    summarizedRows,
    lowStockRows,
    rowsToShow,
    lowStockHighlights: buildInventoryHighlights(rowsToShow),
    diagnostics,
    toolTrace,
    sourceLabel: `${getShopifyModeBadge()} inventory`,
  };
}
