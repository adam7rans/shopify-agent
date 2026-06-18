"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ChatPanel } from "@/components/layout/chat-panel";
import { ActivityLogPanel } from "@/components/layout/activity-log-panel";
import type {
  ConversationTurn,
  ShellMode,
  StarterPromptGroup,
} from "@/components/layout/shellTypes";
import { SidebarDock } from "@/components/layout/sidebar-dock";
import { WorkspacePanel } from "@/components/layout/workspace-panel";
import type { AgentUiResponse } from "@/types/agentUi";
import type { ActivityLogEntry, ActivityLogStreamEvent } from "@/types/activityLog";

const STARTER_PROMPT_GROUPS: StarterPromptGroup[] = [
  {
    id: "daily",
    label: "Daily",
    description: "Start the day with inventory, reorder, and fulfillment checks.",
    prompts: [
      "What does our inventory look like right now?",
      "Which SKUs are low on stock right now?",
      "Where is fulfillment getting stuck?",
    ],
    accent: "inventory",
  },
  {
    id: "weekly",
    label: "Weekly",
    description: "Review winners, filtered inventory slices, and weekly risks.",
    prompts: [
      "Which candy is performing best this week?",
      "Compare Korean and Japanese gummy inventory side by side",
      "Give me a bar chart of units sold by category",
    ],
    accent: "sales",
  },
  {
    id: "monthly",
    label: "Monthly",
    description: "Look at broader sales trends and planning windows.",
    prompts: [
      "Show me a graph of past 3 months of total sales",
      "Show revenue by category as a pie chart",
      "Generate a Shopify Liquid collection page for Japanese gummies",
    ],
    accent: "operations",
  },
];

interface BestSellersShellProps {
  storeModeLabel: string;
  opsModeLabel: string;
  conversationId?: string;
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
  conversationId: conversationIdProp,
}: BestSellersShellProps) {
  const sessionId = useMemo(() => createTurnId(), []);
  const [mode, setMode] = useState<ShellMode>("user");
  const [prompt, setPrompt] = useState("");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleTurnId, setVisibleTurnId] = useState<string | null>(null);
  const [convexId, setConvexId] = useState<Id<"conversations"> | null>(
    conversationIdProp ? (conversationIdProp as Id<"conversations">) : null,
  );
  const hasLoadedRef = useRef(false);
  const scrollTargetRef = useRef<string | null>(null);
  const turnRefs = useRef<Map<string, HTMLElement>>(new Map());
  const responseRefs = useRef<Map<string, HTMLElement>>(new Map());

  const createConversation = useMutation(api.conversations.create);
  const addMessage = useMutation(api.conversations.addMessage);
  const savedMessages = useQuery(
    api.conversations.getMessages,
    convexId ? { conversationId: convexId } : "skip",
  );

  useEffect(() => {
    if (hasLoadedRef.current || !savedMessages || savedMessages.length === 0) return;
    hasLoadedRef.current = true;

    const restored: ConversationTurn[] = [];
    let currentTurn: Partial<ConversationTurn> | null = null;

    for (const msg of savedMessages) {
      if (msg.role === "user") {
        if (currentTurn) {
          restored.push(currentTurn as ConversationTurn);
        }
        currentTurn = {
          id: createTurnId(),
          prompt: msg.prompt ?? "",
          result: null,
          error: null,
          isLoading: false,
          activityLog: [],
        };
      } else if (msg.role === "assistant" && currentTurn) {
        currentTurn.result = msg.response
          ? (JSON.parse(msg.response) as AgentUiResponse)
          : null;
        currentTurn.activityLog = msg.activityLog
          ? (JSON.parse(msg.activityLog) as ActivityLogEntry[])
          : [];
        restored.push(currentTurn as ConversationTurn);
        currentTurn = null;
      }
    }
    if (currentTurn) {
      restored.push(currentTurn as ConversationTurn);
    }

    setTurns(restored);
  }, [savedMessages]);

  const scrollToTarget = useCallback(() => {
    const id = scrollTargetRef.current;
    if (!id) return;
    const element = responseRefs.current.get(id);
    if (!element) return;
    scrollTargetRef.current = null;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const registerTurnRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      turnRefs.current.set(id, el);
    } else {
      turnRefs.current.delete(id);
    }
  }, []);

  const registerResponseRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      responseRefs.current.set(id, el);
      scrollToTarget();
    } else {
      responseRefs.current.delete(id);
    }
  }, [scrollToTarget]);

  useEffect(() => {
    if (mode !== "diagnostics" || turns.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
              bestEntry = entry;
            }
          }
        }
        if (bestEntry) {
          const turnId = bestEntry.target.getAttribute("data-turn-id");
          if (turnId) setVisibleTurnId(turnId);
        }
      },
      { threshold: [0.1, 0.3, 0.5, 0.7] },
    );

    for (const [, el] of turnRefs.current) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [mode, turns.length]);

  async function runPromptWithStream(nextPrompt: string) {
    const trimmedPrompt = nextPrompt.trim();
    if (!trimmedPrompt) return;

    const turnId = createTurnId();

    let activeConvexId = convexId;
    if (!activeConvexId) {
      const title = trimmedPrompt.length > 60
        ? trimmedPrompt.slice(0, 57) + "..."
        : trimmedPrompt;
      activeConvexId = await createConversation({ title });
      setConvexId(activeConvexId);
      hasLoadedRef.current = true;
      window.history.replaceState(null, "", `/c/${activeConvexId}`);
    }

    await addMessage({
      conversationId: activeConvexId,
      role: "user",
      prompt: trimmedPrompt,
    });

    setIsSubmitting(true);
    setTurns((currentTurns) => [
      ...currentTurns,
      {
        id: turnId,
        prompt: trimmedPrompt,
        result: null,
        error: null,
        isLoading: true,
        activityLog: [],
      },
    ]);
    setPrompt("");
    setVisibleTurnId(turnId);
    scrollTargetRef.current = turnId;

    let finalResult: AgentUiResponse | null = null;
    let finalLogs: ActivityLogEntry[] = [];

    try {
      const response = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmedPrompt, sessionId }),
      });

      if (!response.ok || !response.body) {
        let message = `Streaming request failed with status ${response.status}.`;

        try {
          const payload = (await response.json()) as { answer?: { body?: string }; error?: string };
          message = payload.answer?.body ?? payload.error ?? message;
        } catch {
          // fall through to default message
        }

        setTurns((currentTurns) =>
          currentTurns.map((turn) =>
            turn.id === turnId
              ? { ...turn, error: message, isLoading: false }
              : turn,
          ),
        );
        scrollTargetRef.current = turnId; requestAnimationFrame(scrollToTarget);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const dataLine = line.trim();
          if (!dataLine.startsWith("data: ")) continue;

          try {
            const event = JSON.parse(dataLine.slice(6)) as ActivityLogStreamEvent;

            if (event.type === "log" && event.entry) {
              finalLogs = [...finalLogs, event.entry];
              setTurns((currentTurns) =>
                currentTurns.map((turn) =>
                  turn.id === turnId
                    ? { ...turn, activityLog: [...turn.activityLog, event.entry!] }
                    : turn,
                ),
              );
            }

            if (event.type === "result" && event.data) {
              finalResult = event.data as AgentUiResponse;
              setTurns((currentTurns) =>
                currentTurns.map((turn) =>
                  turn.id === turnId
                    ? {
                        ...turn,
                        result: event.data as AgentUiResponse,
                        isLoading: false,
                      }
                    : turn,
                ),
              );
              scrollTargetRef.current = turnId; requestAnimationFrame(scrollToTarget);
            }

            if (event.type === "error") {
              setTurns((currentTurns) =>
                currentTurns.map((turn) =>
                  turn.id === turnId
                    ? {
                        ...turn,
                        error: event.error ?? "Unknown error",
                        isLoading: false,
                      }
                    : turn,
                ),
              );
              scrollTargetRef.current = turnId; requestAnimationFrame(scrollToTarget);
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Unknown error";

      setTurns((currentTurns) =>
        currentTurns.map((turn) =>
          turn.id === turnId
            ? { ...turn, error: message, isLoading: false }
            : turn,
        ),
      );
      scrollTargetRef.current = turnId; requestAnimationFrame(scrollToTarget);
    } finally {
      setIsSubmitting(false);
      if (activeConvexId && finalResult) {
        void addMessage({
          conversationId: activeConvexId,
          role: "assistant",
          response: JSON.stringify(finalResult),
          activityLog: JSON.stringify(finalLogs),
        });
      }
    }
  }

  function handleUsePrompt(nextPrompt: string) {
    setPrompt(nextPrompt);
    void runPromptWithStream(nextPrompt);
  }

  const activeTurn =
    visibleTurnId
      ? turns.find((t) => t.id === visibleTurnId)
      : turns.length > 0
        ? turns[turns.length - 1]
        : undefined;

  const activeLogs = activeTurn?.activityLog ?? [];
  const activePrompt = activeTurn?.prompt ?? "";

  const showLogPanel = mode === "diagnostics" && turns.length > 0;

  const hasTurns = turns.length > 0;

  return (
    <div className="mx-auto min-h-full max-w-[1440px] pl-[88px] md:pl-[96px]">
      <SidebarDock mode={mode} onModeChange={setMode} currentRoute="home" />
      <section
        className={`min-w-0 transition-[padding] duration-300 ${
          showLogPanel ? "pr-[356px]" : ""
        }`}
      >
        {hasTurns ? (
          <>
            <div className="mx-auto max-w-[1100px] pt-8 pb-44 md:pt-12 md:pb-48">
              <WorkspacePanel
                turns={turns}
                mode={mode}
                onRegisterTurnRef={registerTurnRef}
                onRegisterResponseRef={registerResponseRef}
              />
            </div>
            {mode === "diagnostics" ? (
              <div
                className={`pointer-events-none fixed bottom-24 z-20 flex flex-col items-end gap-2 transition-[right] duration-300 md:bottom-28 ${
                  showLogPanel ? "right-[372px]" : "right-4 md:right-6"
                }`}
              >
                <div className="rounded-full border border-plum/20 bg-white/90 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-plum shadow-panel backdrop-blur">
                  {storeModeLabel}
                </div>
                <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500 shadow-panel backdrop-blur">
                  {opsModeLabel}
                </div>
              </div>
            ) : null}
            <div
              className={`fixed bottom-4 left-[88px] z-20 transition-[right] duration-300 md:bottom-6 md:left-[96px] ${
                showLogPanel ? "right-[372px]" : "right-4 md:right-6"
              }`}
            >
              <div className="mx-auto max-w-[1100px]">
                <ChatPanel
                  prompt={prompt}
                  onPromptChange={setPrompt}
                  onRunPrompt={() => void runPromptWithStream(prompt)}
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
                onRunPrompt={() => void runPromptWithStream(prompt)}
                onUsePrompt={handleUsePrompt}
                starterGroups={STARTER_PROMPT_GROUPS}
                isLoading={isSubmitting}
                hasTurns={hasTurns}
              />
            </div>
          </div>
        )}
      </section>

      <ActivityLogPanel logs={activeLogs} visible={showLogPanel} prompt={activePrompt} />
    </div>
  );
}
