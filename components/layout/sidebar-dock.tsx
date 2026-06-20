"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ShellMode } from "@/components/layout/shellTypes";

interface SidebarDockProps {
  mode?: ShellMode;
  onModeChange?: (mode: ShellMode) => void;
  currentRoute: "home" | "info";
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"conversations"> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const recentsRef = useRef<HTMLDivElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const router = useRouter();
  const pathname = usePathname();

  const recentConversations = useQuery(api.conversations.list, { limit: 20 });
  const removeConversation = useMutation(api.conversations.remove);

  function showToast(message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  async function handleDelete(e: React.MouseEvent, id: Id<"conversations">, title: string) {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    await removeConversation({ id });
    showToast(`"${title}" deleted`);
    if (pathname === `/c/${id}`) {
      router.push("/");
    }
    setDeletingId(null);
  }

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (!recentsRef.current?.contains(event.target as Node)) {
        setRecentsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <>
    <aside className="fixed left-4 top-[2.5vh] z-30 flex h-[95vh] w-[72px] flex-col justify-between rounded-[28px] border border-white/70 bg-white/75 p-3 shadow-panel backdrop-blur md:left-6">
      <div className="flex flex-col items-center gap-3">
        <Glyph />

        <div ref={recentsRef} className="relative">
          <button
            type="button"
            onClick={() => setRecentsOpen((c) => !c)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-shell hover:text-slate-600"
            aria-label="Recent chats"
            title="Recents"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </button>

          {recentsOpen && (
            <div className="absolute left-14 top-0 z-20 flex w-72 flex-col rounded-[20px] border border-white/80 bg-white/95 p-3 shadow-panel backdrop-blur" style={{ maxHeight: "calc(95vh - 80px)" }}>
              <div className="flex items-center justify-between px-2 pb-2">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Recent chats
                </p>
                <Link
                  href="/"
                  onClick={() => setRecentsOpen(false)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-plum hover:bg-plum/10"
                >
                  + New
                </Link>
              </div>
              <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
                {recentConversations && recentConversations.length > 0 ? (
                  recentConversations.map((conv) => {
                    const isActive = pathname === `/c/${conv._id}`;
                    return (
                    <div
                      key={conv._id}
                      className={`group relative rounded-xl transition ${isActive ? "bg-plum/10" : "hover:bg-shell"}`}
                    >
                      <Link
                        href={`/c/${conv._id}`}
                        onClick={() => setRecentsOpen(false)}
                        className="block px-3 py-2.5"
                      >
                        <p className={`truncate pr-6 text-sm font-medium ${isActive ? "text-plum" : "text-ink"}`}>
                          {conv.title}
                        </p>
                        <p className={`mt-0.5 text-[11px] ${isActive ? "text-plum/50" : "text-slate-400"}`}>
                          {formatRelativeTime(conv.updatedAt)}
                        </p>
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, conv._id, conv.title)}
                        disabled={deletingId === conv._id}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        title="Delete conversation"
                      >
                        {deletingId === conv._id ? (
                          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        )}
                      </button>
                    </div>
                    );
                  })
                ) : (
                  <p className="px-3 py-4 text-center text-xs text-slate-400">
                    No conversations yet
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

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
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex animate-fade-in items-center gap-2 whitespace-nowrap rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg">
          <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          {toast}
        </div>
      )}
    </>
  );
}
