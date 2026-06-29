"use client";

import { useState } from "react";

type NodeId =
  | "chat-ui"
  | "api-stream"
  | "enhance"
  | "response-cache"
  | "openai"
  | "system-prompt"
  | "tool-executors"
  | "tool-cache"
  | "shopify"
  | "mock-ops"
  | "response-validator"
  | "convex";

interface LoopStep {
  actor: "user" | "openai" | "tool" | "cache" | "validator" | "vision" | "parallel";
  label: string;
  detail: string;
  data?: string;
  flow: NodeId[];
}

interface UseCase {
  id: string;
  tab: string;
  prompt: string;
  description: string;
  iterations: number;
  toolCalls: number;
  steps: LoopStep[];
}

const useCases: UseCase[] = [
  {
    id: "best-sellers",
    tab: "Best sellers this week",
    prompt: "Which candy is performing best this week?",
    description:
      "A straightforward single-tool query. The LLM decides it needs sales data, calls one tool, and composes the response in a single iteration.",
    iterations: 1,
    toolCalls: 1,
    steps: [
      {
        actor: "user",
        label: "Merchant sends prompt",
        detail: '"Which candy is performing best this week?"',
        flow: ["chat-ui", "api-stream"],
      },
      {
        actor: "cache",
        label: "Response cache → miss",
        detail: "No cached response for this prompt. Proceeding to OpenAI.",
        flow: ["response-cache"],
      },
      {
        actor: "openai",
        label: "LLM reasoning (iteration 1)",
        detail:
          'OpenAI receives the prompt + 8 tool definitions. Decides to call get_sales_data with time_query: "this week", sort_by: "units".',
        flow: ["openai", "system-prompt"],
      },
      {
        actor: "tool",
        label: "Tool: get_sales_data",
        detail:
          'Resolves "this week" → Mon Jun 8 to Sat Jun 14 (day grain). Fetches orders from Shopify, ranks products by units sold.',
        data: '{ window: "June 8 – June 14", ordersAnalyzed: 47, totalUnitsSold: 312, topCategory: "Japanese gummies", rows: [{ product: "Hi-Chew Strawberry", unitsSold: 45, revenue: 157.50 }, { product: "Korean Sour Peach Belts", unitsSold: 38, revenue: 171.00 }, { product: "Kasugai Peach Gummy", unitsSold: 31, revenue: 139.50 }, ...7 more] }',
        flow: ["tool-executors", "shopify"],
      },
      {
        actor: "openai",
        label: "LLM composes response",
        detail:
          'No more tools needed. Composes AgentUiResponse JSON with kind: "best_sellers", an insight card (top seller: Hi-Chew Strawberry, 45 units), a product_table with all rows, and suggestedPrompts.',
        flow: ["openai", "response-validator"],
      },
      {
        actor: "validator",
        label: "Response validated",
        detail:
          "JSON parsed successfully. Valid kind, 1 insight card, 1 product_table with 10 rows. Response cached for 5 minutes.",
        flow: ["response-validator", "response-cache"],
      },
    ],
  },
  {
    id: "selling-well-running-low",
    tab: "Selling well but low stock",
    prompt: "What's selling well but running low on inventory?",
    description:
      "A compound question that requires chaining two tools. The LLM first fetches sales data to find top sellers, then fetches inventory to check stock levels, and cross-references the results.",
    iterations: 2,
    toolCalls: 2,
    steps: [
      {
        actor: "user",
        label: "Merchant sends prompt",
        detail: '"What\'s selling well but running low on inventory?"',
        flow: ["chat-ui", "api-stream"],
      },
      {
        actor: "cache",
        label: "Response cache → miss",
        detail: "No cached response. Proceeding to OpenAI.",
        flow: ["response-cache"],
      },
      {
        actor: "openai",
        label: "LLM reasoning (iteration 1)",
        detail:
          'Recognizes this needs two data sources. Calls get_sales_data (time_query: "past 30 days") to identify top sellers first.',
        flow: ["openai", "system-prompt"],
      },
      {
        actor: "tool",
        label: "Tool: get_sales_data",
        detail:
          "Resolves past 30 days → May 15 to Jun 14. Fetches 186 orders, ranks 45 products. Truncates to 3 sample rows + summary for token optimization.",
        data: '{ window: "May 15 – June 14", ordersAnalyzed: 186, totalUnitsSold: 1247, rows: "[truncated — 45 rows]", _summary: { sampleRows: [{ product: "Hi-Chew Strawberry", unitsSold: 189 }, { product: "Korean Sour Peach Belts", unitsSold: 156 }, { product: "Kasugai Peach Gummy", unitsSold: 134 }] } }',
        flow: ["tool-executors", "shopify"],
      },
      {
        actor: "openai",
        label: "LLM reasoning (iteration 2)",
        detail:
          'Tool results are pushed back as role: "tool" messages. Now has top sellers. Decides it also needs stock levels — calls get_inventory with status: "all".',
        flow: ["openai"],
      },
      {
        actor: "tool",
        label: "Tool: get_inventory",
        detail:
          "Fetches inventory levels across all warehouse locations. Aggregates per-SKU: available, committed, incoming, on-hand. Identifies 6 low-stock SKUs.",
        data: '{ count: 45, lowStockCount: 6, rows: "[truncated — 45 rows]", _summary: { sampleRows: [{ product: "Korean Sour Peach Belts", sku: "KR-SOUR-PEACH-010", available: 18, status: "low" }, { product: "Kasugai Peach Gummy", sku: "JP-KASUGAI-PEACH-003", available: 24, status: "low" }] } }',
        flow: ["tool-executors", "shopify"],
      },
      {
        actor: "openai",
        label: "LLM composes response",
        detail:
          'Cross-references sales ranking with inventory status. Composes AgentUiResponse with kind: "inventory_overview", an insight card ("2 of your top 5 sellers are low on stock"), inventory_highlight cards for Korean Sour Peach Belts (18 units) and Kasugai Peach Gummy (24 units), and a product_table with dataFrom: "get_sales_data".',
        flow: ["openai", "response-validator"],
      },
      {
        actor: "validator",
        label: "Response validated + data injected",
        detail:
          'JSON valid. resolveDataFromRefs() injects all 45 rows into the product_table from storedToolResults using the dataFrom reference. Response cached.',
        flow: ["response-validator", "response-cache"],
      },
    ],
  },
  {
    id: "invoices",
    tab: "Scan new invoices",
    prompt: "Any new invoices from suppliers?",
    description:
      "The most complex flow. The agent calls scan_documents, which reads each invoice image with OpenAI Vision, extracts line items, cross-references against Shopify inventory, flags issues, and auto-generates draft supplier emails.",
    iterations: 1,
    toolCalls: 1,
    steps: [
      {
        actor: "user",
        label: "Merchant sends prompt",
        detail: '"Any new invoices from suppliers?"',
        flow: ["chat-ui", "api-stream"],
      },
      {
        actor: "cache",
        label: "Response cache → miss",
        detail: "No cached response. Proceeding to OpenAI.",
        flow: ["response-cache"],
      },
      {
        actor: "openai",
        label: "LLM reasoning (iteration 1)",
        detail:
          "Recognizes this is a document query. Calls scan_documents (no parameters needed). Everything below until \"LLM composes response\" happens inside this single tool call.",
        flow: ["openai"],
      },
      {
        actor: "tool",
        label: "scan_documents → connect to inbox",
        detail:
          "Inside the tool executor: simulates connecting to supplier email inbox. Finds 3 document attachments.",
        flow: ["tool-executors", "mock-ops"],
      },
      {
        actor: "parallel",
        label: "scan_documents → Promise.all (3 documents)",
        detail:
          "All 3 documents are parsed in parallel using Promise.all. Each document independently: (1) calls OpenAI Vision to extract line items, (2) cross-references against Shopify inventory, (3) detects flags and generates draft emails if needed. Results are collected when all 3 resolve.",
        flow: ["tool-executors", "openai", "shopify"],
      },
      {
        actor: "vision",
        label: "  ├ Invoice #SD-2024-0847 (Sweet Distribution Co.)",
        detail:
          "Vision extracts 4 line items, total $692.50. Cross-references inventory — all items matched. No flags.",
        data: '{ supplier: "Sweet Distribution Co.", invoiceNumber: "SD-2024-0847", lineItems: [{ description: "Hi-Chew Strawberry", qty: 100, unitPrice: 1.25, lineTotal: 125.00 }, { description: "Kasugai Peach Gummy", qty: 80, unitPrice: 2.75, lineTotal: 220.00 }, ...2 more], total: 692.50 }',
        flow: ["tool-executors", "openai", "shopify"],
      },
      {
        actor: "vision",
        label: "  ├ Invoice #KSW-4420 (K-Snacks Wholesale)",
        detail:
          "Vision extracts 3 line items, total $582.00. FLAG: Korean Sour Peach Belts — ordered 120, shipped 80 (40 short). Auto-generates backorder follow-up email to support@ksnacks-wholesale.com.",
        data: '{ supplier: "K-Snacks Wholesale", invoiceNumber: "KSW-4420", lineItems: [{ description: "Korean Sour Peach Belts", qty: 120, qtyShipped: 80, backordered: true }, ...2 more], status: "flagged" }',
        flow: ["tool-executors", "openai", "shopify"],
      },
      {
        actor: "vision",
        label: "  └ Delivery #TTD-R-0091 (Tokyo Treats Direct)",
        detail:
          'Vision extracts 2 items. FLAG: Matcha Kit Kat — "crushed packaging, 12 units damaged". Auto-generates damage claim email to claims@tokyotreatsdirect.jp.',
        data: '{ supplier: "Tokyo Treats Direct", invoiceNumber: "TTD-R-0091", lineItems: [{ description: "Matcha Kit Kat", qty: 60, condition: "crushed packaging" }], status: "flagged" }',
        flow: ["tool-executors", "openai", "shopify"],
      },
      {
        actor: "openai",
        label: "LLM composes response",
        detail:
          'Receives all 3 processed documents. Composes AgentUiResponse with kind: "general", answer: "Scanned 3 documents — 1 looks good, 1 partial shipment, 1 damage report. Draft emails are ready." Places 3 invoice_processed cards in primaryCards.',
        flow: ["openai", "response-validator"],
      },
      {
        actor: "validator",
        label: "Response validated",
        detail:
          "JSON valid. 3 invoice_processed cards, each with lineItems, inventoryImpact, and draftEmail fields. Response cached.",
        flow: ["response-validator", "response-cache"],
      },
    ],
  },
];

const nodeConfig: Record<NodeId, { label: string; bg: string; border: string; text: string }> = {
  "chat-ui": { label: "Chat UI", bg: "bg-white", border: "border-blue-200", text: "text-slate-700" },
  "api-stream": { label: "/api/agent/stream", bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-800" },
  "enhance": { label: "enhanceAgentResponse", bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-800" },
  "response-cache": { label: "Response Cache", bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800" },
  "openai": { label: "OpenAI gpt-4.1-mini", bg: "bg-white", border: "border-blue-200", text: "text-slate-700" },
  "system-prompt": { label: "System Prompt", bg: "bg-white", border: "border-blue-200", text: "text-slate-700" },
  "tool-executors": { label: "Tool Executors", bg: "bg-white", border: "border-blue-200", text: "text-slate-700" },
  "tool-cache": { label: "Tool Result Cache", bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800" },
  "shopify": { label: "Shopify Admin API", bg: "bg-white", border: "border-slate-200", text: "text-emerald-700" },
  "mock-ops": { label: "Mock Ops Data", bg: "bg-white", border: "border-slate-200", text: "text-slate-600" },
  "response-validator": { label: "Response Validator", bg: "bg-white", border: "border-blue-200", text: "text-slate-700" },
  "convex": { label: "Convex Cloud DB", bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-800" },
};

const actorStyles: Record<
  LoopStep["actor"],
  { bg: string; border: string; icon: string; label: string }
> = {
  user: { bg: "bg-slate-50", border: "border-slate-200", icon: "💬", label: "User" },
  openai: { bg: "bg-blue-50", border: "border-blue-200", icon: "🤖", label: "OpenAI" },
  tool: { bg: "bg-amber-50", border: "border-amber-200", icon: "🔧", label: "Tool" },
  cache: { bg: "bg-yellow-50", border: "border-yellow-200", icon: "⚡", label: "Cache" },
  validator: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "✅", label: "Validator" },
  vision: { bg: "bg-purple-50", border: "border-purple-200", icon: "👁", label: "Vision" },
  parallel: { bg: "bg-indigo-50", border: "border-indigo-200", icon: "⚡", label: "Parallel" },
};

function FlowNodes({ nodes }: { nodes: NodeId[] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {nodes.map((nodeId, i) => {
        const cfg = nodeConfig[nodeId];
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg width="12" height="8" viewBox="0 0 12 8" className="shrink-0 text-slate-300">
                <path d="M0,4 L8,4 M6,1 L9,4 L6,7" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            )}
            <span
              className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-medium leading-tight ${cfg.bg} ${cfg.border} ${cfg.text}`}
            >
              {cfg.label}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function AgentLoopExamples() {
  const [activeTab, setActiveTab] = useState(0);
  const example = useCases[activeTab];

  return (
    <div className="mx-auto max-w-[720px]">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-shell p-1">
        {useCases.map((uc, i) => (
          <button
            key={uc.id}
            onClick={() => setActiveTab(i)}
            className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
              activeTab === i
                ? "bg-white text-ink shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {uc.tab}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="mt-5 rounded-2xl border border-slate-100 bg-shell/50 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-ink shadow-sm">
            &ldquo;{example.prompt}&rdquo;
          </p>
          <div className="flex gap-2 text-[11px] text-slate-400">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">
              {example.iterations} iteration{example.iterations > 1 ? "s" : ""}
            </span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
              {example.toolCalls} tool call{example.toolCalls > 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-6 text-slate-500">
          {example.description}
        </p>
      </div>

      {/* Steps */}
      <div className="relative mt-5 space-y-0">
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-slate-200" />

        {example.steps.map((step, i) => {
          const style = actorStyles[step.actor];
          return (
            <div key={i} className="relative flex gap-3 py-[6px]">
              <div
                className={`relative z-10 mt-[5px] flex h-[10px] w-[10px] shrink-0 items-center justify-center rounded-full border-2 ${style.border} ${style.bg}`}
                style={{ marginLeft: "14px" }}
              />
              <div
                className={`min-w-0 flex-1 rounded-xl border ${style.border} ${style.bg} px-4 py-3`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{style.icon}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {style.label}
                  </span>
                  <span className="text-[12px] font-medium text-ink">
                    {step.label}
                  </span>
                </div>
                <FlowNodes nodes={step.flow} />
                <p className="mt-2 text-[12px] leading-5 text-slate-600">
                  {step.detail}
                </p>
                {step.data && (
                  <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-white/80 p-3 text-[10px] leading-4 text-slate-500">
                    {step.data}
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
