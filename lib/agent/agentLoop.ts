import OpenAI from "openai";
import { agentTools } from "@/lib/agent/toolDefinitions";
import { executeTool } from "@/lib/agent/toolExecutors";
import { getSystemPrompt } from "@/lib/agent/systemPrompt";
import { validateAndNormalizeResponse } from "@/lib/agent/responseValidator";
import {
  buildCacheKey,
  getCachedResult,
  setCachedResult,
} from "@/lib/agent/toolCache";
import type { AgentUiResponse, AgentToolTraceEntry, AgentTableBlock } from "@/types/agentUi";
import type { ActivityLogEntry } from "@/types/activityLog";

const MAX_ITERATIONS = 12;

export type LogCallback = (entry: ActivityLogEntry) => void;

const TOOL_ICONS: Record<string, string> = {
  search_products: "🔍",
  get_inventory: "📦",
  get_sales_data: "📊",
  check_reorder_risk: "⚠️",
  get_warehouse_health: "🏭",
  get_distributor_availability: "🚚",
  list_documents: "📄",
  parse_document: "📄",
};

const TOOL_LABELS: Record<string, string> = {
  search_products: "Searching product catalog",
  get_inventory: "Fetching inventory levels",
  get_sales_data: "Pulling sales data",
  check_reorder_risk: "Calculating reorder risk",
  get_warehouse_health: "Checking warehouse health",
  get_distributor_availability: "Querying distributor availability",
  list_documents: "Listing available documents",
  parse_document: "Parsing PDF document",
};

function describeToolArgs(name: string, args: Record<string, unknown>): string {
  const parts: string[] = [];
  if (args.category) parts.push(`category: ${args.category}`);
  if (args.country) parts.push(`country: ${args.country}`);
  if (args.sku) parts.push(`SKU: ${args.sku}`);
  if (args.time_query) parts.push(`range: ${args.time_query}`);
  else if (args.date_range) parts.push(`range: ${args.date_range}`);
  if (args.start_date && args.end_date) parts.push(`${args.start_date} to ${args.end_date}`);
  if (args.region) parts.push(`region: ${args.region}`);
  if (args.severity) parts.push(`severity: ${args.severity}`);
  if (args.status) parts.push(`status: ${args.status}`);
  if (args.filename) parts.push(`file: ${args.filename}`);
  if (args.sort_by) parts.push(`sort: ${args.sort_by}`);
  if (args.limit) parts.push(`limit: ${args.limit}`);
  return parts.length > 0 ? ` (${parts.join(", ")})` : "";
}

function getOpenAiClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const baseURL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

  return new OpenAI({ apiKey, baseURL });
}

function getModel() {
  return process.env.OPENAI_MODEL ?? "gpt-4.1";
}

export async function runAgentLoop(
  prompt: string,
  onLog?: LogCallback,
  sessionId?: string,
): Promise<AgentUiResponse> {
  const responseKey = sessionId ? `__response:${prompt}` : null;
  if (sessionId && responseKey) {
    const cached = getCachedResult(sessionId, responseKey);
    if (cached) {
      const ageSec = Math.round(cached.ageMs / 1000);
      onLog?.({ icon: "⚡", message: `Returning cached response (${ageSec}s old)`, elapsed: 0 });
      return cached.result as AgentUiResponse;
    }
  }

  const client = getOpenAiClient();
  const model = getModel();
  const toolTrace: AgentToolTraceEntry[] = [];
  const storedToolResults = new Map<string, unknown>();
  const toolCallCounts = new Map<string, number>();
  const startTime = Date.now();

  function elapsed() {
    return (Date.now() - startTime) / 1000;
  }

  function log(icon: string, message: string, detail?: string) {
    onLog?.({ icon, message, detail, elapsed: elapsed() });
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: getSystemPrompt() },
    { role: "user", content: prompt },
  ];

  toolTrace.push({
    toolName: "agent_loop_start",
    input: { model, prompt: prompt.slice(0, 80) },
    outputSummary: `Starting agentic tool-calling loop with ${model}.`,
  });

  log("🤖", `Starting agent loop with ${model}`, "Sending prompt and tool definitions to OpenAI");

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    log("🤖", `Calling OpenAI API (iteration ${iteration + 1})`, "Waiting for the model to decide next action");

    const completion = await client.chat.completions.create({
      model,
      messages,
      tools: agentTools,
      tool_choice: iteration === 0 ? "auto" : "auto",
      temperature: 0.1,
    });

    const choice = completion.choices[0];
    if (!choice) {
      throw new Error("OpenAI returned no choices.");
    }

    const message = choice.message;
    messages.push(message);

    if (
      choice.finish_reason === "tool_calls" ||
      (message.tool_calls && message.tool_calls.length > 0)
    ) {
      const toolCalls = message.tool_calls ?? [];
      const toolNames = toolCalls
        .filter((tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall => tc.type === "function")
        .map((tc) => tc.function.name);

      log(
        "🤖",
        `OpenAI requested ${toolNames.length} tool${toolNames.length > 1 ? "s" : ""}: ${toolNames.join(", ")}`,
      );

      const toolResults = await Promise.all(
        toolCalls
          .filter((tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall => tc.type === "function")
          .map(async (toolCall) => {
            const args = JSON.parse(toolCall.function.arguments) as Record<
              string,
              unknown
            >;

            const toolIcon = TOOL_ICONS[toolCall.function.name] ?? "🔧";
            const toolLabel = TOOL_LABELS[toolCall.function.name] ?? toolCall.function.name;
            const argsDesc = describeToolArgs(toolCall.function.name, args);

            const cacheKey = sessionId
              ? buildCacheKey(toolCall.function.name, args)
              : null;
            const cached = sessionId && cacheKey
              ? getCachedResult(sessionId, cacheKey)
              : null;

            let result: unknown;
            if (cached) {
              result = cached.result;
              const ageSec = Math.round(cached.ageMs / 1000);
              log("⚡", `${toolLabel} — cached (${ageSec}s old)${argsDesc}`);
            } else {
              log(toolIcon, `${toolLabel}${argsDesc}`);
              result = await executeTool(toolCall.function.name, args, {
                userPrompt: prompt,
              });
              if (sessionId && cacheKey) {
                setCachedResult(sessionId, cacheKey, result);
              }
            }

            const callIndex = toolCallCounts.get(toolCall.function.name) ?? 0;
            toolCallCounts.set(toolCall.function.name, callIndex + 1);
            const refKey = callIndex === 0
              ? toolCall.function.name
              : `${toolCall.function.name}:${callIndex}`;
            storedToolResults.set(refKey, result);

            const summary = summarizeToolResult(toolCall.function.name, result);

            toolTrace.push({
              toolName: toolCall.function.name,
              input: args as Record<string, string | number>,
              outputSummary: summary,
            });

            log("✅", summary);

            return {
              role: "tool" as const,
              tool_call_id: toolCall.id,
              content: JSON.stringify(
                truncateToolResultForLLM(toolCall.function.name, result, refKey),
              ),
            };
          }),
      );

      messages.push(...toolResults);
      log("🤖", "Sending tool results back to OpenAI", "Model will analyze the data and decide next step");
      continue;
    }

    log("🤖", "OpenAI composing final response", "Model is building the structured UI response");

    const content = message.content ?? "";
    const parsed = parseAgentResponse(content);

    if (parsed) {
      resolveDataFromRefs(parsed, storedToolResults);
      parsed.toolTrace = [
        ...toolTrace,
        {
          toolName: "agent_loop_complete",
          input: { iterations: iteration + 1 },
          outputSummary: `Agent completed in ${iteration + 1} iteration(s) with ${toolTrace.length} tool calls.`,
        },
      ];
      log("✅", `Done — ${iteration + 1} iteration(s), ${toolTrace.length} tool calls`, `Completed in ${elapsed().toFixed(1)}s`);
      if (sessionId && responseKey) {
        setCachedResult(sessionId, responseKey, parsed);
      }
      return parsed;
    }

    log(
      "⚠️",
      "OpenAI returned invalid structured JSON",
      "Requesting one more pass in strict AgentUiResponse format",
    );
    messages.push({
      role: "system",
      content:
        "Your previous response was not valid AgentUiResponse JSON. Return only a valid JSON object that matches the schema exactly. Do not include markdown fences or prose outside the JSON object.",
    });
  }

  log("⚠️", "Reached maximum iterations without a valid final response");
  return buildEmergencyResponse(
    "Kandwii couldn't finish that request cleanly. Try again or narrow the prompt so the agent can complete the tool-calling loop.",
    toolTrace,
  );
}

function parseAgentResponse(content: string): AgentUiResponse | null {
  const trimmed = content.trim();

  let jsonString = trimmed;
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonString = fenceMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonString) as unknown;
    return validateAndNormalizeResponse(parsed);
  } catch {
    return null;
  }
}

function buildEmergencyResponse(
  content: string,
  toolTrace: AgentToolTraceEntry[],
): AgentUiResponse {
  return {
    kind: "general",
    answer: {
      title: "Kandwii couldn't finish that request",
      body: content.slice(0, 500),
    },
    primaryCards: [],
    secondaryCards: [],
    tables: [],
    toolTrace: [
      ...toolTrace,
      {
        toolName: "agent_loop_emergency_response",
        input: { reason: "invalid_final_response" },
        outputSummary:
          "Returned an emergency response after the agent loop ended without valid AgentUiResponse JSON.",
      },
    ],
    suggestedPrompts: [
      "Which candy is performing best?",
      "What does our inventory look like?",
      "Do we need to reorder sour candy?",
      "Where is fulfillment getting stuck?",
    ],
  };
}

const SAMPLE_ROW_COUNT = 3;
const ROW_TRUNCATION_THRESHOLD = 10;

function truncateToolResultForLLM(
  toolName: string,
  result: unknown,
  refKey: string,
): unknown {
  if (typeof result !== "object" || result === null) return result;
  const obj = result as Record<string, unknown>;

  const hasLargeRows = Array.isArray(obj.rows) && obj.rows.length > ROW_TRUNCATION_THRESHOLD;
  const hasLargeTimeSeries = Array.isArray(obj.timeSeries) && obj.timeSeries.length > 5;

  if (!hasLargeRows && !hasLargeTimeSeries) {
    return result;
  }

  if (toolName === "get_inventory" && hasLargeRows) {
    const rows = obj.rows as Record<string, unknown>[];
    const categories = new Set(rows.map((r) => r.category));
    const lowCount = rows.filter((r) => r.status === "low").length;
    return {
      ...obj,
      rows: `[truncated — ${rows.length} rows stored server-side]`,
      _dataRef: refKey,
      _summary: {
        totalRows: rows.length,
        categories: [...categories],
        lowStockCount: lowCount,
        sampleRows: rows.slice(0, SAMPLE_ROW_COUNT),
      },
      _instruction: `Use "dataFrom": "${refKey}" with "rows": [] in your inventory_table. The system will inject all ${rows.length} rows automatically.`,
    };
  }

  if (toolName === "get_sales_data") {
    const rows = obj.rows as Record<string, unknown>[];
    const timeSeries = Array.isArray(obj.timeSeries) ? obj.timeSeries as Record<string, unknown>[] : [];
    return {
      ...obj,
      rows: `[truncated — ${rows.length} rows stored server-side]`,
      timeSeries: timeSeries.length > 5
        ? `[truncated — ${timeSeries.length} data points stored server-side, first: ${JSON.stringify(timeSeries[0])}, last: ${JSON.stringify(timeSeries[timeSeries.length - 1])}]`
        : timeSeries,
      _dataRef: refKey,
      _summary: {
        totalRows: rows.length,
        sampleRows: rows.slice(0, SAMPLE_ROW_COUNT),
        timeSeriesPoints: timeSeries.length,
      },
      _instruction: `Use "dataFrom": "${refKey}" with "rows": [] in your product_table. The system will inject all ${rows.length} rows automatically. For charts, use the categoryBreakdown and summary fields directly — do not serialize rows or timeSeries.`,
    };
  }

  return result;
}

function resolveDataFromRefs(
  response: AgentUiResponse,
  storedResults: Map<string, unknown>,
) {
  const refCounts = new Map<string, number>();

  for (const table of response.tables) {
    const dataFrom = (table as AgentTableBlock & { dataFrom?: string }).dataFrom;
    if (!dataFrom) continue;
    if (table.rows && table.rows.length > 0) continue;

    let refKey = dataFrom;
    if (storedResults.has(refKey)) {
      // exact match
    } else {
      const baseName = refKey.replace(/:\d+$/, "");
      const idx = refCounts.get(baseName) ?? 0;
      refCounts.set(baseName, idx + 1);
      refKey = idx === 0 ? baseName : `${baseName}:${idx}`;
    }

    const toolResult = storedResults.get(refKey);
    if (!toolResult || typeof toolResult !== "object") continue;

    const raw = toolResult as Record<string, unknown>;
    const rows = raw.rows;
    if (!Array.isArray(rows)) continue;

    if (table.type === "inventory_table") {
      table.rows = rows.map((r: Record<string, unknown>) => ({
        product: String(r.product ?? ""),
        sku: String(r.sku ?? ""),
        category: String(r.category ?? ""),
        regions: String(r.regions ?? ""),
        locations: Number(r.locations ?? 1),
        availableInventory: Number(r.available ?? r.availableInventory ?? 0),
        committedInventory: Number(r.committed ?? r.committedInventory ?? 0),
        incomingInventory: Number(r.incoming ?? r.incomingInventory ?? 0),
        onHandInventory: Number(r.onHand ?? r.onHandInventory ?? 0),
      }));
    } else if (table.type === "product_table") {
      table.rows = rows.map((r: Record<string, unknown>) => ({
        product: String(r.product ?? ""),
        sku: String(r.sku ?? ""),
        category: String(r.category ?? ""),
        unitsSold: Number(r.unitsSold ?? 0),
        revenue: Number(r.revenue ?? 0),
        margin: Number(r.margin ?? 0),
      }));
    }

    if (!refCounts.has(dataFrom.replace(/:\d+$/, ""))) {
      refCounts.set(dataFrom.replace(/:\d+$/, ""), 1);
    }
  }

  const searchResult = storedResults.get("search_products");
  if (searchResult && typeof searchResult === "object") {
    const raw = searchResult as Record<string, unknown>;
    if (Array.isArray(raw.products)) {
      const products = raw.products as Record<string, unknown>[];
      const previewProducts = products.map((p) => ({
        title: String(p.title ?? ""),
        price: String(p.price ?? "0"),
        image: `/products/${String(p.handle ?? "placeholder")}.png`,
        handle: String(p.handle ?? ""),
        description: String(p.description ?? ""),
      }));

      const collectionTitle = products.length > 0
        ? String(products[0].category ?? "")
        : undefined;

      for (const cards of [response.primaryCards, response.secondaryCards]) {
        for (const card of cards) {
          if (card.type === "code" && card.language?.toLowerCase() === "liquid") {
            card.previewProducts = previewProducts;
            if (collectionTitle) card.collectionTitle = collectionTitle;
          }
        }
      }
    }
  }
}

function summarizeToolResult(toolName: string, result: unknown): string {
  if (typeof result !== "object" || result === null) {
    return `Tool ${toolName} returned a result.`;
  }

  const obj = result as Record<string, unknown>;

  if ("count" in obj && typeof obj.count === "number") {
    return `Returned ${obj.count} result(s).`;
  }

  if ("products" in obj && Array.isArray(obj.products)) {
    return `Found ${obj.products.length} product(s).`;
  }

  if ("rows" in obj && Array.isArray(obj.rows)) {
    return `Returned ${obj.rows.length} row(s).`;
  }

  if ("risks" in obj && Array.isArray(obj.risks)) {
    return `Analyzed ${obj.risks.length} product(s) for stockout risk.`;
  }

  if ("centers" in obj && Array.isArray(obj.centers)) {
    return `Returned data for ${obj.centers.length} fulfillment center(s).`;
  }

  if ("suppliers" in obj && Array.isArray(obj.suppliers)) {
    return `Found ${obj.suppliers.length} supplier record(s).`;
  }

  if ("documents" in obj && Array.isArray(obj.documents)) {
    return `Found ${obj.documents.length} document(s) available.`;
  }

  if ("text" in obj && typeof obj.text === "string") {
    return `Extracted ${obj.text.length} characters of text from document.`;
  }

  return `Tool ${toolName} completed successfully.`;
}
