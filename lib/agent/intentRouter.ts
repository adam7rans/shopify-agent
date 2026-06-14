import { routeIntentDeterministically } from "@/lib/agent/deterministicIntentRouter";
import {
  hasLlmRoutingConfig,
  LlmRoutingError,
  routeIntentWithLlm,
} from "@/lib/agent/llmIntentRouter";
import type { AgentIntentDecision } from "@/lib/agent/types";

function buildSanitizedFallbackSummary(error: LlmRoutingError, fallbackIntent: string) {
  const providerMarker = [error.status, error.providerCode ?? error.providerType]
    .filter(Boolean)
    .join(" ");
  const providerMessage = error.sanitizedProviderMessage
    ? ` ${error.sanitizedProviderMessage}`
    : "";

  return `LLM routing attempted but OpenAI returned ${providerMarker || "an error"}.${providerMessage} Falling back to deterministic routing for "${fallbackIntent}".`;
}

export async function routeAgentIntent(prompt: string): Promise<AgentIntentDecision> {
  if (!hasLlmRoutingConfig()) {
    return routeIntentDeterministically(prompt);
  }

  try {
    return await routeIntentWithLlm(prompt);
  } catch (error) {
    const fallbackDecision = routeIntentDeterministically(prompt);
    const fallbackError =
      error instanceof LlmRoutingError
        ? error
        : new LlmRoutingError({
            message: error instanceof Error ? error.message : "Unknown LLM routing error.",
          });

    return {
      ...fallbackDecision,
      traceEntry: {
        toolName: "agent_intent_router",
        input: {
          mode: "llm_fallback",
          fallbackMode: "deterministic",
          status: fallbackError.status ?? "unknown",
          providerCode: fallbackError.providerCode ?? "unknown",
          providerType: fallbackError.providerType ?? "unknown",
        },
        outputSummary: buildSanitizedFallbackSummary(fallbackError, fallbackDecision.intent),
      },
    };
  }
}
