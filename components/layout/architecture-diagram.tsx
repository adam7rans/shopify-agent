"use client";

import { useState, useCallback } from "react";

type FlowMode = "full" | "cached";

interface Step {
  label: string;
  description: string;
  active: string[];
}

const FULL_STEPS: Step[] = [
  {
    label: "Send prompt",
    description:
      "The user types a natural-language question in the chat interface.",
    active: ["chat", "arrow-sse"],
  },
  {
    label: "API route",
    description:
      "The Next.js route handler receives the request and opens an SSE stream.",
    active: ["api-stream", "arrow-sse", "arrow-api-agent"],
  },
  {
    label: "Check cache",
    description:
      "The agent loop checks if this exact prompt was asked within the last 5 minutes. Cache miss — proceed to OpenAI.",
    active: ["response-cache", "arrow-api-agent", "arrow-cache-openai"],
  },
  {
    label: "LLM reasoning",
    description:
      "OpenAI receives the prompt with the system prompt defining tools and output schema, then decides which tools to call.",
    active: [
      "openai",
      "system-prompt",
      "arrow-system-openai",
      "arrow-cache-openai",
    ],
  },
  {
    label: "Call tools",
    description:
      "OpenAI decides which tools to call. The tool executors send requests to Shopify and operations systems. The tool cache is checked first — cached results skip the API call.",
    active: [
      "openai",
      "tool-executors",
      "tool-cache",
      "arrow-cache-tools",
      "arrow-openai-tools",
      "shopify",
      "mock-ops",
      "arrow-tools-shopify",
      "arrow-tools-mock",
    ],
  },
  {
    label: "Return results",
    description:
      "External services return data to the tool executors. Results are cached for 5 minutes, then sent back to OpenAI for reasoning. This loop may repeat if the LLM needs more data.",
    active: [
      "openai",
      "tool-executors",
      "tool-cache",
      "arrow-tools-return",
      "arrow-openai-tools",
      "shopify",
      "mock-ops",
      "arrow-tools-shopify",
      "arrow-tools-mock",
    ],
  },
  {
    label: "Validate response",
    description:
      "OpenAI composes a structured JSON response. The validator parses and normalizes it into the AgentUiResponse schema.",
    active: ["openai", "response-validator", "arrow-openai-validator", "arrow-validator-enhance"],
  },
  {
    label: "Enhance & stream",
    description:
      "The validated response flows up to enhanceAgentResponse for chart data injection, then streams back to the frontend via SSE as cards, tables, and charts.",
    active: [
      "api-enhance",
      "api-stream",
      "arrow-api-enhance",
      "arrow-validator-enhance",
      "arrow-sse",
      "arrow-stream-return",
      "renderer",
      "chat",
      "activity",
    ],
  },
  {
    label: "Save to Convex",
    description:
      "The prompt and response are persisted to Convex cloud DB so the conversation survives page refreshes and appears in the recents sidebar.",
    active: ["convex-client", "convex-db", "arrow-convex"],
  },
];

const CACHED_STEPS: Step[] = [
  {
    label: "Send prompt",
    description: "The user asks the same question again within 5 minutes.",
    active: ["chat", "arrow-sse"],
  },
  {
    label: "API route",
    description: "Request reaches the API route handler as before.",
    active: ["api-stream", "arrow-sse", "arrow-api-agent"],
  },
  {
    label: "Cache HIT",
    description:
      "The exact same prompt is found in the response cache. The full structured response is returned instantly — no OpenAI or Shopify calls needed.",
    active: ["response-cache", "arrow-api-agent"],
  },
  {
    label: "Instant return",
    description:
      "The cached response streams back to the frontend in milliseconds instead of 10–15 seconds. All the same cards, tables, and charts render immediately.",
    active: ["api-stream", "arrow-stream-return", "renderer", "chat"],
  },
];

export function ArchitectureDiagram() {
  const [mode, setMode] = useState<FlowMode>("full");
  const [step, setStep] = useState<number | null>(null);

  const steps = mode === "full" ? FULL_STEPS : CACHED_STEPS;

  const switchMode = useCallback((m: FlowMode) => {
    setMode(m);
    setStep(null);
  }, []);

  const on = useCallback(
    (group: string) => {
      if (step === null) return true;
      return steps[step].active.includes(group);
    },
    [step, steps],
  );

  const s = useCallback(
    (group: string): React.CSSProperties => ({
      opacity: on(group) ? 1 : 0.1,
      transition: "opacity 0.4s ease",
    }),
    [on],
  );

  const isCacheHit = mode === "cached" && step === 2;

  return (
    <div className="flex gap-5">
      {/* ── STEPPER PANEL ── */}
      <div className="w-[168px] shrink-0 space-y-4 pt-1">
        {/* Mode toggle */}
        <div className="flex rounded-lg border border-slate-200 bg-shell p-0.5">
          <button
            onClick={() => switchMode("full")}
            className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              mode === "full"
                ? "bg-white text-ink shadow-sm"
                : "text-slate-400 hover:text-slate-500"
            }`}
          >
            Full flow
          </button>
          <button
            onClick={() => switchMode("cached")}
            className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              mode === "cached"
                ? "bg-white text-ink shadow-sm"
                : "text-slate-400 hover:text-slate-500"
            }`}
          >
            Cached
          </button>
        </div>

        {/* Steps */}
        <div className="relative">
          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-slate-200" />
          {steps.map((s, i) => (
            <button
              key={`${mode}-${i}`}
              onClick={() => setStep((prev) => (prev === i ? null : i))}
              className="group relative flex w-full items-start gap-2.5 py-[7px] text-left"
            >
              <div
                className={`relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all ${
                  step === i
                    ? mode === "cached" && i === 2
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-plum bg-plum text-white"
                    : step !== null && i < step
                      ? "border-plum/30 bg-plum/10 text-plum/50"
                      : "border-slate-300 bg-white text-slate-400 group-hover:border-slate-400"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`pt-[2px] text-[11px] font-medium leading-tight transition-colors ${
                  step === i
                    ? "text-ink"
                    : "text-slate-400 group-hover:text-slate-600"
                }`}
              >
                {s.label}
              </span>
            </button>
          ))}
        </div>

        {/* Description */}
        {step !== null && (
          <div className="rounded-xl bg-shell/80 p-3">
            <p className="text-[11px] leading-[18px] text-slate-600">
              {steps[step].description}
            </p>
          </div>
        )}
        {step === null && (
          <p className="px-1 text-[10px] leading-4 text-slate-400">
            Click a step to walk through the flow.
          </p>
        )}
      </div>

      {/* ── SVG DIAGRAM ── */}
      <div className="min-w-0 flex-1">
        <svg
          viewBox="0 0 920 620"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          className="w-full"
        >
          <title>Kandwii Architecture Diagram</title>
          <desc>
            Interactive architecture diagram showing how Kandwii processes a
            merchant question, with step-by-step highlighting.
          </desc>

          <defs>
            <marker
              id="ah"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L8,3 L0,6" fill="#94a3b8" />
            </marker>
            <marker
              id="ah-green"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L8,3 L0,6" fill="#16a34a" />
            </marker>
            <marker
              id="ah-plum"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L8,3 L0,6" fill="#7c3aed" />
            </marker>
          </defs>

          {/* ── TIER BACKGROUNDS (always visible) ── */}
          <rect x="20" y="16" width="880" height="130" rx="16" fill="#faf8f5" stroke="#e8e4dd" strokeWidth="1" />
          <text x="40" y="40" fontSize="10" fill="#94a3b8" fontFamily="system-ui" fontWeight="600" letterSpacing="0.12em">FRONTEND — NEXT.JS + REACT</text>

          <rect x="20" y="192" width="880" height="100" rx="16" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
          <text x="40" y="216" fontSize="10" fill="#16a34a" fontFamily="system-ui" fontWeight="600" letterSpacing="0.12em">API LAYER — NEXT.JS ROUTE HANDLER</text>

          <rect x="20" y="332" width="600" height="200" rx="16" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
          <text x="40" y="356" fontSize="10" fill="#2563eb" fontFamily="system-ui" fontWeight="600" letterSpacing="0.12em">AGENT LOOP — LIB/AGENT</text>

          <rect x="640" y="332" width="260" height="200" rx="16" fill="#faf8f5" stroke="#e8e4dd" strokeWidth="1" />
          <text x="660" y="356" fontSize="10" fill="#94a3b8" fontFamily="system-ui" fontWeight="600" letterSpacing="0.12em">EXTERNAL SERVICES</text>

          {/* ── FRONTEND BOXES ── */}
          <g style={s("chat")}>
            <rect x="40" y="54" width="150" height="76" rx="12" fill="#fff" stroke="#e8e4dd" strokeWidth="1" />
            <text x="115" y="78" textAnchor="middle" fontSize="13" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">Chat UI</text>
            <text x="115" y="96" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">best-sellers-shell</text>
            <text x="115" y="112" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">workspace-panel</text>
          </g>
          <g style={s("sidebar")}>
            <rect x="210" y="54" width="150" height="76" rx="12" fill="#fff" stroke="#e8e4dd" strokeWidth="1" />
            <text x="285" y="78" textAnchor="middle" fontSize="13" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">Sidebar</text>
            <text x="285" y="96" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Mode toggle</text>
            <text x="285" y="112" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Recents dropdown</text>
          </g>
          <g style={s("renderer")}>
            <rect x="380" y="54" width="170" height="76" rx="12" fill="#fff" stroke="#e8e4dd" strokeWidth="1" />
            <text x="465" y="78" textAnchor="middle" fontSize="13" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">Structured Renderer</text>
            <text x="465" y="96" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Cards, tables, charts</text>
            <text x="465" y="112" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Liquid preview, pie/bar/line</text>
          </g>
          <g style={s("convex-client")}>
            <rect x="570" y="54" width="150" height="76" rx="12" fill="#f3f0ff" stroke="#c4b5fd" strokeWidth="1" />
            <text x="645" y="78" textAnchor="middle" fontSize="13" fill="#7c3aed" fontFamily="system-ui" fontWeight="600">Convex Client</text>
            <text x="645" y="96" textAnchor="middle" fontSize="10" fill="#7c3aed" fontFamily="system-ui">Save/load messages</text>
            <text x="645" y="112" textAnchor="middle" fontSize="10" fill="#7c3aed" fontFamily="system-ui">List recent chats</text>
          </g>
          <g style={s("activity")}>
            <rect x="740" y="54" width="150" height="76" rx="12" fill="#fff" stroke="#e8e4dd" strokeWidth="1" />
            <text x="815" y="78" textAnchor="middle" fontSize="13" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">Activity Log</text>
            <text x="815" y="96" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Tool traces</text>
            <text x="815" y="112" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Diagnostics panel</text>
          </g>

          {/* ── ARROW: Frontend ↔ API ── */}
          <g style={s("arrow-sse")}>
            <line x1="110" y1="146" x2="110" y2="188" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#ah)" />
            <text x="128" y="172" fontSize="9" fill="#94a3b8" fontFamily="system-ui">SSE stream</text>
          </g>
          <g style={s("arrow-stream-return")}>
            <line x1="122" y1="228" x2="122" y2="132" stroke="#16a34a" strokeWidth="1.5" markerEnd="url(#ah-green)" />
          </g>

          {/* ── API BOXES ── */}
          <g style={s("api-stream")}>
            <rect x="40" y="230" width="200" height="48" rx="10" fill="#fff" stroke="#bbf7d0" strokeWidth="1" />
            <text x="140" y="254" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">/api/agent/stream</text>
            <text x="140" y="268" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">SSE streaming + sessionId</text>
          </g>
          <g style={s("api-enhance")}>
            <rect x="260" y="230" width="200" height="48" rx="10" fill="#fff" stroke="#bbf7d0" strokeWidth="1" />
            <text x="360" y="254" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">enhanceAgentResponse</text>
            <text x="360" y="268" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Chart data injection</text>
          </g>
          <g style={s("arrow-api-enhance")}>
            <line x1="242" y1="254" x2="258" y2="254" stroke="#94a3b8" strokeWidth="1" markerEnd="url(#ah)" />
          </g>

          {/* ── ARROW: API → Agent Loop ── */}
          <g style={s("arrow-api-agent")}>
            <line x1="140" y1="292" x2="140" y2="328" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#ah)" />
          </g>

          {/* ── AGENT LOOP BOXES ── */}
          <g style={s("response-cache")}>
            <rect
              x="40"
              y="370"
              width="170"
              height="56"
              rx="10"
              fill={isCacheHit ? "#dcfce7" : "#fef3c7"}
              stroke={isCacheHit ? "#22c55e" : "#fbbf24"}
              strokeWidth="1"
            />
            <text x="125" y="394" textAnchor="middle" fontSize="12" fill={isCacheHit ? "#166534" : "#92400e"} fontFamily="system-ui" fontWeight="600">
              {isCacheHit ? "Response Cache ✓" : "Response Cache"}
            </text>
            <text x="125" y="410" textAnchor="middle" fontSize="10" fill={isCacheHit ? "#166534" : "#92400e"} fontFamily="system-ui">
              {isCacheHit ? "HIT — instant return" : "Same prompt → instant"}
            </text>
          </g>
          <g style={s("openai")}>
            <rect x="230" y="370" width="170" height="56" rx="10" fill="#fff" stroke="#bfdbfe" strokeWidth="1" />
            <text x="315" y="394" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">OpenAI gpt-4.1-mini</text>
            <text x="315" y="410" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Multi-turn tool calling</text>
          </g>
          <g style={s("tool-cache")}>
            <rect x="40" y="444" width="170" height="56" rx="10" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1" />
            <text x="125" y="468" textAnchor="middle" fontSize="12" fill="#92400e" fontFamily="system-ui" fontWeight="600">Tool Result Cache</text>
            <text x="125" y="484" textAnchor="middle" fontSize="10" fill="#92400e" fontFamily="system-ui">5-min TTL per tool+args</text>
          </g>
          <g style={s("tool-executors")}>
            <rect x="230" y="444" width="170" height="56" rx="10" fill="#fff" stroke="#bfdbfe" strokeWidth="1" />
            <text x="315" y="468" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">Tool Executors</text>
            <text x="315" y="484" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">7 tools, structured output</text>
          </g>
          <g style={s("system-prompt")}>
            <rect x="420" y="370" width="180" height="56" rx="10" fill="#fff" stroke="#bfdbfe" strokeWidth="1" />
            <text x="510" y="394" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">System Prompt</text>
            <text x="510" y="410" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">AgentUiResponse schema</text>
          </g>
          <g style={s("response-validator")}>
            <rect x="420" y="444" width="180" height="56" rx="10" fill="#fff" stroke="#bfdbfe" strokeWidth="1" />
            <text x="510" y="468" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">Response Validator</text>
            <text x="510" y="484" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Parse + normalize JSON</text>
          </g>

          {/* ── ARROWS INSIDE AGENT LOOP ── */}
          <g style={s("arrow-cache-openai")}>
            <line x1="210" y1="398" x2="227" y2="398" stroke="#94a3b8" strokeWidth="1" markerEnd="url(#ah)" />
          </g>
          <g style={s("arrow-cache-tools")}>
            <line x1="210" y1="472" x2="227" y2="472" stroke="#94a3b8" strokeWidth="1" markerEnd="url(#ah)" />
          </g>
          <g style={s("arrow-openai-tools")}>
            <line x1="315" y1="426" x2="315" y2="441" stroke="#94a3b8" strokeWidth="1" markerEnd="url(#ah)" />
          </g>
          <g style={s("arrow-system-openai")}>
            <line x1="418" y1="398" x2="402" y2="398" stroke="#94a3b8" strokeWidth="1" markerEnd="url(#ah)" />
          </g>
          <g style={s("arrow-tools-return")}>
            <line x1="340" y1="444" x2="340" y2="428" stroke="#94a3b8" strokeWidth="1" markerEnd="url(#ah)" />
          </g>
          <g style={s("arrow-openai-validator")}>
            <path d="M385,426 L385,437 L510,437 L510,442" fill="none" stroke="#94a3b8" strokeWidth="1" markerEnd="url(#ah)" />
          </g>
          <g style={s("arrow-validator-enhance")}>
            <path d="M600,468 L612,468 L612,254 L462,254" fill="none" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#ah)" />
          </g>

          {/* ── EXTERNAL SERVICE BOXES ── */}
          <g style={s("shopify")}>
            <rect x="660" y="370" width="220" height="48" rx="10" fill="#fff" stroke="#e8e4dd" strokeWidth="1" />
            <text x="770" y="392" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">Shopify Admin API</text>
            <text x="770" y="406" textAnchor="middle" fontSize="10" fill="#16a34a" fontFamily="system-ui">Products, inventory, orders</text>
          </g>
          <g style={s("mock-ops")}>
            <rect x="660" y="430" width="220" height="48" rx="10" fill="#fff" stroke="#e8e4dd" strokeWidth="1" />
            <text x="770" y="452" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">Mock Ops Data</text>
            <text x="770" y="466" textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="system-ui">Distributors, warehouse, fulfillment</text>
          </g>
          <g style={s("convex-db")}>
            <rect x="660" y="490" width="220" height="48" rx="10" fill="#f3f0ff" stroke="#c4b5fd" strokeWidth="1" />
            <text x="770" y="512" textAnchor="middle" fontSize="12" fill="#7c3aed" fontFamily="system-ui" fontWeight="600">Convex Cloud DB</text>
            <text x="770" y="526" textAnchor="middle" fontSize="10" fill="#7c3aed" fontFamily="system-ui">Conversations + messages</text>
          </g>

          {/* ── ARROWS TO EXTERNAL SERVICES ── */}
          <g style={s("arrow-tools-shopify")}>
            <path d="M400,466 L410,466 L410,510 L628,510 L628,394 L657,394" fill="none" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#ah)" />
          </g>
          <g style={s("arrow-tools-mock")}>
            <path d="M400,478 L410,478 L410,520 L636,520 L636,454 L657,454" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#ah)" />
          </g>

          {/* ── CONVEX PERSISTENCE LINE ── */}
          <g style={s("arrow-convex")}>
            <path d="M645,130 L645,168 L912,168 L912,514 L882,514" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="6 3" markerEnd="url(#ah-plum)" />
          </g>

          {/* ── LEGEND (always visible) ── */}
          <rect x="20" y="556" width="880" height="50" rx="12" fill="#fff" stroke="#e8e4dd" strokeWidth="1" />
          <line x1="40" y1="582" x2="70" y2="582" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#ah)" />
          <text x="78" y="586" fontSize="10" fill="#64748b" fontFamily="system-ui">Data flow</text>
          <line x1="160" y1="582" x2="190" y2="582" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#ah)" />
          <text x="198" y="586" fontSize="10" fill="#64748b" fontFamily="system-ui">Mock data</text>
          <line x1="280" y1="582" x2="310" y2="582" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="6 3" markerEnd="url(#ah-plum)" />
          <text x="318" y="586" fontSize="10" fill="#64748b" fontFamily="system-ui">Convex persistence</text>
          <rect x="440" y="574" width="16" height="16" rx="4" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1" />
          <text x="464" y="586" fontSize="10" fill="#64748b" fontFamily="system-ui">Cache layer (5-min TTL)</text>
          <rect x="620" y="574" width="16" height="16" rx="4" fill="#f3f0ff" stroke="#c4b5fd" strokeWidth="1" />
          <text x="644" y="586" fontSize="10" fill="#64748b" fontFamily="system-ui">Convex (new)</text>
          <rect x="760" y="574" width="16" height="16" rx="4" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
          <text x="784" y="586" fontSize="10" fill="#64748b" fontFamily="system-ui">API layer</text>
        </svg>
      </div>
    </div>
  );
}
