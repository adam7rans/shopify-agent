import type { AgentUiResponse, AgentCardBlock, AgentTableBlock } from "@/types/agentUi";

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
]);

const VALID_TABLE_TYPES = new Set([
  "product_table",
  "risk_table",
  "inventory_table",
  "issue_table",
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
  if (!Array.isArray(table.rows)) return false;
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
    ? raw.tables.filter(isValidTable)
    : [];

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
    toolTrace,
    diagnostics: isRecord(raw.diagnostics)
      ? (raw.diagnostics as unknown as AgentUiResponse["diagnostics"])
      : undefined,
    suggestedPrompts: Array.isArray(raw.suggestedPrompts)
      ? raw.suggestedPrompts.filter((s): s is string => typeof s === "string")
      : undefined,
  };
}
