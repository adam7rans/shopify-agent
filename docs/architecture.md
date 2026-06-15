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
  - exchanges or reuses a Shopify Admin token server-side
  - reads products, inventory, and recent orders from the live Admin GraphQL API
  - preserves mocked warehouse, distributor, and fulfillment-ops data

Live helpers:

- `lib/shopify/token.ts`
  - client-credentials token exchange and server-side token cache
- `lib/shopify/graphql.ts`
  - Admin GraphQL request helper with sanitized errors

## Generated mock data

The app uses generated Kandwii data so the demo is repeatable and deterministic.

Generators in `lib/mock/` produce:

- ~50 Japanese and Korean candy and snack products in the current catalog
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

The live product sync script uses the same generated catalog as the source of truth, so mock mode and seeded live mode stay aligned.

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
- live-window resolver that:
  - uses recent live Shopify Orders for “recent” prompts
  - tries previous-month reporting for “last month” prompts
  - falls back to the latest live order window when the requested month is empty

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

For the best-sellers table specifically, the shared model now carries:

- date window used
- number of orders included
- source label such as `Live Shopify Orders`

That metadata is rendered directly above the ranked table so reviewers can see exactly what the analytics are based on.

## Live Shopify status

The current local live mode uses:

- live Shopify products
- live Shopify inventory
- live Shopify Orders for sales analytics

Current behavior by flow:

- best-sellers
  - uses live Shopify Orders
  - falls back from an empty requested month to the latest 30-day, then 60-day, live order window
- sour reorder
  - uses live Shopify products
  - uses live Shopify inventory
  - uses live Shopify Orders for 30-day sales velocity
- warehouse health
  - keeps external warehouse and fulfillment ops mocked on purpose

## Future path

The intended next production-oriented steps are:

- add Convex for conversations, cached analytics, tool logs, and operational data
- replace intent-only routing with a broader tool-calling execution layer
- support hybrid live Shopify data plus mock external operations sources

Additional live Shopify work that can still be expanded:

- richer order import and reconciliation
- stronger inventory-location mapping across multiple Shopify locations
- historical order seeding refinements once the dev-store limits are better understood

The current codebase is already structured so those additions can happen without rewriting the existing UI contract.
