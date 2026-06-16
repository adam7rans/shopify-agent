import type { AgentToolTraceEntry } from "@/types/agentUi";

export type AgentIntent =
  | "best_sellers"
  | "inventory_overview"
  | "sour_reorder"
  | "warehouse_health"
  | "unsupported";

export interface AgentIntentDecision {
  intent: AgentIntent;
  source: "llm" | "deterministic";
  traceEntry: AgentToolTraceEntry;
}
