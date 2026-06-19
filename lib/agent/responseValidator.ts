import type { AgentUiResponse, AgentCardBlock, AgentTableBlock, AgentChartBlock } from "@/types/agentUi";

const VALID_KINDS = new Set([
  "best_sellers",
  "sour_reorder",
  "warehouse_health",
  "inventory_overview",
  "general",
  "unsupported",
]);

const VALID_CARD_TYPES = new Set([
  "insight",
  "inventory_risk",
  "inventory_highlight",
  "reorder_draft",
  "warehouse_region",
  "text",
  "code",
  "invoice_processed",
  "draft_email",
  "action_button",
]);

const VALID_TABLE_TYPES = new Set([
  "product_table",
  "risk_table",
  "inventory_table",
  "issue_table",
]);

const VALID_CHART_TYPES = new Set([
  "pie_chart",
  "bar_chart",
  "line_chart",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidCard(card: unknown): card is AgentCardBlock {
  return isRecord(card) && typeof card.type === "string" && VALID_CARD_TYPES.has(card.type);
}

function isValidTable(table: unknown): table is AgentTableBlock {
  if (!isRecord(table)) return false;
  if (typeof table.type !== "string" || !VALID_TABLE_TYPES.has(table.type)) return false;
  if (typeof table.dataFrom === "string" && table.dataFrom.length > 0) return true;
  if (!Array.isArray(table.rows)) return false;
  return true;
}

function isValidChart(chart: unknown): chart is AgentChartBlock {
  if (!isRecord(chart)) return false;
  if (typeof chart.type !== "string" || !VALID_CHART_TYPES.has(chart.type)) return false;
  if (typeof chart.title !== "string") return false;
  if (chart.type === "pie_chart" && !Array.isArray(chart.segments)) return false;
  if (chart.type === "bar_chart" && !Array.isArray(chart.bars)) return false;
  if (chart.type === "line_chart" && !Array.isArray(chart.series)) return false;
  return true;
}

export function validateAndNormalizeResponse(
  raw: unknown,
): AgentUiResponse | null {
  if (!isRecord(raw)) return null;

  const answer = raw.answer;
  if (!isRecord(answer) || typeof answer.title !== "string" || typeof answer.body !== "string") {
    return null;
  }

  const kind = typeof raw.kind === "string" && VALID_KINDS.has(raw.kind)
    ? raw.kind
    : "general";

  const primaryCards = Array.isArray(raw.primaryCards)
    ? raw.primaryCards.filter(isValidCard)
    : [];

  const secondaryCards = Array.isArray(raw.secondaryCards)
    ? raw.secondaryCards.filter(isValidCard)
    : [];

  const tables = Array.isArray(raw.tables)
    ? raw.tables.filter(isValidTable).map((t) => {
        const table = t as AgentTableBlock & { dataFrom?: string };
        if (table.dataFrom && !Array.isArray(table.rows)) {
          (table as unknown as Record<string, unknown>).rows = [];
        }
        return table;
      })
    : [];

  const charts = Array.isArray(raw.charts)
    ? raw.charts.filter(isValidChart)
    : undefined;

  const toolTrace = Array.isArray(raw.toolTrace) ? raw.toolTrace : [];

  return {
    kind: kind as AgentUiResponse["kind"],
    answer: {
      title: answer.title,
      body: answer.body,
      badge: typeof answer.badge === "string" ? answer.badge : undefined,
    },
    primaryCards,
    secondaryCards,
    tables,
    charts: charts && charts.length > 0 ? charts : undefined,
    toolTrace,
    diagnostics: isRecord(raw.diagnostics)
      ? (raw.diagnostics as unknown as AgentUiResponse["diagnostics"])
      : undefined,
    suggestedPrompts: Array.isArray(raw.suggestedPrompts)
      ? raw.suggestedPrompts.filter((s): s is string => typeof s === "string")
      : undefined,
  };
}
