# Submission Notes

## What is implemented

This project currently includes:

- a standalone Next.js + TypeScript + Tailwind app
- a mock-first Shopify adapter layer
- deterministic Kandwii product and operations data generation
- a larger real-world-inspired Kandwii seed catalog for Shopify sync
- best-sellers workflow
- sour candy reorder and stockout workflow
- warehouse and fulfillment issues workflow
- unsupported prompt handling
- a lightweight intent-routing agent layer with:
  - OpenAI-compatible LLM routing
  - deterministic fallback routing
  - sanitized failure diagnostics
- Shopify live-mode support for:
  - products
  - inventory
  - recent orders
- Shopify scripts for:
  - live connection testing
  - seed product sync
  - historical order seeding attempts
- a shared structured UI response model for cards, tables, and tool traces

## What is mocked

The following are intentionally mocked in this version:

- Shopify product, order, and inventory reads in default local mode
- distributor availability
- warehouse inventory snapshots
- fulfillment delays and issue events
- broader external operations systems

The app is designed so those mocked systems can later be replaced or supplemented without changing the current UI contract.

## What would be connected in production

The next production-facing integration path would be:

- add Convex for conversations, cached analytics, tool logs, and supporting app data
- extend the agent from intent routing into fuller tool execution and persistence
- tighten Shopify write-path ergonomics and catalog reconciliation for production use

## Current live Shopify behavior

In local live mode today:

- products come from live Shopify
- inventory comes from live Shopify
- seeded live Shopify Orders are used for sales analytics

That means:

- best-sellers uses live Shopify Orders and automatically falls back to the latest live order window when a requested month is empty
- sour reorder uses live Shopify Orders for 30-day sales velocity
- warehouse and fulfillment flows still use mocked external-ops data

## Stretch goals that could come next

- richer historical live-order seeding and reconciliation
- warehouse and distributor dashboards beyond the current flow cards
- richer chat history and conversation memory
- embedded Shopify app packaging if required by the take-home format

## Reviewer note

This version is intentionally scoped for demo clarity:

- the app already behaves like an AI operations agent
- the flows are transparent and inspectable
- the architecture is set up for live Shopify and Convex expansion without a rewrite
