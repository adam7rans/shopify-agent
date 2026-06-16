import OpenAI from "openai";
import { agentTools } from "@/lib/agent/toolDefinitions";
import { executeTool } from "@/lib/agent/toolExecutors";
import { getSystemPrompt } from "@/lib/agent/systemPrompt";
import { validateAndNormalizeResponse } from "@/lib/agent/responseValidator";
import type { AgentUiResponse, AgentToolTraceEntry } from "@/types/agentUi";

const MAX_ITERATIONS = 12;

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

export async function runAgentLoop(prompt: string): Promise<AgentUiResponse> {
  const client = getOpenAiClient();
  const model = getModel();
  const toolTrace: AgentToolTraceEntry[] = [];

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: getSystemPrompt() },
    { role: "user", content: prompt },
  ];

  toolTrace.push({
    toolName: "agent_loop_start",
    input: { model, prompt: prompt.slice(0, 80) },
    outputSummary: `Starting agentic tool-calling loop with ${model}.`,
  });

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
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

      const toolResults = await Promise.all(
        toolCalls
          .filter((tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall => tc.type === "function")
          .map(async (toolCall) => {
            const args = JSON.parse(toolCall.function.arguments) as Record<
              string,
              unknown
            >;

            const result = await executeTool(toolCall.function.name, args);

            toolTrace.push({
              toolName: toolCall.function.name,
              input: args as Record<string, string | number>,
              outputSummary: summarizeToolResult(toolCall.function.name, result),
            });

            return {
              role: "tool" as const,
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            };
          }),
      );

      messages.push(...toolResults);
      continue;
    }

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
      return parsed;
    }

    return buildFallbackResponse(content, toolTrace);
  }

  return buildFallbackResponse(
    "The agent reached the maximum number of tool-calling iterations without producing a final response.",
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

function buildFallbackResponse(
  content: string,
  toolTrace: AgentToolTraceEntry[],
): AgentUiResponse {
  return {
    kind: "general",
    answer: {
      title: "Agent response",
      body: content.slice(0, 500),
    },
    primaryCards: [],
    secondaryCards: [],
    tables: [],
    toolTrace,
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

  return `Tool ${toolName} completed successfully.`;
}
