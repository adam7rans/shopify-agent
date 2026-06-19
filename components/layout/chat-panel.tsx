import { useEffect, useRef } from "react";
import type { StarterPromptGroup } from "@/components/layout/shellTypes";

export interface AttachedFile {
  file: File;
  preview: string;
  name: string;
}

interface ChatPanelProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onRunPrompt: () => void;
  onUsePrompt: (prompt: string) => void;
  starterGroups: StarterPromptGroup[];
  isLoading: boolean;
  hasTurns: boolean;
  attachedFile?: AttachedFile | null;
  onAttachFile?: (file: AttachedFile | null) => void;
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
  attachedFile,
  onAttachFile,
}: ChatPanelProps) {
  const quickPrompts = starterGroups.map((group) => group.prompts[0]).slice(0, 3);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        suppressHydrationWarning
        onSubmit={(event) => {
          event.preventDefault();
          onRunPrompt();
        }}
      >
        <label className="sr-only" htmlFor="agent-prompt">
          Ask Kandwii
        </label>

        {attachedFile && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-shell px-4 py-2.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
              {attachedFile.preview ? (
                <img src={attachedFile.preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              )}
            </div>
            <span className="flex-1 truncate text-sm font-medium text-ink">{attachedFile.name}</span>
            <button
              type="button"
              onClick={() => onAttachFile?.(null)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-slate-600"
              aria-label="Remove attachment"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-end gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file || !onAttachFile) return;
              const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
              onAttachFile({ file, preview, name: file.name });
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-shell hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Attach a file"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            id="agent-prompt"
            suppressHydrationWarning
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!isLoading && (prompt.trim() || attachedFile)) {
                  onRunPrompt();
                }
              }
            }}
            rows={1}
            placeholder={attachedFile ? "Describe what to do with this file..." : "Ask about sales, inventory, reorder risk, or fulfillment health."}
            className="min-h-[40px] flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-1 text-base leading-8 text-ink outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={isLoading || (!prompt.trim() && !attachedFile)}
            suppressHydrationWarning
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
