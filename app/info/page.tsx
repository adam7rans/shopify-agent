import { SidebarDock } from "@/components/layout/sidebar-dock";
import { ArchitectureDiagram } from "@/components/layout/architecture-diagram";
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
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-plum/20 bg-plum/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-plum">
                  {getShopifyModeBadge()}
                </span>
                <span className="rounded-full border border-slate-200 bg-shell px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-600">
                  {getHybridOpsBadge()}
                </span>
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
