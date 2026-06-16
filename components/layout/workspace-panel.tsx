import type { ConversationTurn, ShellMode } from "@/components/layout/shellTypes";
import type {
  AgentCardBlock,
  AgentTableBlock,
  AgentToolTraceEntry,
  AgentUiResponse,
  CodeCardBlock,
  DiagnosticsSummaryBlock,
  FulfillmentIssueTableBlock,
  InventoryHighlightCardBlock,
  InventoryRiskCardBlock,
  InventoryTableBlock,
  ProductPerformanceTableBlock,
  ReorderDraftCardBlock,
  StockRiskTableBlock,
  TextCardBlock,
  WarehouseRegionCardBlock,
} from "@/types/agentUi";

interface WorkspacePanelProps {
  turns: ConversationTurn[];
  mode: ShellMode;
  onUsePrompt: (prompt: string) => void;
  onRegisterTurnRef?: (id: string, element: HTMLElement | null) => void;
  onRegisterResponseRef?: (id: string, element: HTMLElement | null) => void;
}

function renderInsightCard(card: Extract<AgentCardBlock, { type: "insight" }>) {
  return (
    <div className="w-fit max-w-full rounded-[26px] border border-gold/40 bg-white/98 p-6 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[28ch]">
          <p className="text-sm uppercase tracking-[0.18em] text-gold">Primary insight</p>
          <h3 className="mt-2 text-2xl font-semibold text-ink">{card.title}</h3>
        </div>
        <div className="rounded-full bg-gold/10 px-3 py-1 text-sm font-medium text-gold">
          {card.confidence}
        </div>
      </div>
      <p className="mt-5 max-w-[14ch] text-3xl font-semibold text-ink">{card.metric}</p>
      <p className="mt-4 max-w-[58ch] text-sm leading-7 text-slate-600">{card.explanation}</p>
      <p className="mt-5 max-w-[62ch] rounded-2xl bg-shell px-4 py-3 text-sm leading-6 text-slate-700">
        {card.recommendedAction}
      </p>
    </div>
  );
}

function renderInventoryRiskCard(card: InventoryRiskCardBlock) {
  return (
    <div className="rounded-[24px] border border-coral/20 bg-white/96 p-5 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-coral">Stock risk</p>
          <h3 className="mt-2 text-lg font-semibold text-ink">{card.title}</h3>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] ${
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

function renderInventoryHighlightCard(card: InventoryHighlightCardBlock) {
  return (
    <div className="rounded-[24px] border border-matcha/20 bg-white/96 p-5 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-matcha">Inventory watch</p>
          <h3 className="mt-2 text-lg font-semibold text-ink">{card.title}</h3>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] ${
            card.status === "low" ? "bg-coral/10 text-coral" : "bg-matcha/10 text-matcha"
          }`}
        >
          {card.status}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <p>SKU: {card.sku}</p>
        <p>Locations: {card.locationCount}</p>
        <p>Available: {card.availableInventory}</p>
        <p>On hand: {card.onHandInventory}</p>
        <p className="col-span-2">Regions: {card.regionsLabel}</p>
      </div>
      <p className="mt-4 rounded-2xl bg-shell px-4 py-3 text-sm leading-6 text-slate-700">
        {card.note}
      </p>
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
    <div className="rounded-[24px] border border-sky-200 bg-white/96 p-5 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-sky-700">Regional status</p>
          <h3 className="mt-2 text-lg font-semibold text-ink">{card.title}</h3>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] ${
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

function renderTextCard(card: TextCardBlock) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/96 p-6 shadow-panel">
      <div className="prose prose-slate max-w-none text-sm leading-7">
        {card.content.split("\n\n").map((paragraph, index) => (
          <p key={index} className="mb-3 last:mb-0">{paragraph}</p>
        ))}
      </div>
    </div>
  );
}

function renderCodeCard(card: CodeCardBlock) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white/96 shadow-panel">
      {card.filename ? (
        <div className="flex items-center justify-between border-b border-slate-200 bg-shell px-5 py-3">
          <span className="font-mono text-xs text-slate-600">{card.filename}</span>
          <span className="rounded-full bg-white px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-500">
            {card.language}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-end border-b border-slate-200 bg-shell px-5 py-3">
          <span className="rounded-full bg-white px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-500">
            {card.language}
          </span>
        </div>
      )}
      <pre className="overflow-x-auto bg-[#1e1e2e] p-5 text-sm leading-6 text-[#cdd6f4]">
        <code>{card.content}</code>
      </pre>
    </div>
  );
}

function renderCard(card: AgentCardBlock) {
  if (card.type === "insight") return renderInsightCard(card);
  if (card.type === "inventory_risk") return renderInventoryRiskCard(card);
  if (card.type === "inventory_highlight") return renderInventoryHighlightCard(card);
  if (card.type === "reorder_draft") return renderReorderDraftCard(card);
  if (card.type === "text") return renderTextCard(card);
  if (card.type === "code") return renderCodeCard(card);
  return renderWarehouseRegionCard(card);
}

function tableHeaderChip(label: string) {
  return (
    <span className="rounded-full bg-shell px-3 py-1 uppercase tracking-[0.16em] text-slate-500">
      {label}
    </span>
  );
}

function renderProductTable(table: ProductPerformanceTableBlock) {
  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white/98 shadow-panel">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-base font-semibold text-ink">{table.title}</h3>
        {table.dateWindowLabel || table.ordersIncluded || table.sourceLabel ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {table.dateWindowLabel ? tableHeaderChip(`Window: ${table.dateWindowLabel}`) : null}
            {typeof table.ordersIncluded === "number"
              ? tableHeaderChip(`Orders: ${table.ordersIncluded}`)
              : null}
            {table.sourceLabel ? tableHeaderChip(table.sourceLabel) : null}
          </div>
        ) : null}
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

function renderInventoryTable(table: InventoryTableBlock) {
  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white/98 shadow-panel">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-base font-semibold text-ink">{table.title}</h3>
        {table.sourceLabel ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {tableHeaderChip(table.sourceLabel)}
            {tableHeaderChip(`Rows: ${table.rows.length}`)}
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-shell text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium md:px-6">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Regions</th>
              <th className="px-4 py-3 font-medium">Locations</th>
              <th className="px-4 py-3 font-medium">Available</th>
              <th className="px-4 py-3 font-medium">Committed</th>
              <th className="px-4 py-3 font-medium">Incoming</th>
              <th className="px-4 py-3 font-medium">On hand</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.sku} className="border-t border-slate-100 text-slate-700">
                <td className="px-4 py-3 font-medium text-ink md:px-6">{row.product}</td>
                <td className="px-4 py-3">{row.sku}</td>
                <td className="px-4 py-3">{row.category}</td>
                <td className="px-4 py-3">{row.regions}</td>
                <td className="px-4 py-3">{row.locations}</td>
                <td className="px-4 py-3">{row.availableInventory}</td>
                <td className="px-4 py-3">{row.committedInventory}</td>
                <td className="px-4 py-3">{row.incomingInventory}</td>
                <td className="px-4 py-3">{row.onHandInventory}</td>
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
  if (table.type === "inventory_table") return renderInventoryTable(table);
  return renderIssueTable(table);
}

function renderDiagnosticsSummary(diagnostics: DiagnosticsSummaryBlock) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 bg-shell/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Diagnostics</p>
          <h3 className="mt-2 text-xl font-semibold text-ink">{diagnostics.title}</h3>
        </div>
        {diagnostics.queryWindowLabel ? (
          <span className="rounded-full bg-white px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-500">
            {diagnostics.queryWindowLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {diagnostics.sources.map((source) => (
          <span
            key={source}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-500"
          >
            {source}
          </span>
        ))}
      </div>

      {diagnostics.counts.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {diagnostics.counts.map((count) => (
            <div key={count.label} className="rounded-2xl border border-white/90 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{count.label}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{count.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {diagnostics.notes && diagnostics.notes.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
          {diagnostics.notes.map((note) => (
            <li key={note}>• {note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function renderToolTrace(trace: AgentToolTraceEntry[]) {
  return (
    <details className="rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-5 shadow-panel">
      <summary className="cursor-pointer list-none text-sm uppercase tracking-[0.18em] text-slate-500">
        Tool trace
      </summary>
      <div className="mt-4 space-y-3">
        {trace.map((entry, index) => (
          <div key={`${entry.toolName}-${index}`} className="rounded-2xl bg-shell p-4">
            <p className="text-sm font-semibold text-ink">
              {index + 1}. {entry.toolName}
            </p>
            <p className="mt-2 font-mono text-xs leading-6 text-slate-500">
              {JSON.stringify(entry.input)}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{entry.outputSummary}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

function renderAssistantResponse(result: AgentUiResponse, mode: ShellMode, onUsePrompt: (prompt: string) => void) {
  const shouldHideInventoryHighlightCards =
    result.kind === "inventory_overview" &&
    result.tables.some(
      (table) => table.type === "inventory_table" && /low stock/i.test(table.title),
    );

  const primaryCards = shouldHideInventoryHighlightCards
    ? result.primaryCards.filter((card) => card.type !== "inventory_highlight")
    : result.primaryCards;

  const secondaryCards = shouldHideInventoryHighlightCards
    ? result.secondaryCards.filter((card) => card.type !== "inventory_highlight")
    : result.secondaryCards;

  return (
    <div className="space-y-5">
      <div className="w-fit max-w-full rounded-[28px] border border-white/70 bg-white/88 p-6 shadow-panel backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[58ch]">
            <h2 className="max-w-[20ch] text-3xl font-semibold tracking-tight text-ink">
              {result.answer.title}
            </h2>
            <p className="mt-4 max-w-[58ch] text-base leading-8 text-slate-700">
              {result.answer.body}
            </p>
          </div>
          {mode === "diagnostics" && result.answer.badge ? (
            <div className="rounded-full border border-plum/20 bg-plum/10 px-3 py-1 text-sm font-medium text-plum">
              {result.answer.badge}
            </div>
          ) : null}
        </div>
      </div>

      {result.suggestedPrompts && result.suggestedPrompts.length > 0 ? (
        <div className="rounded-[24px] border border-sand/80 bg-shell/70 p-5">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
            Try one of these prompts next
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {result.suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onUsePrompt(prompt)}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-slate-400"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {primaryCards.length > 0 ? (
        <div className="space-y-4">{primaryCards.map((card) => <div key={`${card.type}-${"sku" in card ? card.sku : "title" in card ? card.title : card.type}`}>{renderCard(card)}</div>)}</div>
      ) : null}

      {secondaryCards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {secondaryCards.map((card) => (
            <div key={`${card.type}-${"sku" in card ? card.sku : "title" in card ? card.title : card.type}`}>{renderCard(card)}</div>
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

      {mode === "diagnostics" ? (
        <div className="space-y-4">
          {result.diagnostics ? renderDiagnosticsSummary(result.diagnostics) : null}
          {renderToolTrace(result.toolTrace)}
        </div>
      ) : null}
    </div>
  );
}

function deriveLoadingMessage(prompt: string): { headline: string; detail: string } {
  const lower = prompt.toLowerCase();

  if (lower.includes("parse") || lower.includes("invoice") || lower.includes("document"))
    return { headline: "Reading the document", detail: "Extracting line items and supplier details from the PDF." };
  if (lower.includes("liquid") || lower.includes("template") || lower.includes("page") || lower.includes("landing"))
    return { headline: "Generating the template", detail: "Fetching product data and writing Shopify Liquid code." };
  if (lower.includes("reorder") || lower.includes("stockout") || lower.includes("risk"))
    return { headline: "Checking reorder risk", detail: "Calculating sales velocity and days-until-stockout for each SKU." };
  if (lower.includes("warehouse") || lower.includes("fulfillment") || lower.includes("shipping") || lower.includes("delay"))
    return { headline: "Scanning warehouse health", detail: "Pulling fulfillment center data and flagging issues." };
  if (lower.includes("inventory") || lower.includes("stock") || lower.includes("low"))
    return { headline: "Looking up inventory", detail: "Aggregating stock levels across all warehouse locations." };
  if (lower.includes("best") || lower.includes("top") || lower.includes("selling") || lower.includes("revenue") || lower.includes("sales"))
    return { headline: "Analyzing sales data", detail: "Crunching order history to rank top performers." };
  if (lower.includes("compare") || lower.includes("match") || lower.includes("cross"))
    return { headline: "Cross-referencing data", detail: "Matching records across multiple data sources." };

  return { headline: "Looking into it", detail: "Querying store data and composing the response." };
}

function renderLoadingState(prompt: string) {
  const { headline, detail } = deriveLoadingMessage(prompt);

  return (
    <div className="rounded-[28px] border border-white/70 bg-white/84 p-6 shadow-panel">
      <p className="text-sm uppercase tracking-[0.18em] text-plum/70">Kandwii is working</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-plum/60" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-plum/60" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-plum/60" style={{ animationDelay: "300ms" }} />
        </div>
        <h3 className="text-2xl font-semibold text-ink">{headline}</h3>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600">{detail}</p>
    </div>
  );
}

function renderErrorState(error: string) {
  return (
    <div className="rounded-[28px] border border-coral/20 bg-white/90 p-6 shadow-panel">
      <p className="text-sm uppercase tracking-[0.18em] text-coral">Request failed</p>
      <h3 className="mt-2 text-2xl font-semibold text-ink">Kandwii hit a problem</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{error}</p>
    </div>
  );
}

export function WorkspacePanel({
  turns,
  mode,
  onUsePrompt,
  onRegisterTurnRef,
  onRegisterResponseRef,
}: WorkspacePanelProps) {
  if (turns.length === 0) {
    return <section className="flex-1" />;
  }

  return (
    <section className="space-y-6 pb-6">
      {turns.map((turn) => (
        <article
          key={turn.id}
          ref={(element) => onRegisterTurnRef?.(turn.id, element)}
          data-turn-id={turn.id}
          className="space-y-4"
        >
          <div className="flex justify-end">
            <div className="max-w-[48ch] rounded-[28px] border border-[#e4d2b3] bg-[#efe4d0] px-5 py-4 text-ink shadow-panel">
              <p className="text-base leading-7">{turn.prompt}</p>
            </div>
          </div>

          <div className="max-w-full pr-0 xl:pr-12">
            <div ref={(element) => onRegisterResponseRef?.(turn.id, element)}>
              {turn.isLoading
                ? renderLoadingState(turn.prompt)
                : turn.error
                  ? renderErrorState(turn.error)
                  : turn.result
                    ? renderAssistantResponse(turn.result, mode, onUsePrompt)
                    : null}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
