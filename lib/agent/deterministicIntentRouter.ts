import { isBestSellersPrompt } from "@/lib/tools/bestSellers";
import { isInventoryOverviewPrompt } from "@/lib/tools/inventoryOverview";
import { isSourReorderPrompt } from "@/lib/tools/reorderSourCandy";
import { isWarehouseHealthPrompt } from "@/lib/tools/warehouseHealth";
import type { AgentIntentDecision } from "@/lib/agent/types";

export function routeIntentDeterministically(prompt: string): AgentIntentDecision {
  const normalizedPrompt = prompt.trim();

  if (isBestSellersPrompt(normalizedPrompt)) {
    return {
      intent: "best_sellers",
      source: "deterministic",
      traceEntry: {
        toolName: "agent_intent_router",
        input: { mode: "deterministic", prompt: normalizedPrompt },
        outputSummary:
          'Matched the prompt to the "best_sellers" intent using deterministic aliases.',
      },
    };
  }

  if (isInventoryOverviewPrompt(normalizedPrompt)) {
    return {
      intent: "inventory_overview",
      source: "deterministic",
      traceEntry: {
        toolName: "agent_intent_router",
        input: { mode: "deterministic", prompt: normalizedPrompt },
        outputSummary:
          'Matched the prompt to the "inventory_overview" intent using deterministic aliases.',
      },
    };
  }

  if (isSourReorderPrompt(normalizedPrompt)) {
    return {
      intent: "sour_reorder",
      source: "deterministic",
      traceEntry: {
        toolName: "agent_intent_router",
        input: { mode: "deterministic", prompt: normalizedPrompt },
        outputSummary: 'Matched the prompt to the "sour_reorder" intent using deterministic aliases.',
      },
    };
  }

  if (isWarehouseHealthPrompt(normalizedPrompt)) {
    return {
      intent: "warehouse_health",
      source: "deterministic",
      traceEntry: {
        toolName: "agent_intent_router",
        input: { mode: "deterministic", prompt: normalizedPrompt },
        outputSummary:
          'Matched the prompt to the "warehouse_health" intent using deterministic aliases.',
      },
    };
  }

  return {
    intent: "unsupported",
    source: "deterministic",
    traceEntry: {
      toolName: "agent_intent_router",
      input: { mode: "deterministic", prompt: normalizedPrompt },
      outputSummary:
        "No deterministic alias matched the prompt, so the request remains unsupported.",
    },
  };
}
