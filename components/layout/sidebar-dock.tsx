"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ShellMode } from "@/components/layout/shellTypes";

interface SidebarDockProps {
  mode?: ShellMode;
  onModeChange?: (mode: ShellMode) => void;
  currentRoute: "home" | "info";
}

function Glyph() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-white/90 text-lg font-semibold text-ink shadow-panel">
      K
    </div>
  );
}

export function SidebarDock({
  mode,
  onModeChange,
  currentRoute,
}: SidebarDockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <aside className="fixed left-4 top-[2.5vh] z-30 flex h-[95vh] w-[72px] flex-col justify-between rounded-[28px] border border-white/70 bg-white/75 p-3 shadow-panel backdrop-blur md:left-6">
      <div className="flex flex-col items-center gap-3">
        <Glyph />
        <span className="rotate-180 text-[10px] font-medium uppercase tracking-[0.32em] text-slate-400 [writing-mode:vertical-rl]">
          Kandwii
        </span>
      </div>

      <div ref={menuRef} className="relative flex items-end justify-center">
        {isOpen ? (
          <div className="absolute bottom-16 left-0 z-20 w-64 rounded-[24px] border border-white/80 bg-white/95 p-3 shadow-panel backdrop-blur">
            <p className="px-2 text-xs uppercase tracking-[0.18em] text-slate-400">
              Workspace
            </p>
            <div className="mt-2 space-y-2">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className={`block rounded-2xl px-3 py-3 text-sm font-medium transition ${
                  currentRoute === "home"
                    ? "bg-shell text-ink"
                    : "text-slate-600 hover:bg-shell"
                }`}
              >
                Open chat
              </Link>
              <Link
                href="/info"
                onClick={() => setIsOpen(false)}
                className={`block rounded-2xl px-3 py-3 text-sm font-medium transition ${
                  currentRoute === "info"
                    ? "bg-shell text-ink"
                    : "text-slate-600 hover:bg-shell"
                }`}
              >
                Info page
              </Link>
            </div>

            {mode && onModeChange ? (
              <>
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="px-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                    View mode
                  </p>
                  <div className="mt-2 grid gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onModeChange("user");
                        setIsOpen(false);
                      }}
                      className={`rounded-2xl px-3 py-3 text-left text-sm font-medium transition ${
                        mode === "user"
                          ? "bg-matcha text-white"
                          : "bg-shell text-slate-700 hover:bg-sand"
                      }`}
                    >
                      User mode
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onModeChange("diagnostics");
                        setIsOpen(false);
                      }}
                      className={`rounded-2xl px-3 py-3 text-left text-sm font-medium transition ${
                        mode === "diagnostics"
                          ? "bg-ink text-white"
                          : "bg-shell text-slate-700 hover:bg-sand"
                      }`}
                    >
                      Diagnostics mode
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-plum/20 bg-plum text-sm font-semibold text-white shadow-panel transition hover:bg-plum/90"
          aria-label="Open user menu"
        >
          AJ
        </button>
      </div>
    </aside>
  );
}
