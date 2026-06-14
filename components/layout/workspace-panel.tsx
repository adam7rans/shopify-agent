import type {
  AgentCardBlock,
  AgentTableBlock,
  AgentUiResponse,
  FulfillmentIssueTableBlock,
  InventoryRiskCardBlock,
  ProductPerformanceTableBlock,
  ReorderDraftCardBlock,
  StockRiskTableBlock,
  WarehouseRegionCardBlock,
} from "@/types/agentUi";

interface WorkspacePanelProps {
  result: AgentUiResponse | null;
}

function renderInsightCard(card: Extract<AgentCardBlock, { type: "insight" }>) {
  return (
    <div className="rounded-[26px] border border-gold/40 bg-white/98 p-6 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-gold">Primary insight</p>
          <h3 className="mt-2 text-2xl font-semibold text-ink">{card.title}</h3>
        </div>
        <div className="rounded-full bg-gold/10 px-3 py-1 text-sm font-medium text-gold">
          {card.confidence}
        </div>
      </div>
      <p className="mt-5 text-3xl font-semibold text-ink">{card.metric}</p>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">{card.explanation}</p>
      <p className="mt-5 rounded-2xl bg-shell px-4 py-3 text-sm leading-6 text-slate-700">
        {card.recommendedAction}
      </p>
    </div>
  );
}

function renderInventoryRiskCard(card: InventoryRiskCardBlock) {
  return (
    <div className="rounded-2xl border border-coral/20 bg-white/96 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-coral">Inventory risk</p>
          <h3 className="mt-2 text-lg font-semibold text-ink">{card.title}</h3>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            card.severity === "high" ? "bg-coral/10 text-coral" : "bg-gold/10 text-gold"
          }`}
        >
          {card.severity}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <p>SKU: {card.sku}</p>
        <p>Available: {card.availableInventory}</p>
        <p>Velocity: {card.dailySalesVelocity.toFixed(2)}/day</p>
        <p>Stockout: {card.daysUntilStockout.toFixed(1)} days</p>
        <p>Lead time: {card.leadTimeDays} days</p>
        <p>Reorder: {card.recommendedCases} cases</p>
      </div>
    </div>
  );
}

function renderReorderDraftCard(card: ReorderDraftCardBlock) {
  return (
    <div className="rounded-[26px] border border-matcha/30 bg-white/98 p-6 shadow-panel">
      <p className="text-sm uppercase tracking-[0.18em] text-matcha">Recommendation</p>
      <h3 className="mt-2 text-2xl font-semibold text-ink">{card.title}</h3>
      <div className="mt-5 grid gap-3 text-sm text-slate-700 md:grid-cols-2 xl:grid-cols-4">
        <p>Supplier: {card.supplierName}</p>
        <p>SKU: {card.sku}</p>
        <p>Quantity: {card.recommendedCases} cases / {card.recommendedUnits} units</p>
        <p>Estimated cost: ${card.estimatedCost.toFixed(2)}</p>
        <p>Lead time: {card.leadTimeDays} days</p>
        <p>Projected stockout: {card.daysUntilStockout.toFixed(1)} days</p>
        <p className="md:col-span-2 xl:col-span-2">Next restock date: {card.nextRestockDate}</p>
      </div>
      <p className="mt-5 rounded-2xl bg-shell px-4 py-3 text-sm leading-7 text-slate-700">
        {card.rationale}
      </p>
    </div>
  );
}

function renderWarehouseRegionCard(card: WarehouseRegionCardBlock) {
  return (
    <div className="rounded-2xl border border-sky-200 bg-white/96 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-sky-700">Regional status</p>
          <h3 className="mt-2 text-lg font-semibold text-ink">{card.title}</h3>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            card.severity === "high"
              ? "bg-coral/10 text-coral"
              : card.severity === "medium"
                ? "bg-gold/10 text-gold"
                : "bg-matcha/10 text-matcha"
          }`}
        >
          {card.severity}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <p>Region: {card.region}</p>
        <p>Center: {card.centerLabel}</p>
        <p>Available: {card.availableInventory}</p>
        <p>Committed: {card.committedInventory}</p>
        <p>Delayed: {card.delayedShipments}</p>
        <p>Avg fulfill: {card.averageFulfillmentHours} hrs</p>
      </div>
    </div>
  );
}

function renderCard(card: AgentCardBlock) {
  if (card.type === "insight") return renderInsightCard(card);
  if (card.type === "reorder_draft") return renderReorderDraftCard(card);
  if (card.type === "warehouse_region") return renderWarehouseRegionCard(card);
  return renderInventoryRiskCard(card);
}

function renderProductTable(table: ProductPerformanceTableBlock) {
  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white/98 shadow-panel">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-base font-semibold text-ink">{table.title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-shell text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium md:px-6">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Units sold</th>
              <th className="px-4 py-3 font-medium">Revenue</th>
              <th className="px-4 py-3 font-medium">Margin</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.sku} className="border-t border-slate-100 text-slate-700">
                <td className="px-4 py-3 font-medium text-ink md:px-6">{row.product}</td>
                <td className="px-4 py-3">{row.sku}</td>
                <td className="px-4 py-3">{row.category}</td>
                <td className="px-4 py-3">{row.unitsSold}</td>
                <td className="px-4 py-3">${row.revenue.toFixed(2)}</td>
                <td className="px-4 py-3">${row.margin.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderRiskTable(table: StockRiskTableBlock) {
  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white/98 shadow-panel">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-base font-semibold text-ink">{table.title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-shell text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium md:px-6">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Available</th>
              <th className="px-4 py-3 font-medium">30d units</th>
              <th className="px-4 py-3 font-medium">Velocity</th>
              <th className="px-4 py-3 font-medium">Stockout days</th>
              <th className="px-4 py-3 font-medium">Lead time</th>
              <th className="px-4 py-3 font-medium">Reorder cases</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.sku} className="border-t border-slate-100 text-slate-700">
                <td className="px-4 py-3 font-medium text-ink md:px-6">{row.product}</td>
                <td className="px-4 py-3">{row.sku}</td>
                <td className="px-4 py-3">{row.availableInventory}</td>
                <td className="px-4 py-3">{row.recentUnitsSold}</td>
                <td className="px-4 py-3">{row.dailySalesVelocity.toFixed(2)}</td>
                <td className="px-4 py-3">{row.daysUntilStockout.toFixed(1)}</td>
                <td className="px-4 py-3">{row.leadTimeDays}</td>
                <td className="px-4 py-3">{row.recommendedCases}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderIssueTable(table: FulfillmentIssueTableBlock) {
  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white/98 shadow-panel">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-base font-semibold text-ink">{table.title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-shell text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium md:px-6">Warehouse</th>
              <th className="px-4 py-3 font-medium">Region</th>
              <th className="px-4 py-3 font-medium">Issue</th>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Impacted orders</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, index) => (
              <tr
                key={`${row.warehouse}-${row.issueType}-${index}`}
                className="border-t border-slate-100 text-slate-700"
              >
                <td className="px-4 py-3 font-medium text-ink md:px-6">{row.warehouse}</td>
                <td className="px-4 py-3">{row.region}</td>
                <td className="px-4 py-3 capitalize">{row.issueType}</td>
                <td className="px-4 py-3 capitalize">{row.severity}</td>
                <td className="px-4 py-3">{row.impactedOrders}</td>
                <td className="px-4 py-3 capitalize">{row.status}</td>
                <td className="px-4 py-3">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderTable(table: AgentTableBlock) {
  if (table.type === "product_table") return renderProductTable(table);
  if (table.type === "risk_table") return renderRiskTable(table);
  return renderIssueTable(table);
}

export function WorkspacePanel({ result }: WorkspacePanelProps) {
  return (
    <section className="mt-4 space-y-4">
      {result ? (
        <>
          <div className="rounded-[28px] border border-white/70 bg-white/88 p-6 shadow-panel backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-4xl">
                <p className="text-sm uppercase tracking-[0.2em] text-plum/70">
                  Assistant answer
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
                  {result.answer.title}
                </h2>
                <p className="mt-4 text-base leading-8 text-slate-700">{result.answer.body}</p>
              </div>
              {result.answer.badge ? (
                <div className="rounded-full border border-plum/20 bg-plum/10 px-3 py-1 text-sm font-medium text-plum">
                  {result.answer.badge}
                </div>
              ) : null}
            </div>
          </div>

          {result.suggestedPrompts && result.suggestedPrompts.length > 0 ? (
            <div className="rounded-[24px] border border-sand/80 bg-shell/70 p-5">
              <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
                Try one of these prompts
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {result.suggestedPrompts.map((prompt) => (
                  <div
                    key={prompt}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700"
                  >
                    {prompt}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {result.primaryCards.length > 0 ? (
            <div className="space-y-4">
              {result.primaryCards.map((card) => (
                <div key={`${card.type}-${"sku" in card ? card.sku : card.title}`}>
                  {renderCard(card)}
                </div>
              ))}
            </div>
          ) : null}

          {result.secondaryCards.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {result.secondaryCards.map((card) => (
                <div key={`${card.type}-${"sku" in card ? card.sku : card.title}`}>
                  {renderCard(card)}
                </div>
              ))}
            </div>
          ) : null}

          {result.tables.length > 0 ? (
            <div className="space-y-4">
              {result.tables.map((table) => (
                <div key={`${table.type}-${table.title}`}>{renderTable(table)}</div>
              ))}
            </div>
          ) : null}

          <details className="rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-5 shadow-panel" open>
            <summary className="cursor-pointer list-none text-sm uppercase tracking-[0.18em] text-slate-500">
              Tool-call trace
            </summary>
            <div className="mt-4 space-y-3">
              {result.toolTrace.map((entry, index) => (
                <div key={`${entry.toolName}-${index}`} className="rounded-2xl bg-shell p-4">
                  <p className="text-sm font-semibold text-ink">
                    {index + 1}. {entry.toolName}
                  </p>
                  <p className="mt-2 font-mono text-xs leading-6 text-slate-500">
                    {JSON.stringify(entry.input)}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {entry.outputSummary}
                  </p>
                </div>
              ))}
            </div>
          </details>
        </>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/90 p-6 shadow-panel">
            <h3 className="text-xl font-semibold text-ink">Structured results will appear here</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              The workspace now reserves full width for assistant answers, primary cards,
              supporting tables, and tool traces so both demo flows stay clean as we add more.
            </p>
          </div>
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/90 p-6 shadow-panel">
            <h3 className="text-xl font-semibold text-ink">Current supported flows</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Use the prompt buttons above to run best-sellers, sour reorder / stockout,
              or the global warehouse / fulfillment issues flow.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
