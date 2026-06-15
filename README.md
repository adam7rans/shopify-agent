# Kandwii Shopify AI Agent

Kandwii Shopify AI Agent is a desktop-first Shopify-connected demo app for a fictional Japanese and Korean candy shop. It shows how an AI store-operations assistant can interpret questions, call tools, and return structured UI for merchandising, inventory, and fulfillment decisions.

## What this app demonstrates

- A mock-first Shopify adapter that keeps the app usable before live Shopify credentials are available
- A live Shopify Admin GraphQL path for products, inventory, and recent orders
- Live Shopify product, inventory, and seeded order analytics in local live mode
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
- `What are our best-selling candies recently?`
- `What is the most popular candy?`
- `Which candy is performing best?`
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

### Modes

- `SHOPIFY_MODE=mock`
  - Uses generated Kandwii JSON data from `data/generated/`
- `SHOPIFY_MODE=live`
  - Uses Shopify Admin GraphQL for products, inventory, and recent orders
  - Uses seeded live Shopify Orders for sales analytics when order access is available
  - Keeps distributor, warehouse, and fulfillment-ops data mocked

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

## Live analytics behavior

When `SHOPIFY_MODE=live` is enabled and the app has Shopify Order access:

- best-sellers uses live Shopify Orders
- sour reorder uses live Shopify Orders for 30-day sales velocity
- products and inventory come from live Shopify
- warehouse, fulfillment, and distributor ops remain mocked

Best-sellers window behavior:

- `Which candy is performing best?` and `What are our best-selling candies recently?`
  - prefer the latest 30-day live Shopify order window
  - fall back to the latest 60-day live Shopify order window if needed
- `What were our best-selling candies last month?`
  - tries the previous calendar month first
  - if that month has zero live orders, it falls back to the latest live Shopify order window

The answer and tool trace both show the exact window used, the number of orders included, and whether a fallback window was needed.

## Environment variables

Create a local `.env.local` file in the project root. `.env.local` is ignored by Git and must never be committed.

Start from [.env.example](/Users/adam/Documents/Kandwii/.env.example):

- `SHOPIFY_MODE=mock`
- `SHOPIFY_SHOP_DOMAIN=kandwii.myshopify.com`
- `SHOPIFY_CLIENT_ID=`
- `SHOPIFY_CLIENT_SECRET=`
- `SHOPIFY_ADMIN_ACCESS_TOKEN=`
- `SHOPIFY_API_VERSION=2026-04`
- `DEMO_NOW=2026-06-14`
- `NEXT_PUBLIC_APP_NAME=Kandwii`
- `OPENAI_API_KEY=`
- `OPENAI_BASE_URL=https://api.openai.com/v1`
- `OPENAI_MODEL=gpt-4.1-mini`

### Shopify auth options

The app supports two live Admin API auth paths:

- Preferred for Dev Dashboard apps owned by your organization:
  - `SHOPIFY_CLIENT_ID`
  - `SHOPIFY_CLIENT_SECRET`
  - server-side client-credentials token exchange
- Optional fallback:
  - `SHOPIFY_ADMIN_ACCESS_TOKEN`

The app never needs Shopify secrets in frontend code.

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

Test the live Shopify connection:

```bash
npm run test:shopify-live
```

Sync the Kandwii seed catalog into Shopify:

```bash
npm run sync:shopify-products
```

Seed a small, fake historical order set if your app scopes and store permissions allow it:

```bash
npm run seed:shopify-orders
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

## Live Shopify setup

### Required app scopes

Likely required scopes for the current live implementation:

- `read_products`
- `write_products`
- `read_inventory`
- `write_inventory`
- `read_orders`
- `write_orders`

You may also need permission in the store for products, inventory, and orders management.

### Shopify live workflow

1. Create or configure an app for `kandwii.myshopify.com` in the Shopify Dev Dashboard.
2. Add the scopes above.
3. Install the app on the Kandwii dev store.
4. Put the credentials into `.env.local`.
5. Run:

```bash
npm run test:shopify-live
```

6. If the connection test passes, seed products:

```bash
npm run sync:shopify-products
```

7. Optionally seed historical demo orders:

```bash
npm run seed:shopify-orders
```

8. Switch the app to live mode:

```bash
SHOPIFY_MODE=live
```

### Notes on live orders

- The order seeding script uses fake customer emails in the `example.invalid` domain.
- It avoids sending customer emails by setting the documented `orderCreate` email options to `false`.
- Shopify development stores limit `orderCreate` to five new orders per minute, so the seeding script intentionally paces requests.
- If Shopify rejects order creation or inventory behavior, the script should fail with a sanitized message so you can see the exact platform limitation.
- Once seeded, those live Shopify Orders are used directly by best-sellers and sour reorder analytics.

## Vercel envs later

When you are ready to move Vercel from mock to live mode later, set these project env vars:

- `SHOPIFY_MODE=live`
- `SHOPIFY_SHOP_DOMAIN`
- `SHOPIFY_API_VERSION`
- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`

Or, if you are using the fallback token path:

- `SHOPIFY_ADMIN_ACCESS_TOKEN`

## Security notes

- `.env.local` is ignored by Git.
- API keys must never be committed.
- Shopify client secrets and access tokens must never be committed.
- The app does not expose raw `OPENAI_API_KEY` values in logs, traces, or docs.
- Fallback diagnostics intentionally avoid request headers and raw provider payloads.

## Submission-oriented docs

- [Architecture notes](/Users/adam/Documents/Kandwii/docs/architecture.md)
- [Demo script](/Users/adam/Documents/Kandwii/docs/demo-script.md)
- [Submission notes](/Users/adam/Documents/Kandwii/docs/submission-notes.md)
