import type { AgentIntent, AgentIntentDecision } from "@/lib/agent/types";

interface ChatCompletionsToolCall {
  function?: {
    name?: string;
  };
}

interface ChatCompletionsChoice {
  message?: {
    tool_calls?: ChatCompletionsToolCall[];
  };
}

interface ChatCompletionsResponse {
  choices?: ChatCompletionsChoice[];
}

interface OpenAiErrorPayload {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

const intentToolMap = {
  route_best_sellers: "best_sellers",
  route_inventory_overview: "inventory_overview",
  route_sour_reorder: "sour_reorder",
  route_warehouse_health: "warehouse_health",
  route_unsupported: "unsupported",
} satisfies Record<string, AgentIntent>;

export class LlmRoutingError extends Error {
  status?: number;
  providerCode?: string;
  providerType?: string;
  sanitizedProviderMessage?: string;

  constructor(options: {
    message: string;
    status?: number;
    providerCode?: string;
    providerType?: string;
    sanitizedProviderMessage?: string;
  }) {
    super(options.message);
    this.name = "LlmRoutingError";
    this.status = options.status;
    this.providerCode = options.providerCode;
    this.providerType = options.providerType;
    this.sanitizedProviderMessage = options.sanitizedProviderMessage;
  }
}

function isIntentToolName(toolName: string): toolName is keyof typeof intentToolMap {
  return toolName in intentToolMap;
}

function getOpenAiBaseUrl() {
  return (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
}

function getOpenAiModel() {
  return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
}

function sanitizeProviderMessage(message?: string) {
  if (!message) {
    return undefined;
  }

  const normalized = message
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/exceeded your current quota/i.test(normalized)) {
    return "Quota exceeded; check plan or billing.";
  }

  if (/rate limit/i.test(normalized)) {
    return "Rate limit reached; retry later.";
  }

  return normalized.slice(0, 120);
}

export function hasLlmRoutingConfig() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function routeIntentWithLlm(prompt: string): Promise<AgentIntentDecision> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch(`${getOpenAiBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getOpenAiModel(),
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You route ecommerce operations prompts to one existing intent. Always choose exactly one tool. Best sellers is for popularity, top sellers, recent sales, or time-window sales questions. Inventory overview is for inventory visibility, stock tables, or low-stock SKU questions. Sour reorder is for sour candy reorder or stockout questions. Warehouse health is for global fulfillment, delays, or warehouse problems. Unsupported is for anything else.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "route_best_sellers",
            description:
              "Use for best-selling, most popular, recent sales, top 10 sellers, or time-window candy performance questions.",
            parameters: { type: "object", properties: {}, additionalProperties: false },
          },
        },
        {
          type: "function",
          function: {
            name: "route_inventory_overview",
            description:
              "Use for inventory visibility, inventory tables, low-stock SKU questions, or current stock level questions.",
            parameters: { type: "object", properties: {}, additionalProperties: false },
          },
        },
        {
          type: "function",
          function: {
            name: "route_sour_reorder",
            description:
              "Use for sour candy reorder, stockout risk, or sour candy inventory-risk questions.",
            parameters: { type: "object", properties: {}, additionalProperties: false },
          },
        },
        {
          type: "function",
          function: {
            name: "route_warehouse_health",
            description:
              "Use for global warehouse issues, fulfillment delays, or warehouse health questions.",
            parameters: { type: "object", properties: {}, additionalProperties: false },
          },
        },
        {
          type: "function",
          function: {
            name: "route_unsupported",
            description:
              "Use when the prompt does not fit best sellers, sour reorder, or warehouse health.",
            parameters: { type: "object", properties: {}, additionalProperties: false },
          },
        },
      ],
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    let providerCode: string | undefined;
    let providerType: string | undefined;
    let providerMessage: string | undefined;

    try {
      const payload = (await response.json()) as OpenAiErrorPayload;
      providerCode = payload.error?.code;
      providerType = payload.error?.type;
      providerMessage = sanitizeProviderMessage(payload.error?.message);
    } catch {
      providerMessage = undefined;
    }

    throw new LlmRoutingError({
      message: "OpenAI routing request failed.",
      status: response.status,
      providerCode,
      providerType,
      sanitizedProviderMessage: providerMessage,
    });
  }

  const payload = (await response.json()) as ChatCompletionsResponse;
  const toolName = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.name;
  const intent = toolName && isIntentToolName(toolName) ? intentToolMap[toolName] : undefined;

  if (!intent) {
    throw new LlmRoutingError({
      message: "LLM routing attempted but OpenAI did not return a supported tool call. Falling back to deterministic routing.",
    });
  }

  return {
    intent,
    source: "llm",
    traceEntry: {
      toolName: "agent_intent_router",
      input: {
        mode: "llm",
        model: getOpenAiModel(),
      },
      outputSummary: `LLM intent router selected "${intent}" for the incoming prompt.`,
    },
  };
}
