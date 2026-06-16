# Submission Notes

## What is implemented

This project currently includes:

- a standalone Next.js + TypeScript + Tailwind application
- a real agentic tool-calling architecture using OpenAI's multi-turn function calling
- eight tools the LLM can autonomously invoke:
  - `search_products` — catalog search with filtering by category, country, tags
  - `get_inventory` — stock levels across warehouse locations
  - `get_sales_data` — sales performance rankings with configurable date ranges
  - `check_reorder_risk` — stockout forecasting and reorder recommendations
  - `get_warehouse_health` — fulfillment center health and issue tracking
  - `get_distributor_availability` — supplier availability and lead times
  - `list_documents` / `parse_document` — PDF invoice and purchase order parsing
- generative UI: the LLM composes the response layout from seven card types and four table types
- Shopify Liquid template generation using real product data
- a mock-first Shopify adapter layer with optional live Shopify connection
- deterministic Kandwii data generation (~50 Japanese and Korean candy products)
- a live Shopify path for products, inventory, and orders
- a merchant-facing threaded UI with:
  - `User mode` with contextual loading indicators
  - `Diagnostics mode` with full tool traces and a real-time activity log
- real product images keyed by `/products/{handle}.png`
- sample PDF supplier documents for document parsing demos
- scripts for:
  - live Shopify connection testing
  - Shopify product sync
  - Shopify development-order seeding
  - agent flow smoke testing
  - product image generation

## What makes it agentic

The LLM is not a classifier routing to hardcoded workflows. It is the decision-maker:

- it chooses which tools to call and with what parameters
- it can call multiple tools per turn and chain results across turns (up to 12 iterations)
- it composes the final structured JSON response, choosing which UI components to render
- it handles queries that don't map to any pre-programmed workflow (e.g., "compare Korean and Japanese inventory", "match invoice SKUs to our stock levels")

The system prompt provides tool descriptions and UI component schemas. The LLM does the rest.

Every product request now uses the same core architecture:

- `/api/agent` returns the final structured JSON result
- `/api/agent/stream` streams real-time activity logs and then the final result
- both routes run through the same multi-turn agent loop

## What is live

When `SHOPIFY_MODE=live` is enabled and the app has the required access:

- products come from live Shopify
- inventory comes from live Shopify
- seeded Shopify Orders are used for sales analytics

## What is mocked

The following remain intentionally mocked in this version:

- distributor availability
- warehouse inventory snapshots
- delayed / damaged / stuck fulfillment issue events
- broader supplier and external-ops systems

This is deliberate. The app treats Shopify as the commerce source of truth and external operations systems as a separate layer.

## What would be connected next in production

The next production-facing steps would likely be:

- add Convex for conversations, tool logs, cached analytics, and app data
- expand tool set with write operations (place reorder, update inventory, send supplier emails)
- add multi-modal inputs (photo upload of invoices, screenshot parsing)
- broader financial reporting and trend analysis
- conversation memory across sessions

## Reviewer framing

This build is intentionally scoped to be:

- demonstrably agentic — the LLM makes real tool-calling decisions, not classification
- transparent — diagnostics mode shows every tool call the LLM made
- architecturally ready for live Shopify data
- understandable to a first-time merchant (user mode)
- inspectable by a reviewer (diagnostics mode, tool traces)

The `User mode` / `Diagnostics mode` split is part of that goal:

- `User mode` makes the product easier to understand
- `Diagnostics mode` makes the agentic system easier to trust and debug
