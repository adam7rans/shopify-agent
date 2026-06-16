# Architecture

## Product surface

Kandwii is a standalone Next.js App Router application that behaves like a merchant-facing operations copilot. The current UI is split into two explicit modes:

- `User mode`
  - default
  - conversational layout
  - onboarding and starter prompts
  - structured answers without backend noise
- `Diagnostics mode`
  - same answers
  - adds routing detail, source labels, query windows, counts, and tool traces

The app is intentionally not a general-purpose chat product yet. It is a focused AI workflow surface for Shopify store operations.

## High-level structure

- `app/`
  - homepage and `/api/agent`
- `components/layout/`
  - app shell, threaded conversation surface, onboarding, diagnostics rendering
- `lib/agent/`
  - intent routing
- `lib/shopify/`
  - adapter layer, auth helpers, GraphQL helper
- `lib/tools/`
  - deterministic operational workflows
- `lib/mock/`
  - generated demo data
- `types/`
  - domain types and shared UI response types
- `data/generated/`
  - generated JSON runtime artifacts

## Shopify adapter layer

The Shopify seam is defined by:

- `lib/shopify/types.ts`
- `lib/shopify/mockShopifyClient.ts`
- `lib/shopify/liveShopifyClient.ts`
- `lib/shopify/index.ts`

All product, inventory, and order access goes through this contract.

### Why this matters

It keeps the flows and UI agnostic to whether the source is:

- generated mock data, or
- live Shopify Admin GraphQL

That mock-first structure made it possible to build and demo the app before live credentials were ready, then layer in live Shopify later without rewriting the flow logic.

## Mock mode vs live mode

### Mock mode

- generated Kandwii catalog
- generated orders
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

## Intent router

The agent layer is intentionally narrow. It is not a fully autonomous planner. It decides which supported operational flow should answer the prompt.

Files:

- `lib/agent/types.ts`
- `lib/agent/deterministicIntentRouter.ts`
- `lib/agent/llmIntentRouter.ts`
- `lib/agent/intentRouter.ts`

Supported intents:

- `best_sellers`
- `inventory_overview`
- `sour_reorder`
- `warehouse_health`
- `unsupported`

Routing behavior:

- use OpenAI-compatible intent routing when `OPENAI_API_KEY` is available
- fall back to deterministic alias matching when the LLM is unavailable or fails
- keep a visible trace entry explaining whether routing was:
  - `llm`
  - `llm_fallback`
  - deterministic

## Flow tools

The current app supports four response families, with three main operational flows plus onboarding/help handling.

### Best sellers / sales analytics

Uses:

- `get_recent_orders`
- `get_shopify_products`
- `calculate_top_sellers`
- best-sellers window resolution logic

The window resolver supports:

- recent performance
- previous calendar month
- rolling six-month view
- top-10 style prompts
- fallback from an empty requested month to newer live-order windows

### Inventory overview

Uses:

- `get_shopify_inventory`
- `get_shopify_products`
- SKU aggregation across locations
- low-stock ranking heuristics

The current inventory flow supports:

- full inventory overview
- low-stock SKU view

### Sour reorder / stockout

Uses:

- live or mock Shopify products
- live or mock inventory
- live or mock-fallback recent orders
- mocked distributor availability

It calculates:

- 30-day sales velocity
- days until stockout
- lead-time risk
- reorder case sizing

### Warehouse / fulfillment health

Uses mocked external ops data:

- fulfillment centers
- warehouse inventory snapshots
- issue events
- delayed / stuck / damaged shipment data

This flow intentionally remains outside the Shopify adapter because it models external operational systems.

## Shared `AgentUiResponse`

All flows return the same UI contract from `types/agentUi.ts`.

That model supports:

- answer block
- primary cards
- secondary cards
- tables
- diagnostics summary
- tool trace
- suggested prompts

This keeps the frontend rendering stable even as new supported flows are added.

Current specialized blocks include:

- insight cards
- reorder draft cards
- inventory risk cards
- inventory highlight cards
- warehouse regional cards
- sales tables
- stock-risk tables
- inventory tables
- fulfillment issue tables

## UI model

The current UI is a threaded conversation surface:

- the user submits a question
- Kandwii adds a user turn
- the app resolves intent and runs the corresponding flow
- the assistant response renders structured results in-thread

### In user mode

- diagnostics are hidden
- the surface is oriented around understanding and action

### In diagnostics mode

- the same thread shows:
  - diagnostics summary
  - source badges
  - query windows
  - counts
  - tool trace

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

## Future path

The most likely next production-facing steps are:

- add Convex for conversation persistence, tool logs, cached analytics, and app data
- expand inventory and sales question families further
- add supplier and warehouse directory questions
- add a clearer operational knowledge layer for “how the business works” questions
- eventually broaden the agent beyond intent routing into multi-step tool orchestration
