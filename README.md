# Kandwii

First checkpoint scaffold for a Shopify-connected AI operations app.

## Commands

- `npm install`
- `npm run generate:mock`
- `npm run test:mock-shopify`
- `npm run dev`

## Notes

- `SHOPIFY_MODE=mock` is the default and uses generated JSON from `data/generated/`.
- `SHOPIFY_MODE=live` currently validates environment variables and then throws a not-yet-implemented error.
