"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/layout/chat-panel";
import { WorkspacePanel } from "@/components/layout/workspace-panel";
import type { AgentUiResponse } from "@/types/agentUi";

const BEST_SELLERS_PROMPT = "What were our best-selling candies last month?";
const SOUR_REORDER_PROMPT = "Do we need to reorder sour candy?";
const WAREHOUSE_PROMPT = "Show me warehouse issues globally.";

export function BestSellersShell() {
  const [prompt, setPrompt] = useState(BEST_SELLERS_PROMPT);
  const [result, setResult] = useState<AgentUiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function runPrompt(nextPrompt = prompt) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: nextPrompt }),
      });

      const payload = (await response.json()) as AgentUiResponse | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Failed to run prompt.");
      }

      setResult(payload);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <ChatPanel
        prompt={prompt}
        onPromptChange={setPrompt}
        onRunPrompt={() => void runPrompt()}
        onUseBestSellersPrompt={() => {
          setPrompt(BEST_SELLERS_PROMPT);
          void runPrompt(BEST_SELLERS_PROMPT);
        }}
        onUseSourReorderPrompt={() => {
          setPrompt(SOUR_REORDER_PROMPT);
          void runPrompt(SOUR_REORDER_PROMPT);
        }}
        onUseWarehousePrompt={() => {
          setPrompt(WAREHOUSE_PROMPT);
          void runPrompt(WAREHOUSE_PROMPT);
        }}
        answer={result?.answer.body ?? null}
        error={error}
        isLoading={isLoading}
      />
      <WorkspacePanel result={result} />
    </div>
  );
}
