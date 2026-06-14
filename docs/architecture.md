# Architecture

## App structure

Kandwii is a standalone Next.js App Router application built as a desktop-first demo surface for a Shopify-connected AI operations assistant. The UI is intentionally structured around a command panel and shared results workspace rather than a plain chat transcript.

Core areas:

- `app/`
  - page entrypoints and `/api/agent`
- `components/layout/`
  - app shell, prompt controls, and shared rendering blocks
- `lib/`
  - adapter, routing, analytics, and deterministic tools
- `types/`
  - domain types and shared agent response types
- `data/generated/`
  - deterministic mock artifacts used at runtime

## Shopify adapter layer

The Shopify integration seam lives in:

- `lib/shopify/types.ts`
- `lib/shopify/mockShopifyClient.ts`
- `lib/shopify/liveShopifyClient.ts`
- `lib/shopify/index.ts`

This is the core mock-first decision in the project. Product, order, and inventory reads go through the adapter contract, which allows the app to run fully in mock mode while preserving the same tool surface for live Shopify later.

Current modes:

- `SHOPIFY_MODE=mock`
  - reads generated JSON-backed Shopify-like data
- `SHOPIFY_MODE=live`
  - currently validates env vars and marks the seam for future Admin GraphQL implementation

## Generated mock data

The app uses generated Kandwii data so the demo is repeatable and deterministic.

Generators in `lib/mock/` produce:

- ~30 Japanese and Korean candy products
- orders
- inventory snapshots
- daily sales metrics
- distributor availability
- fulfillment centers
- warehouse health snapshots
- fulfillment issue events

The generator script:

- `scripts/generate-mock-data.ts`

writes runtime JSON into `data/generated/`.

## Agent intent router

The agent layer is intentionally narrow. It does not generate the final business output itself; it selects which deterministic flow to run.

Files:

- `lib/agent/types.ts`
- `lib/agent/deterministicIntentRouter.ts`
- `lib/agent/llmIntentRouter.ts`
- `lib/agent/intentRouter.ts`

Supported intents:

- `best_sellers`
- `sour_reorder`
- `warehouse_health`
- `unsupported`

Routing behavior:

- Use OpenAI-compatible intent routing when `OPENAI_API_KEY` is present
- Fall back to deterministic alias routing when the LLM is unavailable or fails
- Preserve a trace entry that explains whether routing was `llm`, `llm_fallback`, or deterministic

## Flow tools

The current app implements three business flows:

### Best sellers

- `get_recent_orders`
- `get_shopify_products`
- `calculate_top_sellers`

### Sour reorder / stockout

- `get_shopify_products` filtered for sour candy
- `get_shopify_inventory`
- `calculate_sales_velocity`
- `forecast_stockout_risk`
- `get_mock_distributor_availability`
- `draft_reorder_recommendation`

### Warehouse / fulfillment health

- `get_mock_fulfillment_centers`
- `get_mock_warehouse_inventory`
- `get_mock_fulfillment_issues`
- `summarize_global_warehouse_health`

## Shared response model

Every flow returns the same `AgentUiResponse` shape from `types/agentUi.ts`.

That response supports:

- top-level assistant answer
- primary cards
- secondary cards
- tables
- tool trace
- optional suggested prompts

This keeps the UI predictable and prevents each route from inventing a new custom payload shape.

## Future path

The intended next production-oriented steps are:

- implement the live Shopify Admin GraphQL client
- add Convex for conversations, cached analytics, tool logs, and operational data
- replace intent-only routing with a broader tool-calling execution layer
- support hybrid live Shopify data plus mock external operations sources

The current codebase is already structured so those additions can happen without rewriting the existing UI contract.
