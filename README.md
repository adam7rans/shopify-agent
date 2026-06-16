# Kandwii Shopify AI Agent

Kandwii is a Shopify-connected AI operations demo for a fictional Japanese and Korean candy shop. It is designed to answer a focused set of merchant questions with structured results instead of raw chat text: what is selling, what inventory is at risk, and where fulfillment is breaking down.

## What the app demonstrates

- A mock-first Shopify adapter that can switch between generated demo data and live Shopify Admin GraphQL reads
- A merchant-facing **User mode** and a reviewer-facing **Diagnostics mode**
- Live Shopify product, inventory, and seeded order analytics when `SHOPIFY_MODE=live`
- Structured answers rendered as insight cards, reorder cards, tables, diagnostics summaries, and tool traces
- OpenAI-compatible intent routing with deterministic fallback when the LLM is unavailable

## Tech stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Node.js
- Shopify Admin GraphQL API
- OpenAI-compatible routing layer

## Supported question families

### Sales performance

- `Which candy is performing best?`
- `What are our best-selling candies recently?`
- `What were our best-selling candies last month?`
- `Show the top 10 sellers over the past six months.`

### Inventory visibility

- `What does our inventory look like?`
- `Show me our inventory`
- `Which SKUs are low on stock?`

### Reorder / stockout

- `Do we need to reorder sour candy?`
- `Should we reorder sour candy?`
- `What sour candy is at risk of stockout?`

### Fulfillment health

- `Show me warehouse issues globally.`
- `Which warehouse has problems?`
- `Are there any fulfillment delays?`

### Onboarding / help

- `What is this app for?`
- `What can I ask?`
- `How do I use this app?`

Unsupported prompts return a normal in-product response with suggested next questions.

## Product modes

### User mode

User mode is the default experience. It keeps the interface conversational and hides backend detail by default. The goal is to make Kandwii feel understandable to a merchant who is opening the app for the first time.

### Diagnostics mode

Diagnostics mode keeps the same answers and structured UI, but adds:

- the high-level intent-routing decision
- source labels such as `Live Shopify`, `Live Shopify Orders`, and `Mock ops`
- query windows
- summarized counts
- the tool trace

Diagnostics mode never exposes secrets, raw provider payloads, request headers, or tokens.

## Architecture overview

- `app/`
  - Next.js pages and `/api/agent`
- `components/layout/`
  - app shell, conversation UI, onboarding, result rendering, and diagnostics rendering
- `lib/shopify/`
  - mock and live Shopify clients behind a shared adapter contract
- `lib/tools/`
  - deterministic flows for sales, inventory, reorder, and warehouse health
- `lib/agent/`
  - OpenAI-compatible intent routing plus deterministic fallback
- `types/agentUi.ts`
  - shared `AgentUiResponse` contract for cards, tables, diagnostics, and trace
- `data/generated/`
  - deterministic mock catalog and operations data

For more detail, see [docs/architecture.md](/Users/adam/Documents/Kandwii/docs/architecture.md).

## Mock-first Shopify adapter

All product, inventory, and order reads go through:

- `lib/shopify/types.ts`
- `lib/shopify/mockShopifyClient.ts`
- `lib/shopify/liveShopifyClient.ts`
- `lib/shopify/index.ts`

That means the UI and business flows never read raw generated Shopify-like data directly.

### Shopify modes

- `SHOPIFY_MODE=mock`
  - generated Kandwii JSON-backed Shopify data
- `SHOPIFY_MODE=live`
  - live Shopify Admin GraphQL for products, inventory, and recent orders
  - mocked warehouse / distributor / fulfillment-ops systems remain separate on purpose

## Current live behavior

When live Shopify mode is enabled and the app has order access:

- products come from live Shopify
- inventory comes from live Shopify
- best-sellers uses live Shopify Orders
- sour reorder uses live Shopify Orders for 30-day sales velocity
- warehouse / fulfillment remains `Live Shopify + Mock ops`

### Best-sellers date-window behavior

- `Which candy is performing best?`
  - prefers the latest 30-day live order window
- `What are our best-selling candies recently?`
  - prefers the latest 30-day live order window
- `What were our best-selling candies last month?`
  - tries the previous calendar month first
  - if that month has zero orders, it falls back to the latest 30-day live order window
  - if needed, it falls back again to the latest 60-day live order window

The answer and diagnostics trace both explain which window was used.

## LLM intent routing and deterministic fallback

The current supported intents are:

- `best_sellers`
- `inventory_overview`
- `sour_reorder`
- `warehouse_health`
- `unsupported`

Routing behavior:

- if `OPENAI_API_KEY` is present, Kandwii attempts OpenAI-compatible LLM routing first
- if the LLM succeeds, the trace shows `mode: "llm"`
- if the LLM fails or is unavailable, the app falls back to deterministic routing
- fallback traces include only sanitized diagnostics such as status, provider code/type when available, a short safe message, and the fallback mode

## Environment variables

Create a local `.env.local` file in the project root. `.env.local` is ignored by Git and must never be committed.

Start from [.env.example](/Users/adam/Documents/Kandwii/.env.example):

- `SHOPIFY_MODE=mock`
- `SHOPIFY_SHOP_DOMAIN=kandwii.myshopify.com`
- `SHOPIFY_API_VERSION=2026-04`
- `SHOPIFY_CLIENT_ID=`
- `SHOPIFY_CLIENT_SECRET=`
- `SHOPIFY_ADMIN_ACCESS_TOKEN=`
- `OPENAI_API_KEY=`
- `OPENAI_BASE_URL=https://api.openai.com/v1`
- `OPENAI_MODEL=gpt-4.1-mini`
- `DEMO_NOW=2026-06-14`
- `NEXT_PUBLIC_APP_NAME=Kandwii`

## Shopify scopes

For the current live implementation, use:

- `read_products`
- `write_products`
- `read_inventory`
- `write_inventory`
- `read_orders`
- `write_orders`
- `read_locations`

## Local setup

Install dependencies:

```bash
npm install
```

Generate deterministic mock data:

```bash
npm run generate:mock
```

Verify the adapters:

```bash
npm run test:mock-shopify
npm run test:shopify-live
```

Sync the catalog into Shopify if needed:

```bash
npm run sync:shopify-products
```

Seed development-store demo orders if needed:

```bash
npm run seed:shopify-orders
```

Start the local app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing the flows

Run the agent smoke test with the app server running:

```bash
npm run test:agent-flows
```

That verifies:

- `best_sellers`
- `inventory_overview`
- `sour_reorder`
- `warehouse_health`
- `unsupported`

It also checks that a normal answer and tool trace are present.

## Security note

- `.env.local` is ignored by Git
- API keys, Shopify secrets, and tokens must never be committed
- diagnostics and traces are intentionally sanitized
- the client never receives raw Shopify or OpenAI secret values

## Vercel setup later

When you want live production mode on Vercel, set:

- `SHOPIFY_MODE=live`
- `SHOPIFY_SHOP_DOMAIN`
- `SHOPIFY_API_VERSION`
- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `DEMO_NOW`

Then redeploy and verify:

- the diagnostics endpoint resolves live mode
- the sidebar mode badge shows `Live Shopify`
- best-sellers and sour reorder use live Shopify data
