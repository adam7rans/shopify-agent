interface ChatPanelProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onRunPrompt: () => void;
  onUseBestSellersPrompt: () => void;
  onUseSourReorderPrompt: () => void;
  onUseWarehousePrompt: () => void;
  answer: string | null;
  error: string | null;
  isLoading: boolean;
}

export function ChatPanel({
  prompt,
  onPromptChange,
  onRunPrompt,
  onUseBestSellersPrompt,
  onUseSourReorderPrompt,
  onUseWarehousePrompt,
  answer,
  error,
  isLoading,
}: ChatPanelProps) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.22em] text-matcha/80">Command panel</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Ask Kandwii a store question</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            The current demo supports best-sellers, sour candy reorder / stockout,
            and global warehouse / fulfillment issues, all powered by deterministic mock data.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onUseBestSellersPrompt}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
          >
            Best-sellers prompt
          </button>
          <button
            type="button"
            onClick={onUseSourReorderPrompt}
            className="rounded-full border border-matcha/20 bg-matcha/10 px-4 py-2 text-sm font-medium text-matcha transition hover:bg-matcha/15"
          >
            Sour reorder prompt
          </button>
          <button
            type="button"
            onClick={onUseWarehousePrompt}
            className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
          >
            Warehouse issues prompt
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
        <label className="block" htmlFor="agent-prompt">
          <span className="text-sm font-medium text-slate-700">Prompt</span>
          <textarea
            id="agent-prompt"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            rows={3}
            className="mt-3 w-full rounded-2xl border border-sand bg-shell/60 px-4 py-3 text-sm text-ink outline-none ring-0 placeholder:text-slate-400"
          />
        </label>

        <div className="flex flex-col justify-between rounded-2xl border border-sand/70 bg-shell/80 p-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Run current prompt</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Results will appear below in the workspace with cards, tables, and trace.
            </p>
          </div>
          <button
            type="button"
            onClick={onRunPrompt}
            disabled={isLoading}
            className="mt-4 rounded-full bg-matcha px-4 py-2 text-sm font-medium text-white transition hover:bg-matcha/90 disabled:cursor-not-allowed disabled:bg-matcha/60"
          >
            {isLoading ? "Running..." : "Ask Kandwii"}
          </button>
        </div>
      </div>

      {(error || answer) && (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-5">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Run status</p>
          {error ? (
            <p className="mt-3 text-sm leading-7 text-coral">{error}</p>
          ) : (
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Response generated. Scroll below for the structured result view.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
