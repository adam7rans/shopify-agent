# Kandwii — Shopify AI Operations Agent

An AI-powered operations agent for a Shopify store, built as a take-home for Growth Capital. The agent queries live Shopify data through a real tool-calling loop — not scripted workflows — and returns structured UI responses including tables, charts, comparisons, and actionable cards.

**Live demo:** [shopify-agent-tau.vercel.app](https://shopify-agent-tau.vercel.app)

**Video walkthrough:**

[![Video walkthrough](https://img.youtube.com/vi/r_VoB7CMhxU/maxresdefault.jpg)](https://www.youtube.com/watch?v=r_VoB7CMhxU)

## What it does

Ask a question in plain English. The agent decides which tools to call, pulls the right store data from Shopify's Admin API, and returns a structured answer.

- **Inventory queries** — current stock levels, filtered by category or status
- **Sales analytics** — best-sellers, revenue breakdowns, performance over time
- **Charts and visualizations** — bar charts, pie charts, line graphs with interactive time controls
- **Side-by-side comparisons** — compare categories or product lines across metrics
- **Invoice parsing** — upload a supplier PDF/PNG, the agent extracts line items with OpenAI vision, cross-references SKUs against Shopify catalog, and writes inventory updates back to Shopify
- **Email drafts** — generates supplier communication for flagged invoice discrepancies
- **Shopify Liquid generation** — generates collection page templates with live preview
- **Reorder risk** — stockout analysis with velocity-based recommendations
- **Warehouse and fulfillment** — 3PL health checks and fulfillment bottlenecks

If you ask for something outside the current scope, the agent tells you cleanly instead of bluffing.

## Architecture

The entire app runs through one shared agent loop:

1. A prompt comes in through the UI
2. The prompt enters a multi-turn OpenAI tool-calling loop
3. The model decides which tools to call
4. Tool results feed back into the loop as structured data
5. The model can call additional tools if it needs more context
6. The loop ends when the model returns a validated `AgentUiResponse`
7. The frontend renders the response as cards, tables, charts, code blocks, and diagnostics

There is no deterministic workflow router. The model chooses its own tool sequence based on the prompt.

An interactive architecture diagram is available at `/info` in the app.

## Key features

### Diagnostics mode

Toggle between User mode (clean merchant UI) and Diagnostics mode (proof layer). Diagnostics shows:

- Live activity log with every tool call, API request, and cache event
- Tool trace with execution order
- Source labels and query windows
- Token and timing summaries

This lets a reviewer verify the agent is making real tool calls against real data.

### Two-layer caching

- **Prompt-level cache** — identical prompts within the same session return instantly
- **Tool-level cache** — individual tool results (e.g., `get_inventory`) are reused across different prompts that need the same underlying data

Cache entries have a 5-minute TTL. The activity log shows cache hits vs fresh fetches.

### Chat persistence

Conversations are stored in Convex with real-time sync. Each chat gets its own URL (`/c/[id]`), survives page refreshes, and appears in the sidebar recents list.

### Live Shopify writes

The agent doesn't just read from Shopify — it writes back. When you accept an invoice's inventory update, the agent calls Shopify's `inventoryAdjustQuantities` mutation. You can verify the change in the Shopify admin.

### Document parsing with AI vision

Invoice PDFs and images are parsed using OpenAI's vision model. The agent extracts supplier name, invoice number, line items, quantities, and pricing — then cross-references extracted SKUs against the Shopify catalog to identify matches, mismatches, and new items.

## Tech stack

- **Frontend:** Next.js 15, React, Tailwind CSS
- **AI:** OpenAI GPT-4.1-mini with function calling
- **Commerce:** Shopify Admin GraphQL API
- **Database:** Convex (real-time chat persistence)
- **Deployment:** Vercel
- **Document parsing:** OpenAI vision API

## The tool surface

| Tool | What it does |
| --- | --- |
| `search_products` | Filters the product catalog by category, country, tags, sort order, or limit |
| `get_inventory` | Returns current inventory by SKU across locations |
| `get_sales_data` | Returns recent sales rankings from order history |
| `check_reorder_risk` | Calculates stockout risk and reorder recommendations |
| `get_warehouse_health` | Returns warehouse snapshots and fulfillment issues |
| `get_distributor_availability` | Returns supplier and distributor availability data |
| `list_documents` | Lists available supplier documents |
| `parse_document` | Extracts structured data from supplier PDFs/images using AI vision |
| `generate_liquid_template` | Generates Shopify Liquid collection page templates |

Tools are defined in `lib/agent/toolDefinitions.ts`, executed in `lib/agent/toolExecutors.ts`, with business logic in `lib/tools/*.ts`.

## What is live vs mocked

### Live (Shopify Admin API)

- Products, inventory, and locations
- Recent orders and sales data
- Inventory writes (accept/reset)

### Mocked on purpose

- Warehouse / 3PL operational data
- Distributor availability
- Sample supplier documents

The mock data exists because a dev store doesn't have every external business system attached. The agent treats both sources identically.

## File map

```
app/                    Next.js pages and API routes
app/api/agent/          Agent loop endpoints (JSON + streaming)
app/api/inventory/      Shopify inventory write endpoints
app/c/[id]/             Persistent conversation pages
app/info/               Interactive architecture diagram
app/login/              Password gate
components/layout/      Chat shell, conversation rendering, diagnostics panel, sidebar
lib/agent/              System prompt, tool definitions, executors, agent loop, cache
lib/tools/              Sales, inventory, reorder, warehouse, document logic
lib/shopify/            Shopify adapter (live GraphQL + mock), auth helpers
convex/                 Schema, conversation mutations/queries
```

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

See `.env.example` for required environment variables.

### Shopify setup

Generate mock data for local development:

```bash
npm run generate:mock
```

Or connect to a live Shopify store by setting `SHOPIFY_MODE=live` and providing Admin API credentials. Required scopes:

- `read_products`, `write_products`
- `read_inventory`, `write_inventory`
- `read_orders`, `write_orders`
- `read_locations`

## Testing

```bash
npm test                    # unit tests
npm run test:agent-flows    # structured agent-flow smoke tests
npm run test:agent-stream   # streaming diagnostics smoke test
npm run typecheck           # TypeScript checks
npm run lint                # linting
npm run build               # production build
```
