# Kandwii Shopify AI Agent

Kandwii is a Shopify-connected operations agent for a fictional Japanese and Korean candy store.

You ask a normal question in plain English. The app decides which tools to call, pulls the right store data, and returns a structured answer instead of a loose chat paragraph.

This repo started as a narrower workflow demo. It has since been rebuilt around one shared agent loop, so the same core system now powers:

- normal user mode
- diagnostics mode with live activity logs
- JSON responses from `/api/agent`
- streaming responses from `/api/agent/stream`

## What this project is trying to prove

This is not a generic chatbot glued onto Shopify.

The point of the project is to show a real agent loop that can:

- read live Shopify products, inventory, and recent orders
- call multiple tools in sequence when a prompt needs it
- return structured UI blocks such as tables, cards, code output, and diagnostics
- stay inspectable in diagnostics mode so a reviewer can see what actually happened

## What you can ask it today

### Sales

- `Which candy is performing best?`
- `What are our best-selling candies recently?`
- `Show the top 10 sellers over the past six months.`

### Inventory

- `What does our inventory look like?`
- `Show me all japanese gummies`
- `Show me all korean gummies`
- `Which Korean gummies are low in stock?`

### Reorder risk

- `Do we need to reorder sour candy?`
- `What sour candy is at risk of stockout?`

### Fulfillment and warehouse health

- `Where is fulfillment getting stuck?`
- `Show me warehouse issues globally.`

### Documents and supplier context

- `List available supplier documents`
- `Parse the Tokyo Treats invoice and check which SKUs need restocking`

### Shopify Liquid generation

- `Generate a landing page for our Japanese gummies collection`

If you ask for something outside the current scope, the app should answer cleanly and suggest better next prompts instead of bluffing.

## How the agent works

Here is the simplest way to think about the architecture:

1. A prompt comes in through the UI.
2. The prompt is sent into a multi-turn OpenAI tool-calling loop.
3. The model decides which tool to call first.
4. Tool results come back into the loop as structured data.
5. The model can call more tools if it needs more context.
6. The loop ends only when the model returns a valid `AgentUiResponse`.
7. The frontend renders that response as cards, tables, code blocks, and diagnostics.

There is no separate deterministic workflow router sitting next to this anymore.

`/api/agent` is the plain JSON version of the loop.  
`/api/agent/stream` is the streaming version used for diagnostics mode and live activity logs.

## The tool surface

The current tool set is small on purpose. Each tool has a clear job.

| Tool | What it does |
| --- | --- |
| `search_products` | Filters the product catalog by category, country, tags, sort order, or limit |
| `get_inventory` | Returns current inventory by SKU across locations |
| `get_sales_data` | Returns recent sales rankings from order history |
| `check_reorder_risk` | Calculates stockout risk and reorder recommendations |
| `get_warehouse_health` | Returns warehouse snapshots and fulfillment issues |
| `get_distributor_availability` | Returns supplier and distributor availability data |
| `list_documents` | Lists sample supplier PDFs the agent can inspect |
| `parse_document` | Extracts text from a supplier PDF so the agent can reason over it |

The important detail is where these tools live.

- `lib/agent/toolDefinitions.ts` defines the tool schemas exposed to the model
- `lib/agent/toolExecutors.ts` runs the requested tool
- `lib/tools/*.ts` contains the actual business logic
- `lib/shopify/*` handles mock vs live Shopify access

That split keeps the agent layer thin and makes the data logic easier to test.

## User mode and diagnostics mode

### User mode

User mode is the normal product surface.

It keeps the interface simple and conversational. You see the answer, the tables, the cards, and the suggested next prompts. You do not see the internal logs.

### Diagnostics mode

Diagnostics mode is the proof layer.

It keeps the same answer visible, but adds:

- a live activity log panel
- tool trace
- source labels
- query windows
- summarized counts when the response includes them

The activity log is there so a reviewer can see that the model is actually calling tools and using real data. It is not there to expose secrets. Tokens, raw provider payloads, and sensitive headers stay hidden.

## What is live and what is still mocked

This project intentionally mixes live commerce data with mocked operational data.

### Live when `SHOPIFY_MODE=live`

- products
- inventory
- recent orders
- best-sellers
- reorder velocity inputs

### Still mocked on purpose

- warehouse / 3PL operational issues
- distributor availability
- fulfillment snapshots outside Shopify
- sample supplier documents

That split lets the app feel real without pretending a dev store has every external business system attached.

## Shopify modes

### `SHOPIFY_MODE=mock`

The app reads deterministic generated JSON data from `data/generated/`.

This is useful for:

- local development
- stable screenshots
- demos where you do not want live-store drift

### `SHOPIFY_MODE=live`

The app reads from Shopify Admin GraphQL for:

- products
- inventory
- recent orders

The live adapter normalizes Shopify data back into the same domain types used in mock mode, which keeps the rest of the app simpler.

## Why the UI is structured the way it is

The frontend does not just dump model text into a chat bubble.

The agent is asked to return a validated `AgentUiResponse`, which can include:

- a top-level answer block
- primary cards
- secondary cards
- structured tables
- diagnostics summaries
- tool trace
- suggested next prompts

That is why the app can render:

- best-seller tables
- filtered inventory tables
- reorder recommendations
- Liquid code output
- warehouse issue summaries

all from one shared response contract.

See: [types/agentUi.ts](/Users/adam/Documents/Kandwii/types/agentUi.ts)

## File map

- `app/`
  - Next.js pages and API routes
- `components/layout/`
  - chat shell, conversation rendering, diagnostics panel, and UI chrome
- `lib/agent/`
  - system prompt, tool definitions, tool executors, agent loop, response validation
- `lib/tools/`
  - sales, inventory, reorder, warehouse, and document logic
- `lib/shopify/`
  - shared Shopify adapter, live GraphQL client, mock client, auth helpers
- `lib/mock/`
  - deterministic seed generators for catalog and operations data
- `data/generated/`
  - generated products, inventory, orders, and warehouse data
- `public/products/`
  - product images used by generated Liquid templates

For a deeper architectural breakdown, read [docs/architecture.md](/Users/adam/Documents/Kandwii/docs/architecture.md).

## Environment variables

Create a local `.env.local` file in the project root. It is ignored by Git and should never be committed.

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

For the current live setup, use:

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

Run the Shopify adapter checks:

```bash
npm run test:mock-shopify
npm run test:shopify-live
```

Sync the seeded catalog into the Shopify dev store if needed:

```bash
npm run sync:shopify-products
```

Seed historical demo orders if needed:

```bash
npm run seed:shopify-orders
```

Start the app:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Testing

Unit tests:

```bash
npm test
```

Structured agent-flow smoke tests:

```bash
npm run test:agent-flows
```

Streaming diagnostics smoke test:

```bash
npm run test:agent-stream
```

Type and build checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## A note on realism

The catalog, inventory, and order data are deterministic demo data when the app runs in mock mode. That is intentional.

Still, the mock generators are meant to feel plausible enough for product demos, not like flat placeholder rows. Inventory and order seeding are shaped so categories and SKUs do not all collapse into the same quantities or sales counts.

When the app runs in live mode, the agent reads real Shopify products, inventory, and order-backed sales data from the dev store.

## Security

- `.env.local` is ignored by Git
- API keys and Shopify secrets must never be committed
- diagnostics output is sanitized
- the client never receives raw secret values

## Vercel notes

For live production mode on Vercel, set:

- `SHOPIFY_MODE=live`
- `SHOPIFY_SHOP_DOMAIN`
- `SHOPIFY_API_VERSION`
- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `DEMO_NOW`

After that, redeploy and verify:

- diagnostics resolves live mode
- the sidebar shows `Live Shopify`
- best-sellers and inventory answers use live store data
