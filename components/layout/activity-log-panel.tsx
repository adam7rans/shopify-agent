import { useEffect, useRef } from "react";
import type { ActivityLogEntry } from "@/types/activityLog";

interface ActivityLogPanelProps {
  logs: ActivityLogEntry[];
  visible: boolean;
  prompt?: string;
}

export function ActivityLogPanel({ logs, visible, prompt }: ActivityLogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (logs.length > prevLengthRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLengthRef.current = logs.length;
  }, [logs.length]);

  return (
    <aside
      className={`fixed right-4 top-[2.5vh] z-30 h-[95vh] w-[340px] transition-transform duration-300 ease-in-out md:right-6 ${
        visible ? "translate-x-0" : "translate-x-[calc(100%+24px)]"
      }`}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-panel backdrop-blur">
        <div className="flex-shrink-0 border-b border-slate-200/60 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-plum/70">
            Activity log
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Real-time API calls and agent decisions
          </p>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3"
        >
          {logs.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              Submit a prompt to see activity
            </p>
          ) : (
            <div className="space-y-1">
              {prompt ? (
                <div className="mb-3 rounded-xl bg-plum/8 px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-plum/50">Prompt</p>
                  <p className="mt-1 text-[12px] font-medium leading-[18px] text-ink">{prompt}</p>
                </div>
              ) : null}
              {logs.map((entry, i) => (
                <div
                  key={i}
                  className="animate-fade-in flex items-start gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-50/80"
                >
                  <span className="mt-0.5 flex-shrink-0 text-sm leading-none">
                    {entry.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium leading-[18px] text-ink">
                      {entry.message}
                    </p>
                    {entry.detail ? (
                      <p className="text-[11px] leading-[16px] text-slate-400">
                        {entry.detail}
                      </p>
                    ) : null}
                  </div>
                  <span className="mt-0.5 flex-shrink-0 font-mono text-[10px] tabular-nums text-slate-300">
                    +{entry.elapsed.toFixed(1)}s
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
