import { NextResponse } from "next/server";
import { runAgentLoop } from "@/lib/agent/agentLoop";
import { hasAgentConfig } from "@/lib/agent/config";
import { enhanceAgentResponse } from "@/lib/charts/enhanceAgentResponse";
import type { AgentUiResponse } from "@/types/agentUi";

const SUGGESTED_PROMPTS = [
  "Which candy is performing best?",
  "What does our inventory look like?",
  "Do we need to reorder sour candy?",
  "Where is fulfillment getting stuck?",
];

function buildAgentFailureResponse(
  title: string,
  body: string,
): AgentUiResponse {
  return {
    kind: "general",
    answer: {
      title,
      body,
    },
    primaryCards: [],
    secondaryCards: [],
    tables: [],
    toolTrace: [
      {
        toolName: "agent_route_failure",
        input: { mode: "json" },
        outputSummary: body,
      },
    ],
    suggestedPrompts: SUGGESTED_PROMPTS,
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as { prompt?: string };
  const prompt = body.prompt?.trim() ?? "";

  if (!prompt) {
    return NextResponse.json(
      buildAgentFailureResponse(
        "Ask Kandwii a store question",
        "Try a question about sales, inventory, reorder risk, fulfillment health, Liquid generation, or supplier documents.",
      ),
      { status: 400 },
    );
  }

  if (!hasAgentConfig()) {
    return NextResponse.json(
      buildAgentFailureResponse(
        "Kandwii needs OpenAI configured",
        "This build now runs fully through the agent loop. Add OPENAI_API_KEY before using the agent routes.",
      ),
      { status: 503 },
    );
  }

  try {
    const agentResponse = await runAgentLoop(prompt);
    return NextResponse.json(enhanceAgentResponse(agentResponse));
  } catch (error) {
    console.error("Agent route failed:", error);
    return NextResponse.json(
      buildAgentFailureResponse(
        "Kandwii hit an agent error",
        error instanceof Error
          ? error.message
          : "The agent loop failed before it could produce a response.",
      ),
      { status: 500 },
    );
  }
}
