# Demo Script

## Setup

- Open Kandwii on the main landing screen
- Start in **User mode**
- Mention that this is a Shopify-connected AI operations agent for a fictional Japanese and Korean candy shop
- Explain that:
  - this is a real agentic system — the LLM decides which tools to call, with what parameters, and composes the UI response
  - products, inventory, and sales analytics come from live Shopify in live mode
  - warehouse and fulfillment operations remain mocked because they represent systems outside Shopify

## 1. Explain what the app is

Say:

"Kandwii is an operations agent for a Shopify merchant. It uses real multi-turn tool calling — the LLM decides what data to fetch and how to compose the answer, rather than routing to hardcoded workflows."

Call out:

- onboarding prompt groups
- user mode vs diagnostics mode
- structured answers rendered directly in the conversation
- contextual loading indicators while the agent works

## 2. Show sales performance

Prompt:

`Which candy is performing best?`

Call out:

- the agent calls `get_sales_data` on its own to fetch order rankings
- assistant answer summarizes recent performance
- insight card highlights the top seller
- ranked table shows product, SKU, units sold, revenue, margin
- the LLM composed this layout — it wasn't hardcoded

Then optionally run:

`What were our best-selling candies last month?`

Call out:

- the agent adjusts the date range parameter based on the question
- the response adapts to the time window

## 3. Show inventory visibility

Prompt:

`What does our inventory look like?`

Call out:

- the agent calls `get_inventory` to fetch stock levels
- assistant answer summarizes total SKU coverage
- primary insight card explains current stock posture
- low-stock highlight cards surface the most constrained items
- inventory table aggregates active inventory by SKU across locations

Then optionally run:

`Show me just the low-stock Japanese products`

Call out that the agent filters by both country and status — a combination that wasn't pre-programmed as a workflow.

## 4. Show cross-referencing (key differentiator)

Prompt:

`Compare Korean and Japanese gummy inventory side by side`

Call out:

- the agent calls `get_inventory` twice with different country filters
- it composes a comparison response with context about both — this is genuinely agentic behavior, not a hardcoded comparison flow
- text blocks provide analysis, tables show the data

## 5. Show reorder risk

Prompt:

`Do we need to reorder anything?`

Call out:

- the agent calls `check_reorder_risk` (no category filter — checks everything)
- this is broader than the old "sour candy reorder" workflow
- direct recommendation in plain English
- reorder draft card, risk cards, supporting risk table
- sales velocity is based on real order data

## 6. Show warehouse health

Prompt:

`Where is fulfillment getting stuck?`

Call out:

- the agent calls `get_warehouse_health`
- answer summarizes the current network issues
- regional cards show warehouse health
- issue table shows delayed or problematic shipment events
- explain that warehouse data is intentionally mocked (models external operational systems)

## 7. Show Shopify Liquid generation

Prompt:

`Generate a landing page for our Japanese gummies collection`

Call out:

- the agent first calls `search_products` with a Japan/gummies filter to get real product data
- then it generates valid Shopify Liquid template code referencing actual product handles
- the code appears in a syntax-highlighted code block with a copy button
- a text block explains the template structure
- product image paths reference generated placeholder images at `/products/{handle}.png`

## 8. Show document parsing

Prompt:

`What documents do we have on file?`

Then:

`Parse the Tokyo Treats invoice and check if we have those SKUs in stock`

Call out:

- the agent calls `list_documents`, then `parse_document`, then `get_inventory`
- it cross-references invoice SKUs against live inventory in a single conversation turn
- this is a multi-tool chain that the LLM orchestrated autonomously

## 9. Switch to diagnostics mode

Turn on **Diagnostics mode** and rerun one prompt, ideally:

`Which candy is performing best?`

Call out:

- tool trace shows every tool the LLM called, with inputs and output summaries
- source labels
- this is genuine agentic transparency — you can see the LLM's reasoning through the tools it chose

Say:

"Diagnostics mode is there for reviewers, debugging, and trust. User mode keeps the experience clean."

## 10. Explain the architecture

Say:

- "When an OpenAI key is available, every prompt goes through a real multi-turn tool-calling loop."
- "The LLM has eight tools: product search, inventory, sales data, reorder risk, warehouse health, distributor availability, document listing, and document parsing."
- "The LLM decides which tools to call and composes a structured JSON response that maps to UI components."
- "If OpenAI is unavailable, the app falls back to deterministic intent routing with hardcoded workflows — it always works."

## 11. Close with the current scope

Say:

"The agent handles sales performance, inventory visibility, reorder risk, warehouse health, Shopify Liquid page generation, and supplier document parsing. The generative UI means the LLM composes whatever combination of cards, tables, and text blocks best answers the question — no two responses have to look the same."
