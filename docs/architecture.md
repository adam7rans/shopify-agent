# Architecture

## Product surface

Kandwii is a standalone Next.js App Router application that behaves like a merchant-facing operations copilot. The current UI is split into two explicit modes:

- `User mode`
  - default
  - conversational layout
  - onboarding and starter prompts
  - structured answers without backend noise
  - contextual loading indicators while the agent is working
- `Diagnostics mode`
  - same answers
  - adds source labels, query windows, counts, and tool traces from the agentic loop

The app is an AI-powered operational surface for Shopify store operations — not a simple classifier or intent router, but a genuine agentic system where the LLM decides what tools to call, with what parameters, and composes the final structured response.

## High-level structure

- `app/`
  - homepage plus `/api/agent` and `/api/agent/stream`
- `components/layout/`
  - app shell, threaded conversation surface, onboarding, generative UI rendering
- `lib/agent/`
  - agentic tool-calling loop, tool schemas, tool executors, system prompt, response validation
- `lib/shopify/`
  - adapter layer, auth helpers, GraphQL helper
- `lib/tools/`
  - operational data functions used as tool backends
- `lib/mock/`
  - generated demo data
- `types/`
  - domain types and shared UI response types (`AgentUiResponse`)
- `data/generated/`
  - generated JSON runtime artifacts
- `data/sample-documents/`
  - sample PDF invoices and purchase orders for the document parsing tool
- `public/products/`
  - real product images keyed by handle

## Agent architecture

The core of the system is a multi-turn OpenAI tool-calling loop in `lib/agent/agentLoop.ts`. When `OPENAI_API_KEY` is configured, every user prompt goes through this loop:

1. The system prompt (`lib/agent/systemPrompt.ts`) instructs the LLM about available tools, the `AgentUiResponse` JSON schema, and UI composition guidelines
2. The LLM receives the user's prompt and decides which tools to call and with what parameters
3. Tool calls are executed via `lib/agent/toolExecutors.ts`, which dispatches to existing data functions in `lib/tools/`
4. Tool results are appended to the conversation and sent back to the LLM
5. The loop continues (up to 12 iterations) until the LLM produces a final JSON response
6. The response is validated by `lib/agent/responseValidator.ts` and returned to the frontend

This is real agentic behavior: the LLM autonomously decides the sequence and parameters of tool calls based on the user's question. A query like "compare Korean and Japanese gummy inventory" triggers the LLM to call `get_inventory` with different filters and compose a comparison — no hardcoded workflow prescribes this.

### Available tools

Eight tools are defined in `lib/agent/toolDefinitions.ts`:

| Tool | Purpose | Backend |
|------|---------|---------|
| `search_products` | Search/filter the product catalog | `bestSellers.ts` → Shopify adapter |
| `get_inventory` | Inventory levels across locations | `inventoryOverview.ts` → Shopify adapter |
| `get_sales_data` | Sales performance rankings | `bestSellers.ts` → Shopify orders |
| `check_reorder_risk` | Stockout risk and reorder recommendations | `reorderSourCandy.ts` |
| `get_warehouse_health` | Fulfillment center health data | `warehouseHealth.ts` (mock ops) |
| `get_distributor_availability` | Supplier availability and lead times | `reorderSourCandy.ts` (mock ops) |
| `list_documents` | List available PDF documents | `documentParser.ts` |
| `parse_document` | Extract text from supplier PDFs | `documentParser.ts` → pdf-parse |

Each tool executor is a thin adapter — the real data logic lives in `lib/tools/*.ts` and `lib/shopify/`.

### Shared route architecture

Both product API routes now use the same core loop:

- `/api/agent`
  - a thin JSON wrapper around `runAgentLoop(prompt)`
- `/api/agent/stream`
  - an SSE wrapper around `runAgentLoop(prompt, onLog)`

That means the app no longer splits product requests between an agent path and a separate deterministic workflow system. Structured failures stay inside the agent architecture instead of routing into hardcoded business flows.

## Generative UI

The LLM decides which UI components to render based on the query, rather than each workflow always producing the same fixed layout. The system prompt describes the available component types:

**Card types** (in `primaryCards` / `secondaryCards`):
- `insight` — key findings, recommendations, summary metrics
- `inventory_highlight` — flagging specific low-stock SKUs
- `inventory_risk` — stockout risk warnings
- `reorder_draft` — specific reorder recommendations
- `warehouse_region` — regional fulfillment snapshots
- `text` — free-form markdown explanations
- `code` — Shopify Liquid templates or other code output

**Table types** (in `tables`):
- `product_table` — sales/revenue rankings
- `inventory_table` — stock level views
- `risk_table` — reorder risk assessments
- `issue_table` — warehouse problem tracking

The LLM composes these components in whatever combination best answers the question. A simple factual answer might produce one insight card and a table; a cross-referencing query might produce text blocks, multiple tables, and risk cards.

## Shopify Liquid page generation

When asked to generate Shopify pages, the LLM:
1. Calls `search_products` to fetch real product data (handles, titles, prices)
2. Generates valid Shopify Liquid template code referencing real product handles
3. Returns the code in a `code` block with `language: "liquid"`

Product images are served from `/products/{handle}.png` and reference real downloaded product photos keyed by product handle.

## Document parsing

The agent can parse supplier PDF documents (invoices, purchase orders) from `data/sample-documents/`:
- `tokyo-treats-invoice-2024.pdf`
- `korea-snacks-po-0042.pdf`
- `seasonal-restock-q3.pdf`

The `parse_document` tool extracts text content using `pdf-parse`, and the LLM can cross-reference parsed SKUs against live inventory by calling `get_inventory` in the same turn.

## Shopify adapter layer

The Shopify seam is defined by:

- `lib/shopify/types.ts`
- `lib/shopify/mockShopifyClient.ts`
- `lib/shopify/liveShopifyClient.ts`
- `lib/shopify/index.ts`

All product, inventory, and order access goes through this contract.

### Why this matters

It keeps the tools and UI agnostic to whether the source is:

- generated mock data, or
- live Shopify Admin GraphQL

That mock-first structure made it possible to build and demo the app before live credentials were ready, then layer in live Shopify later without rewriting tool logic.

## Mock mode vs live mode

### Mock mode

- generated Kandwii catalog (~50 Japanese and Korean candy products)
- generated orders (six-month history)
- generated inventory
- generated fulfillment and distributor ops

### Live mode

- live Shopify products
- live Shopify inventory
- live Shopify Orders for analytics when access is available
- mocked external operations systems remain in place:
  - distributors
  - warehouse issue events
  - fulfillment health snapshots

This is deliberate. Shopify is the commerce source of truth, while warehouse / supplier / 3PL systems are treated as separate operational systems.

## Generated mock data

Generators in `lib/mock/` produce deterministic data for:

- ~50 Japanese and Korean candy and snack products
- six-month order-style history
- daily sales metrics
- inventory rows
- distributor availability
- fulfillment centers
- warehouse health snapshots
- fulfillment issue events

The generator script:

- `scripts/generate-mock-data.ts`

writes JSON into `data/generated/`.

Those same product definitions also feed the Shopify sync script so seeded live catalog data stays aligned with mock mode.

## Shared `AgentUiResponse`

All agent responses return the same UI contract from `types/agentUi.ts`.

That model supports:

- answer block (title + body + optional badge)
- primary cards (1-2 key findings)
- secondary cards (supporting details)
- tables (data views)
- diagnostics summary
- tool trace (every tool call the agent made)
- suggested prompts

The response validator in `lib/agent/responseValidator.ts` ensures the LLM's JSON output conforms to this schema, filling in defaults for missing optional fields.

## UI model

The current UI is a threaded conversation surface:

- the user submits a question
- a contextual loading state shows what the agent is working on (e.g., "Reading the document", "Fetching product data")
- the agent calls tools and composes a response
- the assistant response renders structured UI components in-thread

### In user mode

- diagnostics are hidden
- the surface is oriented around understanding and action

### In diagnostics mode

- the same thread shows:
  - diagnostics summary
  - a real-time activity log panel
  - source badges
  - query windows
  - counts
  - tool trace (every tool the LLM called, with inputs and summaries)

This split makes the app more legible to a first-time merchant while still supporting reviewer and demo transparency.

## Live Shopify path

Live Shopify support currently includes:

- token helper in `lib/shopify/token.ts`
- sanitized Admin GraphQL helper in `lib/shopify/graphql.ts`
- live client methods for:
  - products
  - inventory
  - recent orders

Supporting scripts:

- `scripts/test-shopify-live.ts`
- `scripts/sync-shopify-products.ts`
- `scripts/seed-shopify-orders.ts`
- `scripts/generate-product-images.ts`
- `scripts/test-agent-flows.ts`
- `scripts/test-agent-stream.ts`

## Future path

The most likely next production-facing steps are:

- add Convex for conversation persistence, tool logs, cached analytics, and app data
- expand tool set with write operations (place reorder, update inventory)
- add supplier and warehouse directory questions
- add multi-modal inputs (upload an invoice photo, paste a screenshot)
- broader financial reporting and trend analysis
