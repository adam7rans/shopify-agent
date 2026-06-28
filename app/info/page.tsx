import { SidebarDock } from "@/components/layout/sidebar-dock";
import { ArchitectureDiagram } from "@/components/layout/architecture-diagram";
import { AgentLoopExamples } from "@/components/layout/agent-loop-examples";
import { getHybridOpsBadge, getShopifyModeBadge } from "@/lib/shopify";

export const dynamic = "force-dynamic";

const promptGroups = [
  {
    title: "Daily",
    items: [
      "What does our inventory look like right now?",
      "Which SKUs are low on stock right now?",
      "Where is fulfillment getting stuck?",
    ],
  },
  {
    title: "Weekly",
    items: [
      "Which candy is performing best this week?",
      "Compare sour candy and Japanese gummies availability and committed side by side",
      "Give me a bar chart of units sold by category",
    ],
  },
  {
    title: "Monthly + Charts",
    items: [
      "Show me a graph of past 3 months of total sales",
      "Show me a graph of the past three weeks for Hi-Chew Green Apple Fruit Chews",
      "Show revenue by category as a pie chart",
      "Generate a Shopify Liquid collection page for Japanese gummies",
    ],
  },
];

const techStack = [
  { label: "Framework", value: "Next.js 16 + React 19" },
  { label: "LLM", value: "OpenAI gpt-4.1-mini" },
  { label: "Agent pattern", value: "Multi-turn tool calling loop (max 12 iterations)" },
  { label: "Shopify", value: "Admin API — products, inventory, orders (live)" },
  { label: "Operations data", value: "Mock — distributors, warehouse, fulfillment" },
  { label: "Persistence", value: "Convex cloud DB — conversations + messages" },
  { label: "Caching", value: "In-memory — prompt responses + tool results (5-min TTL)" },
  { label: "Charts", value: "Recharts — line, bar, pie with interactive time controls" },
  { label: "Styling", value: "Tailwind CSS v4" },
];

export default function InfoPage() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-[1440px] pl-[88px] md:pl-[96px]">
        <SidebarDock currentRoute="info" />
        <section className="min-w-0">
          <div className="mx-auto max-w-[1100px] space-y-8">

            {/* ── HERO ── */}
            <div className="rounded-[32px] border border-white/70 bg-white/84 p-8 shadow-panel backdrop-blur md:p-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-plum/20 bg-plum/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-plum">
                  {getShopifyModeBadge()}
                </span>
                <span className="rounded-full border border-slate-200 bg-shell px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-600">
                  {getHybridOpsBadge()}
                </span>
                <a
                  href="https://github.com/adam7rans/shopify-agent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-400 hover:text-ink"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                  GitHub
                </a>
              </div>

              <div className="mt-6 max-w-4xl">
                <p className="text-sm uppercase tracking-[0.22em] text-plum/75">About Kandwii</p>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink md:text-5xl">
                  An agentic Shopify operations copilot with persistent conversations and intelligent caching.
                </h1>
                <p className="mt-5 text-base leading-8 text-slate-600">
                  Kandwii helps a store owner understand what is selling, what inventory is
                  at risk, and where fulfillment is getting stuck. It uses a real multi-turn
                  tool-calling loop against live Shopify data — not scripted workflows.
                  Conversations persist across sessions via Convex, and a two-layer cache
                  (prompt-level + tool-level) eliminates redundant API calls and LLM round trips.
                </p>
              </div>
            </div>

            {/* ── ARCHITECTURE DIAGRAM ── */}
            <div className="rounded-[32px] border border-white/70 bg-white/84 p-8 shadow-panel backdrop-blur md:p-10">
              <p className="text-sm uppercase tracking-[0.22em] text-plum/75">System Architecture</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                How Kandwii processes a merchant question
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                A prompt flows from the React frontend through an SSE streaming API route into the
                agent loop. The loop checks for a cached response first — if the same prompt was asked
                within 5 minutes, it returns instantly. Otherwise, OpenAI decides which tools to call,
                tool results are fetched (or served from the tool cache), and the model composes a
                structured JSON response rendered as cards, tables, and charts.
              </p>
              <div className="mt-6">
                <ArchitectureDiagram />
              </div>
            </div>

            {/* ── AGENT LOOP EXAMPLES ── */}
            <div className="rounded-[32px] border border-white/70 bg-white/84 p-8 shadow-panel backdrop-blur md:p-10">
              <p className="text-sm uppercase tracking-[0.22em] text-plum/75">Agent loop in action</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                Multi-step reasoning with real data
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Each tab shows a different merchant question and exactly how the agent loop
                processes it — from cache check through tool calls to validated response.
                Simple queries resolve in one iteration; compound questions chain multiple
                tools across iterations.
              </p>
              <div className="mt-6">
                <AgentLoopExamples />
              </div>
            </div>

            {/* ── HOW IT WORKS ── */}
            <div className="rounded-[32px] border border-white/70 bg-white/84 p-8 shadow-panel backdrop-blur md:p-10">
              <p className="text-sm uppercase tracking-[0.22em] text-plum/75">How the product works</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl bg-shell p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    1. Ask a question
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Type a natural-language question about sales, inventory, reorder risk,
                    fulfillment, or ask for charts and Liquid page generation.
                  </p>
                </div>
                <div className="rounded-2xl bg-shell p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    2. Check cache
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    If the same prompt was asked in this session within 5 minutes,
                    the full response is returned instantly — no OpenAI or Shopify calls.
                  </p>
                </div>
                <div className="rounded-2xl bg-shell p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    3. Agent loop
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    OpenAI runs a multi-turn tool-calling loop — deciding which store data
                    to fetch and calling tools like get_inventory, get_sales_data, or search_products.
                  </p>
                </div>
                <div className="rounded-2xl bg-shell p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    4. Return structure
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Answers come back as insight cards, sortable tables, line/bar/pie charts,
                    side-by-side comparisons, and Liquid template previews — not plain text.
                  </p>
                </div>
                <div className="rounded-2xl bg-shell p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    5. Persist conversation
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Every prompt and response is saved to Convex. Refresh the page or return
                    later — the full conversation restores from the database.
                  </p>
                </div>
                <div className="rounded-2xl bg-shell p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    6. Inspect diagnostics
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Switch to diagnostics mode to see tool traces, data sources, cache hits,
                    query windows, and timing for every agent decision.
                  </p>
                </div>
              </div>
            </div>

            {/* ── PROMPT BANK ── */}
            <div className="rounded-[32px] border border-white/70 bg-white/84 p-8 shadow-panel backdrop-blur md:p-10">
              <p className="text-sm uppercase tracking-[0.22em] text-plum/75">Verified prompts</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                Sample questions to try
              </h2>
              <div className="mt-6 grid gap-5 xl:grid-cols-3">
                {promptGroups.map((group) => (
                  <div
                    key={group.title}
                    className="rounded-[26px] border border-sand/80 bg-shell/75 p-5"
                  >
                    <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
                      {group.title}
                    </p>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                      {group.items.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* ── TECH STACK ── */}
            <div className="rounded-[32px] border border-white/70 bg-white/84 p-8 shadow-panel backdrop-blur md:p-10">
              <p className="text-sm uppercase tracking-[0.22em] text-plum/75">Tech stack</p>
              <div className="mt-5 divide-y divide-slate-100">
                {techStack.map((item) => (
                  <div key={item.label} className="flex gap-4 py-3">
                    <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {item.label}
                    </span>
                    <span className="text-sm text-slate-700">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}
