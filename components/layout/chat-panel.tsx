import { useEffect, useRef } from "react";
import type { StarterPromptGroup } from "@/components/layout/shellTypes";

interface ChatPanelProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onRunPrompt: () => void;
  onUsePrompt: (prompt: string) => void;
  starterGroups: StarterPromptGroup[];
  isLoading: boolean;
  hasTurns: boolean;
}

function accentClasses(accent: StarterPromptGroup["accent"]) {
  if (accent === "inventory") {
    return "border-matcha/20 bg-matcha/10 text-matcha hover:bg-matcha/15";
  }

  if (accent === "operations") {
    return "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100";
  }

  if (accent === "help") {
    return "border-plum/20 bg-plum/10 text-plum hover:bg-plum/15";
  }

  return "border-gold/30 bg-gold/10 text-gold hover:bg-gold/15";
}

export function ChatPanel({
  prompt,
  onPromptChange,
  onRunPrompt,
  onUsePrompt,
  starterGroups,
  isLoading,
  hasTurns,
}: ChatPanelProps) {
  const quickPrompts = starterGroups.map((group) => group.prompts[0]).slice(0, 3);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 32), 220);
    textarea.style.height = `${nextHeight}px`;
  }, [prompt]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.focus();
  }, []);

  return (
    <section className="mx-auto w-full max-w-[640px]">
      {!hasTurns ? (
        <div className="mb-4 flex flex-wrap justify-center gap-2 md:mb-5">
          {quickPrompts.map((suggestedPrompt, index) => (
            <button
              key={suggestedPrompt}
              type="button"
              onClick={() => onUsePrompt(suggestedPrompt)}
              className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                accentClasses(starterGroups[index]?.accent ?? "sales")
              }`}
            >
              {suggestedPrompt}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="rounded-[30px] border border-white/80 bg-white/95 px-5 py-4 shadow-panel"
        onSubmit={(event) => {
          event.preventDefault();
          onRunPrompt();
        }}
      >
        <label className="sr-only" htmlFor="agent-prompt">
          Ask Kandwii
        </label>
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            id="agent-prompt"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!isLoading && prompt.trim()) {
                  onRunPrompt();
                }
              }
            }}
            rows={1}
            placeholder="Ask Kandwii about sales, inventory, reorder risk, or fulfillment health."
            className="min-h-[40px] flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-1 text-base leading-8 text-ink outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/40"
            aria-label={isLoading ? "Kandwii is thinking" : "Send prompt"}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5" />
              <path d="m5 12 7-7 7 7" />
            </svg>
          </button>
        </div>
      </form>
    </section>
  );
}
