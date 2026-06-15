# Demo Script

## Setup

- Start from the Kandwii landing screen with the local app running on `localhost:3000`
- Mention that this is a Shopify-connected AI ops demo for a fictional Japanese and Korean candy shop
- Note that the current build is running in live Shopify mode for products, inventory, and order analytics, while warehouse and distributor ops remain mocked

## 1. Introduce Kandwii

Say:

"Kandwii is a store-operations AI agent for a Shopify merchant. Instead of being just a chatbot, it answers questions with structured cards, tables, and visible tool traces."

Point out:

- command panel at the top
- shared workspace below
- tool trace area for transparency

## 2. Show best sellers

Prompt:

`Which candy is performing best?`

Call out:

- assistant answer summarizes recent live performance
- insight card highlights the top seller and top category
- product table shows ranked performance
- table metadata shows:
  - date window used
  - number of orders included
  - source: `Live Shopify Orders`
- tool trace shows the route decision and underlying tools

Then optionally show:

`What were our best-selling candies last month?`

Call out that the app tries the requested month first, then transparently falls back to the latest live order window if the requested month is empty.

## 3. Show sour reorder / stockout

Prompt:

`Do we need to reorder sour candy?`

Call out:

- assistant answer gives a direct recommendation
- reorder draft card shows the proposed buy
- inventory risk cards show the most exposed sour SKUs
- risk table shows velocity, stockout timing, and reorder sizing
- mention that sales velocity is coming from live Shopify Orders in this mode

## 4. Show warehouse issues

Prompt:

`Show me warehouse issues globally.`

Call out:

- assistant answer summarizes the current network problem
- primary summary card identifies the bottleneck
- regional cards show fulfillment health across the warehouse network
- issue table shows delayed or problematic shipment events

## 5. Show unsupported prompt handling

Prompt:

`Can you design a new homepage?`

Call out:

- the app does not break or error out
- it returns a clean in-product unsupported state
- suggested prompts guide the reviewer back into supported workflows

## 6. Explain the tool trace

Open the tool trace and say:

"Every supported response shows both the high-level agent routing decision and the concrete tools that produced the UI. That makes the system easier to debug and easier to trust."

## 7. Explain LLM mode and fallback mode

Say:

- "If an OpenAI key is available, the app attempts LLM intent routing first."
- "If OpenAI is unavailable, rate-limited, or over quota, the app falls back to deterministic routing."
- "The trace makes that explicit without exposing secrets or raw provider payloads."

Also say:

- "Products and inventory are live Shopify data."
- "Best-sellers and sour reorder both use live Shopify Orders when access is available."
- "Warehouse and fulfillment operations remain mocked because they represent external systems outside Shopify."

If fallback is active, show the sanitized trace summary.
