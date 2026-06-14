# Kandwii Shopify AI Agent

Kandwii Shopify AI Agent is a desktop-first Shopify-connected demo app for a fictional Japanese and Korean candy shop. It shows how an AI store-operations assistant can interpret questions, call tools, and return structured UI for merchandising, inventory, and fulfillment decisions.

## What this app demonstrates

- A mock-first Shopify adapter that keeps the app usable before live Shopify credentials are available
- Deterministic operational flows backed by generated Kandwii data
- A lightweight LLM intent router that can classify prompts into supported store-ops workflows
- A deterministic fallback path when OpenAI is unavailable or rate-limited
- Structured generative UI with answers, cards, tables, and tool traces

## Tech stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Node.js
- Shopify Admin API adapter layer
- OpenAI-compatible intent routing

## Supported prompts

The current demo supports these store questions and nearby aliases:

- `What were our best-selling candies last month?`
- `What is the most popular candy?`
- `Show me top sellers`
- `Do we need to reorder sour candy?`
- `Should we reorder sour candy?`
- `What sour candy is at risk of stockout?`
- `Show me warehouse issues globally.`
- `Which warehouse has problems?`
- `Are there any fulfillment delays?`

Unsupported prompts return a normal in-product response that explains the current demo scope and suggests working prompts.

## Architecture overview

- `app/`
  - Next.js App Router entry points and the `/api/agent` route
- `components/layout/`
  - Desktop-first shell, command panel, and shared results workspace
- `lib/shopify/`
  - Shopify adapter contract plus mock and live client implementations
- `lib/tools/`
  - Existing deterministic business flows for best sellers, sour reorder, and warehouse health
- `lib/agent/`
  - Intent routing layer with OpenAI-compatible LLM routing and deterministic fallback
- `lib/mock/`
  - Deterministic mock catalog and operations data generators
- `types/agentUi.ts`
  - Shared `AgentUiResponse` model used by every supported flow
- `data/generated/`
  - Materialized mock data used by the adapter and operational tools

More detail is in [docs/architecture.md](/Users/adam/Documents/Kandwii/docs/architecture.md).

## Mock-first Shopify adapter

The app is intentionally mock-first. All Shopify-like product, order, and inventory reads go through:

- `lib/shopify/types.ts`
- `lib/shopify/mockShopifyClient.ts`
- `lib/shopify/liveShopifyClient.ts`
- `lib/shopify/index.ts`

That means the UI and tools never read generated Shopify-like data directly. In local demo mode, `SHOPIFY_MODE=mock` loads generated JSON from `data/generated/`. The live client remains the future seam for Shopify Admin GraphQL once store credentials are supplied.

## LLM intent routing and fallback

The app supports four intents:

- `best_sellers`
- `sour_reorder`
- `warehouse_health`
- `unsupported`

Routing behavior:

- If `OPENAI_API_KEY` is present, `/api/agent` attempts OpenAI-compatible intent routing first.
- If the LLM call succeeds, the agent trace shows `mode: "llm"`.
- If the LLM call fails or is unavailable, the app falls back to deterministic routing.
- Fallback traces include sanitized diagnostics only: HTTP status, provider code or type when available, a short safe message, and the fallback mode.

Current OpenAI quota or rate-limit failures are expected to degrade gracefully. The demo continues working through deterministic routing, and the tool trace makes that visible without exposing secrets or raw provider payloads.

## Environment variables

Create a local `.env.local` file in the project root. `.env.local` is ignored by Git and must never be committed.

Start from [.env.example](/Users/adam/Documents/Kandwii/.env.example):

- `SHOPIFY_MODE=mock`
- `SHOPIFY_SHOP_DOMAIN=kandwii.myshopify.com`
- `SHOPIFY_ADMIN_ACCESS_TOKEN=`
- `SHOPIFY_API_VERSION=2025-10`
- `DEMO_NOW=2026-06-14`
- `NEXT_PUBLIC_APP_NAME=Kandwii`
- `OPENAI_API_KEY=`
- `OPENAI_BASE_URL=https://api.openai.com/v1`
- `OPENAI_MODEL=gpt-4.1-mini`

## Local setup

Install dependencies:

```bash
npm install
```

Generate deterministic mock data:

```bash
npm run generate:mock
```

Optionally verify the Shopify mock adapter:

```bash
npm run test:mock-shopify
```

Start the local dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing the flows

Run the agent route smoke test with the dev server running:

```bash
npm run test:agent-flows
```

That script verifies:

- best sellers returns `best_sellers`
- sour reorder returns `sour_reorder`
- warehouse issues returns `warehouse_health`
- unsupported prompts return `unsupported`

It also checks that an answer and tool trace are present.

## Security notes

- `.env.local` is ignored by Git.
- API keys must never be committed.
- The app does not expose raw `OPENAI_API_KEY` values in logs, traces, or docs.
- Fallback diagnostics intentionally avoid request headers and raw provider payloads.

## Submission-oriented docs

- [Architecture notes](/Users/adam/Documents/Kandwii/docs/architecture.md)
- [Demo script](/Users/adam/Documents/Kandwii/docs/demo-script.md)
- [Submission notes](/Users/adam/Documents/Kandwii/docs/submission-notes.md)
