# Submission Notes

## What is implemented

This project currently includes:

- a standalone Next.js + TypeScript + Tailwind application
- a mock-first Shopify adapter layer
- deterministic Kandwii data generation
- a live Shopify path for products, inventory, and orders
- a merchant-facing threaded UI with:
  - `User mode`
  - `Diagnostics mode`
- supported workflow families for:
  - best sellers / sales performance
  - inventory overview
  - sour candy reorder / stockout
  - warehouse / fulfillment health
  - unsupported/help responses
- an OpenAI-compatible intent router with deterministic fallback
- sanitized diagnostics for provider failures and tool traces
- scripts for:
  - live Shopify connection testing
  - Shopify product sync
  - Shopify development-order seeding
  - agent flow smoke testing

## What is live

When `SHOPIFY_MODE=live` is enabled and the app has the required access:

- products come from live Shopify
- inventory comes from live Shopify
- seeded Shopify Orders are used for sales analytics

That means:

- best-sellers uses live Shopify Orders
- best-sellers falls back to the latest live order window when a requested month is empty
- sour reorder uses live Shopify Orders for 30-day sales velocity

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
- expand supported operational questions, especially supplier and warehouse directory flows
- add broader inventory analytics and flexible time-window reporting
- eventually broaden the agent from intent routing into multi-step tool execution

## Reviewer framing

This build is intentionally scoped to be:

- understandable to a first-time merchant
- transparent enough for a reviewer to inspect
- architecturally ready for live Shopify data

The `User mode` / `Diagnostics mode` split is part of that goal:

- `User mode` makes the product easier to understand
- `Diagnostics mode` makes the system easier to trust and demo

## Stretch goals after this pass

- supplier / warehouse contact directory questions
- recurring reorder knowledge
- broader operational business-memory answers such as:
  - what this app is for
  - where inventory is stored
  - how fulfillment is organized
- product-description drafting
- supplier email drafting
- broader financial reporting
