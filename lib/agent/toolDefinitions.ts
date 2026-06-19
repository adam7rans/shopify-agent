import type OpenAI from "openai";

type Tool = OpenAI.Chat.Completions.ChatCompletionTool;

export const agentTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search and filter the Shopify product catalog. Returns product details including title, SKU, category, country of origin, price, cost, margin, tags, and inventory quantity. Use this when the user asks about products, wants to browse the catalog, or needs product data for generating Liquid templates.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description:
              'Product category to filter by, e.g. "Japanese gummies", "Sour candy", "Matcha chocolate/snacks", "Korean gummies", "Chocolate biscuit sticks", "Mochi candy", "Ramune / soda candy", "Hard candy", "Jelly candy", "Character / kawaii candy", "Variety boxes", "Seasonal limited editions"',
          },
          country: {
            type: "string",
            description:
              'Country of origin to filter by, e.g. "Japan", "South Korea"',
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description:
              'Product tags to filter by, e.g. ["sour", "gummy", "matcha"]',
          },
          sort_by: {
            type: "string",
            enum: ["price_asc", "price_desc", "title", "inventory"],
            description: "How to sort results",
          },
          limit: {
            type: "number",
            description: "Maximum number of products to return (default: 50)",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_inventory",
      description:
        "Get current inventory levels across all warehouse locations. Returns available, committed, incoming, and on-hand quantities per SKU aggregated across locations. Use this when the user asks about stock levels, low-stock items, or inventory visibility.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter inventory to a specific product category",
          },
          country: {
            type: "string",
            description:
              'Filter to products from a specific country, e.g. "Japan", "South Korea"',
          },
          status: {
            type: "string",
            enum: ["low", "all"],
            description:
              'Filter by stock status. "low" returns only low-stock SKUs (default: "all")',
          },
          sku: {
            type: "string",
            description: "Filter to a specific SKU",
          },
          limit: {
            type: "number",
            description: "Maximum number of rows to return",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_sales_data",
      description:
        "Get sales performance data from recent orders. Returns top-selling products ranked by units sold, with revenue and margin. Use this for questions about best sellers, sales trends, what's popular, or revenue performance.",
      parameters: {
        type: "object",
        properties: {
          time_query: {
            type: "string",
            description:
              "Natural-language time phrase copied from the user, e.g. 'this week', 'last week', '2 weeks ago', 'past 3 months', or 'past 12 months'.",
          },
          date_range: {
            type: "string",
            description:
              "Deprecated alias for time_query. Use only if an older prompt example still references date_range.",
          },
          start_date: {
            type: "string",
            description: "Optional explicit start date in YYYY-MM-DD format",
          },
          end_date: {
            type: "string",
            description: "Optional explicit end date in YYYY-MM-DD format",
          },
          grain: {
            type: "string",
            enum: ["auto", "day", "week", "month"],
            description:
              "Optional aggregation grain for the returned time series. Use auto unless the user explicitly asks for a specific resolution.",
          },
          category: {
            type: "string",
            description: "Filter sales to a specific product category",
          },
          country: {
            type: "string",
            description:
              'Filter sales to products from a specific country, e.g. "Japan", "South Korea"',
          },
          sku: {
            type: "string",
            description: "Filter sales to a specific SKU or product",
          },
          sort_by: {
            type: "string",
            enum: ["units", "revenue", "margin"],
            description:
              "How to rank results (default: units)",
          },
          limit: {
            type: "number",
            description:
              "Maximum number of products to return in the ranking (default: 10)",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_reorder_risk",
      description:
        "Check stockout risk and generate reorder recommendations. Calculates days until stockout based on sales velocity, lead times, and safety stock. Use this when the user asks about reordering, stockout risk, or whether any products need restocking.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description:
              'Filter to a specific category, e.g. "Sour candy". If omitted, checks all products.',
          },
          sku: {
            type: "string",
            description: "Check a specific SKU only",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_warehouse_health",
      description:
        "Get fulfillment center health data including delayed shipments, stuck fulfillments, damaged inventory, and average fulfillment times. Use this for warehouse operations, fulfillment delays, or logistics questions.",
      parameters: {
        type: "object",
        properties: {
          region: {
            type: "string",
            description:
              'Filter to a specific region, e.g. "Europe", "Middle East", "United States", "China / Asia"',
          },
          severity: {
            type: "string",
            enum: ["high", "medium", "all"],
            description: 'Filter by severity level (default: "all")',
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_distributor_availability",
      description:
        "Get supplier/distributor availability for products including available cases, units per case, minimum order quantities, unit costs, lead times, and next restock dates.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter to a product category",
          },
          sku: {
            type: "string",
            description: "Filter to a specific SKU",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scan_documents",
      description:
        "Scan all supplier documents in the inbox (invoices, delivery receipts). Reads each document image with AI vision to extract supplier info, line items, quantities, prices, and totals. Cross-references extracted items against current Shopify inventory to show projected stock levels. Automatically flags issues (partial shipments, damaged goods) and drafts supplier emails for flagged documents. Returns fully parsed results ready for the owner to review.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "parse_document",
      description:
        "Parse a single supplier document image using AI vision to extract structured data: supplier info, line items with quantities/prices, totals, and any damage or backorder notes. Also cross-references extracted items against current Shopify inventory to show projected stock levels after receiving the shipment. Use scan_documents instead when you want to process all documents at once.",
      parameters: {
        type: "object",
        properties: {
          filename: {
            type: "string",
            description:
              "The filename to parse, e.g. 'invoice-1-sweet-distribution.png'",
          },
        },
        required: ["filename"],
        additionalProperties: false,
      },
    },
  },
];
