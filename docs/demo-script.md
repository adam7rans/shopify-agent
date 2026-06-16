# Demo Script

## Setup

- Open Kandwii on the main landing screen
- Start in **User mode**
- Mention that this is a Shopify-connected AI operations assistant for a fictional Japanese and Korean candy shop
- Explain that:
  - products, inventory, and sales analytics come from live Shopify in live mode
  - warehouse and fulfillment operations remain mocked because they represent systems outside Shopify

## 1. Explain what the app is

Say:

"Kandwii is an operations copilot for a Shopify merchant. It is designed to answer a focused set of store questions with structured results, not just chat text."

Call out:

- onboarding prompt groups
- user mode vs diagnostics mode
- structured answers rendered directly in the conversation

## 2. Show sales performance

Prompt:

`Which candy is performing best?`

Call out:

- assistant answer summarizes recent performance
- insight card highlights the top seller
- ranked table shows:
  - product
  - SKU
  - units sold
  - revenue
  - margin
- metadata above the table shows:
  - the exact window used
  - number of orders included
  - source: `Live Shopify Orders`

Then optionally run:

`What were our best-selling candies last month?`

Call out:

- the app tries the requested month first
- if that month is empty, the answer and diagnostics explain the fallback to a recent live-order window

## 3. Show inventory visibility

Prompt:

`What does our inventory look like?`

Call out:

- assistant answer summarizes total SKU coverage
- primary insight card explains the current stock posture
- low-stock highlight cards surface the most constrained items
- inventory table aggregates active Shopify inventory by SKU across locations

Then optionally run:

`Which SKUs are low on stock?`

Call out that the same inventory flow can pivot to a more focused low-stock view.

## 4. Show sour reorder / stockout

Prompt:

`Do we need to reorder sour candy?`

Call out:

- direct recommendation in plain English
- reorder draft card
- stock-risk cards
- supporting risk table
- 30-day sales velocity is based on live Shopify Orders in live mode

## 5. Show warehouse / fulfillment health

Prompt:

`Where is fulfillment getting stuck?`

Call out:

- answer summarizes the current network issue
- regional cards show warehouse health
- issue table shows delayed or problematic shipment events
- explain that this part is intentionally `Live Shopify + Mock ops`

## 6. Show unsupported handling

Prompt:

`Can you design a new homepage?`

Call out:

- the app does not break
- it returns a clean unsupported state
- it suggests supported prompts to bring the user back into the current product surface

## 7. Switch to diagnostics mode

Turn on **Diagnostics mode** and rerun one prompt, ideally:

`Which candy is performing best?`

Call out:

- intent-routing trace
- source labels
- query window
- counts
- tool trace

Say:

"Diagnostics mode is there for reviewers, debugging, and trust. User mode keeps the experience clean."

## 8. Explain LLM routing and fallback

Say:

- "If an OpenAI key is available, Kandwii attempts LLM intent routing first."
- "If OpenAI is unavailable or fails, the app falls back to deterministic routing."
- "The trace makes that explicit without exposing secrets or raw provider payloads."

## 9. Close with the current product scope

Say:

"Today the product is strongest on sales performance, inventory visibility, reorder risk, and fulfillment health. The next layers would be supplier workflows, broader operational memory, and eventually richer agent execution."
