import { SidebarDock } from "@/components/layout/sidebar-dock";
import { getHybridOpsBadge, getShopifyModeBadge } from "@/lib/shopify";

export const dynamic = "force-dynamic";

const promptGroups = [
  {
    title: "Sales",
    items: [
      "Which candy is performing best?",
      "What are our best-selling candies recently?",
      "Show the top 10 sellers over the past six months.",
    ],
  },
  {
    title: "Inventory",
    items: [
      "What does our inventory look like?",
      "Which SKUs are low on stock?",
      "Do we need to reorder sour candy?",
    ],
  },
  {
    title: "Operations",
    items: [
      "Where is fulfillment getting stuck?",
      "Show me warehouse issues globally.",
      "What is this app for?",
    ],
  },
];

export default function InfoPage() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-[1440px] pl-[88px] md:pl-[96px]">
        <SidebarDock currentRoute="info" />
        <section className="min-w-0">
          <div className="mx-auto max-w-[1100px] rounded-[32px] border border-white/70 bg-white/84 p-8 shadow-panel backdrop-blur md:p-10">
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
                Kandwii is a Shopify-connected operations copilot for merchant
                questions.
              </h1>
              <p className="mt-5 text-base leading-8 text-slate-600">
                It helps a store owner understand what is selling, what inventory is
                at risk, and where fulfillment is getting stuck. The app uses live
                Shopify products, inventory, and orders when available, while keeping
                external operations systems like distributors and warehouse issues
                mocked for demo clarity.
              </p>
            </div>

            <div className="mt-10 grid gap-5 xl:grid-cols-3">
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

            <div className="mt-10 rounded-[26px] border border-dashed border-slate-300 bg-white/90 p-6">
              <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
                How the product works
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-shell p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    1. Ask a question
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Ask about sales, inventory, reorder risk, or fulfillment health.
                  </p>
                </div>
                <div className="rounded-2xl bg-shell p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    2. Route the intent
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Kandwii uses LLM routing with deterministic fallback to select the
                    right supported workflow.
                  </p>
                </div>
                <div className="rounded-2xl bg-shell p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    3. Return structure
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Answers come back as cards, tables, and operational summaries
                    rather than just plain text.
                  </p>
                </div>
                <div className="rounded-2xl bg-shell p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    4. Inspect diagnostics
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Switch to diagnostics mode from the avatar menu to see traces,
                    sources, and query windows for each answer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
