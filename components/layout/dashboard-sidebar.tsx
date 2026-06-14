const healthStats = [
  { label: "Store mode", value: "Mock Shopify" },
  { label: "Catalog target", value: "~30 candies" },
  { label: "History window", value: "6 months" },
];

export function DashboardSidebar() {
  return (
    <aside className="w-full max-w-full rounded-[28px] border border-white/70 bg-white/75 p-5 shadow-panel backdrop-blur lg:max-w-[320px]">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.24em] text-plum/70">Kandwii</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Candy ops cockpit
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Desktop-first shell for a Shopify-connected AI store operations app.
        </p>
      </div>

      <div className="space-y-3">
        {healthStats.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-sand/70 bg-shell/90 p-4"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {item.label}
            </p>
            <p className="mt-2 text-lg font-medium text-ink">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-plum/30 bg-plum/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-plum">Upcoming panels</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Store health, alert summaries, suggested actions, and regional issue snapshots
          will live here next.
        </p>
      </div>
    </aside>
  );
}
