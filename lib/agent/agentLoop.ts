import OpenAI from "openai";
import { agentTools } from "@/lib/agent/toolDefinitions";
import { executeTool } from "@/lib/agent/toolExecutors";
import { getSystemPrompt } from "@/lib/agent/systemPrompt";
import { validateAndNormalizeResponse } from "@/lib/agent/responseValidator";
import type { AgentUiResponse, AgentToolTraceEntry } from "@/types/agentUi";
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
  if (args.date_range) parts.push(`range: ${args.date_range}`);
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
): Promise<AgentUiResponse> {
  const client = getOpenAiClient();
  const model = getModel();
  const toolTrace: AgentToolTraceEntry[] = [];
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

            log(toolIcon, `${toolLabel}${argsDesc}`);

            const result = await executeTool(toolCall.function.name, args);

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
              content: JSON.stringify(result),
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
      parsed.toolTrace = [
        ...toolTrace,
        {
          toolName: "agent_loop_complete",
          input: { iterations: iteration + 1 },
          outputSummary: `Agent completed in ${iteration + 1} iteration(s) with ${toolTrace.length} tool calls.`,
        },
      ];
      log("✅", `Done — ${iteration + 1} iteration(s), ${toolTrace.length} tool calls`, `Completed in ${elapsed().toFixed(1)}s`);
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
