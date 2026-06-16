"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/layout/chat-panel";
import type {
  ConversationTurn,
  ShellMode,
  StarterPromptGroup,
} from "@/components/layout/shellTypes";
import { SidebarDock } from "@/components/layout/sidebar-dock";
import { WorkspacePanel } from "@/components/layout/workspace-panel";
import type { AgentUiResponse } from "@/types/agentUi";

const STARTER_PROMPT_GROUPS: StarterPromptGroup[] = [
  {
    id: "sales",
    label: "Sales",
    description: "Use Kandwii to surface top products and recent sales trends.",
    prompts: [
      "Which candy is performing best?",
      "What are our best-selling candies recently?",
      "Show the top 10 sellers over the past six months.",
    ],
    accent: "sales",
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Inspect live stock levels and quickly spot low-stock SKUs.",
    prompts: [
      "What does our inventory look like?",
      "Which SKUs are low on stock?",
      "Do we need to reorder sour candy?",
    ],
    accent: "inventory",
  },
  {
    id: "operations",
    label: "Operations",
    description: "Check fulfillment health while keeping warehouse ops data visible.",
    prompts: [
      "Where is fulfillment getting stuck?",
      "Show me warehouse issues globally.",
      "What is this app for?",
    ],
    accent: "operations",
  },
];

interface BestSellersShellProps {
  storeModeLabel: string;
  opsModeLabel: string;
}

function createTurnId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function BestSellersShell({
  storeModeLabel,
  opsModeLabel,
}: BestSellersShellProps) {
  const [mode, setMode] = useState<ShellMode>("user");
  const [prompt, setPrompt] = useState("");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function runPrompt(nextPrompt = prompt) {
    const trimmedPrompt = nextPrompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    const turnId = createTurnId();

    setIsSubmitting(true);
    setTurns((currentTurns) => [
      ...currentTurns,
      {
        id: turnId,
        prompt: trimmedPrompt,
        result: null,
        error: null,
        isLoading: true,
      },
    ]);
    setPrompt("");

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: trimmedPrompt }),
      });

      const payload = (await response.json()) as AgentUiResponse | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Failed to run prompt.");
      }

      setTurns((currentTurns) =>
        currentTurns.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                result: payload,
                error: null,
                isLoading: false,
              }
            : turn,
        ),
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Unknown error";

      setTurns((currentTurns) =>
        currentTurns.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                result: null,
                error: message,
                isLoading: false,
              }
            : turn,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleUsePrompt(nextPrompt: string) {
    setPrompt(nextPrompt);
    void runPrompt(nextPrompt);
  }

  const hasTurns = turns.length > 0;

  return (
    <div className="mx-auto min-h-full max-w-[1440px] pl-[88px] md:pl-[96px]">
      <SidebarDock mode={mode} onModeChange={setMode} currentRoute="home" />
      <section className="min-w-0">
        {hasTurns ? (
          <>
            <div className="mx-auto max-w-[1100px] pt-8 pb-44 md:pt-12 md:pb-48">
              <WorkspacePanel
                turns={turns}
                mode={mode}
                onUsePrompt={handleUsePrompt}
              />
            </div>
            {mode === "diagnostics" ? (
              <div className="pointer-events-none fixed right-4 bottom-24 z-20 flex flex-col items-end gap-2 md:right-6 md:bottom-28">
                <div className="rounded-full border border-plum/20 bg-white/90 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-plum shadow-panel backdrop-blur">
                  {storeModeLabel}
                </div>
                <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500 shadow-panel backdrop-blur">
                  {opsModeLabel}
                </div>
              </div>
            ) : null}
            <div className="fixed right-4 bottom-4 left-[88px] z-20 md:right-6 md:bottom-6 md:left-[96px]">
              <div className="mx-auto max-w-[1100px]">
                <ChatPanel
                  prompt={prompt}
                  onPromptChange={setPrompt}
                  onRunPrompt={() => void runPrompt()}
                  onUsePrompt={handleUsePrompt}
                  starterGroups={STARTER_PROMPT_GROUPS}
                  isLoading={isSubmitting}
                  hasTurns={hasTurns}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center md:min-h-[calc(100vh-3rem)]">
            <div className="mx-auto w-full max-w-[1100px]">
              <ChatPanel
                prompt={prompt}
                onPromptChange={setPrompt}
                onRunPrompt={() => void runPrompt()}
                onUsePrompt={handleUsePrompt}
                starterGroups={STARTER_PROMPT_GROUPS}
                isLoading={isSubmitting}
                hasTurns={hasTurns}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
