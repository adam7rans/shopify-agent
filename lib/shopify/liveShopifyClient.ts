import { shopifyAdminGraphql } from "@/lib/shopify/graphql";
import { hasAdminAccessToken, hasClientCredentials } from "@/lib/shopify/token";
import { parseShopifySeedTags } from "@/lib/shopify/tagMetadata";
import type {
  InventoryFilters,
  OrderFilters,
  ProductFilters,
  ShopifyClient,
  ShopifyInventoryResponse,
  ShopifyOrdersResponse,
  ShopifyProductsResponse,
} from "@/lib/shopify/types";
import type {
  FulfillmentRegion,
  InventoryLevel,
  Order,
  OrderLineItem,
  Product,
  ProductVariant,
} from "@/types/domain";

interface MoneyV2 {
  amount: string;
  currencyCode: string;
}

interface LiveProductsQuery {
  products: {
    nodes: Array<{
      id: string;
      title: string;
      handle: string;
      description: string;
      vendor: string;
      productType: string;
      tags: string[];
      createdAt: string;
      variants: {
        nodes: Array<{
          id: string;
          title: string;
          sku: string | null;
          price: string;
          inventoryQuantity: number | null;
          inventoryItem: {
            id: string;
            unitCost: MoneyV2 | null;
          } | null;
        }>;
      };
    }>;
  };
}

interface LiveInventoryQuery {
  products: {
    nodes: Array<{
      id: string;
      title: string;
      variants: {
        nodes: Array<{
          id: string;
          sku: string | null;
          inventoryItem: {
            id: string;
            inventoryLevels: {
              nodes: Array<{
                location: {
                  id: string;
                  name: string;
                };
                updatedAt: string;
                quantities: Array<{
                  name: string;
                  quantity: number;
                }>;
              }>;
            };
          } | null;
        }>;
      };
    }>;
  };
}

interface LiveOrdersQuery {
  orders: {
    nodes: Array<{
      id: string;
      name: string;
      createdAt: string;
      displayFulfillmentStatus: string | null;
      currentTotalPriceSet: {
        shopMoney: MoneyV2;
      } | null;
      lineItems: {
        nodes: Array<{
          id: string;
          title: string;
          quantity: number;
          originalUnitPriceSet: {
            shopMoney: MoneyV2;
          } | null;
          variant: {
            id: string;
            sku: string | null;
            inventoryItem: {
              id: string;
              unitCost: MoneyV2 | null;
            } | null;
            product: {
              id: string;
              title: string;
              vendor: string;
              productType: string;
              tags: string[];
            } | null;
          } | null;
        }>;
      };
    }>;
  };
}

const PRODUCTS_QUERY = `
  query LiveProducts($first: Int!, $query: String) {
    products(first: $first, query: $query, sortKey: UPDATED_AT) {
      nodes {
        id
        title
        handle
        description
        vendor
        productType
        tags
        createdAt
        variants(first: 10) {
          nodes {
            id
            title
            sku
            price
            inventoryQuantity
            inventoryItem {
              id
              unitCost {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  }
`;

const INVENTORY_QUERY = `
  query LiveInventory($first: Int!, $query: String) {
    products(first: $first, query: $query, sortKey: UPDATED_AT) {
      nodes {
        id
        title
        variants(first: 10) {
          nodes {
            id
            sku
            inventoryItem {
              id
              inventoryLevels(first: 20) {
                nodes {
                  updatedAt
                  location {
                    id
                    name
                  }
                  quantities(names: ["available", "committed", "incoming", "on_hand"]) {
                    name
                    quantity
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const ORDERS_QUERY = `
  query LiveOrders($first: Int!, $query: String) {
    orders(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
      nodes {
        id
        name
        createdAt
        displayFulfillmentStatus
        currentTotalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        lineItems(first: 50) {
          nodes {
            id
            title
            quantity
            originalUnitPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            variant {
              id
              sku
              inventoryItem {
                id
                unitCost {
                  amount
                  currencyCode
                }
              }
              product {
                id
                title
                vendor
                productType
                tags
              }
            }
          }
        }
      }
    }
  }
`;

const DEFAULT_PRODUCT_QUERY = "tag:kandwii-seed";

const locationRegionHints: Array<{ match: RegExp; region: FulfillmentRegion }> = [
  { match: /\b(EU|WAW|AMS|BER|PAR|FRA)\b/i, region: "Europe" },
  { match: /\b(ME|DXB|UAE|DOH)\b/i, region: "Middle East" },
  { match: /\b(US|NJ|LA|USA|UNITED STATES)\b/i, region: "United States" },
  { match: /\b(CN|SZ|HKG|ASIA|JP|KR)\b/i, region: "China / Asia" },
];

function validateLiveEnv() {
  const missing = ["SHOPIFY_SHOP_DOMAIN", "SHOPIFY_API_VERSION"].filter(
    (name) => !process.env[name],
  );

  if (missing.length > 0) {
    throw new Error(`Missing Shopify live mode environment variables: ${missing.join(", ")}`);
  }

  if (!hasAdminAccessToken() && !hasClientCredentials()) {
    throw new Error(
      "Live Shopify mode requires SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET.",
    );
  }
}

function buildProductSearchQuery(filters: ProductFilters = {}) {
  const queryParts = [DEFAULT_PRODUCT_QUERY];

  if (filters.sku) {
    queryParts.push(`sku:${filters.sku}`);
  }

  if (filters.tag) {
    queryParts.push(`tag:${filters.tag}`);
  }

  if (filters.category) {
    queryParts.push(`product_type:'${filters.category.replace(/'/g, "\\'")}'`);
  }

  return queryParts.join(" ");
}

function buildOrderSearchQuery(filters: OrderFilters = {}) {
  const queryParts: string[] = [];

  if (filters.startDate) {
    queryParts.push(`created_at:>=${filters.startDate}`);
  }

  if (filters.endDate) {
    queryParts.push(`created_at:<=${filters.endDate}`);
  }

  return queryParts.join(" ");
}

function parseMoneyAmount(money?: MoneyV2 | null) {
  return Number(money?.amount ?? 0);
}

function inferRegionFromLocation(locationName: string): FulfillmentRegion {
  const match = locationRegionHints.find((hint) => hint.match.test(locationName));
  return match?.region ?? "Europe";
}

function normalizeCountry(value?: string) {
  if (!value) {
    return "Japan";
  }

  return value
    .split(" ")
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

function normalizeDistributor(value?: string) {
  return value
    ? value
        .split(" ")
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(" ")
    : "Kandwii Direct";
}

function normalizeProduct(node: LiveProductsQuery["products"]["nodes"][number]): Product {
  const variant = node.variants.nodes[0];
  const parsedTags = parseShopifySeedTags(node.tags);
  const price = Number(variant?.price ?? 0);
  const cost = parseMoneyAmount(variant?.inventoryItem?.unitCost);
  const safeCost = cost > 0 ? cost : Number((price * 0.45).toFixed(2));
  const inventoryQuantity = variant?.inventoryQuantity ?? 0;
  const margin = Number((price - safeCost).toFixed(2));
  const fulfillmentRegion = parsedTags.fulfillmentRegion ?? "Europe";
  const normalizedVariant: ProductVariant = {
    id: variant?.id ?? `${node.id}/variant/default`,
    productId: node.id,
    title: variant?.title ?? "Default Title",
    sku: variant?.sku ?? "",
    inventoryItemId: variant?.inventoryItem?.id,
    price,
    cost: safeCost,
    margin,
    inventoryQuantity,
    fulfillmentRegion,
  };

  return {
    id: node.id,
    title: node.title,
    handle: node.handle,
    brand: node.vendor,
    productDescription: node.description,
    description: node.description,
    category: node.productType || "General candy",
    countryOfOrigin: normalizeCountry(parsedTags.countryOfOrigin),
    vendor: node.vendor,
    distributor: normalizeDistributor(parsedTags.distributor),
    flavorProfile: parsedTags.flavorProfile.length ? parsedTags.flavorProfile : ["assorted"],
    tags: parsedTags.plainTags,
    price,
    cost: safeCost,
    margin,
    startingInventory: inventoryQuantity,
    inventoryQuantity,
    fulfillmentRegion,
    isRealWorldInspired: node.tags.includes("real-world-inspired"),
    sourceNote: "Live Shopify product synced from the Kandwii seed catalog.",
    referenceNote: "Live Shopify product queried through the Admin GraphQL API.",
    variants: [normalizedVariant],
    createdAt: node.createdAt,
    salesHistoryDays: 180,
  };
}

function getQuantityByName(
  quantities: Array<{ name: string; quantity: number }>,
  name: string,
) {
  return quantities.find((entry) => entry.name === name)?.quantity ?? 0;
}

function normalizeInventory(
  nodes: LiveInventoryQuery["products"]["nodes"],
  filters: InventoryFilters,
): InventoryLevel[] {
  return nodes
    .flatMap((product) =>
      product.variants.nodes.flatMap((variant) => {
        if (!variant.inventoryItem || !variant.sku) {
          return [];
        }

        const sku = variant.sku;
        return variant.inventoryItem.inventoryLevels.nodes.map((level) => {
          const region = inferRegionFromLocation(level.location.name);

          return {
            id: `${variant.inventoryItem?.id}:${level.location.id}`,
            productId: product.id,
            variantId: variant.id,
            sku,
            locationId: level.location.id,
            locationName: level.location.name,
            region,
            available: getQuantityByName(level.quantities, "available"),
            committed: getQuantityByName(level.quantities, "committed"),
            incoming: getQuantityByName(level.quantities, "incoming"),
            onHand: getQuantityByName(level.quantities, "on_hand"),
            updatedAt: level.updatedAt,
          } satisfies InventoryLevel;
        });
      }),
    )
    .filter((record) => {
      if (filters.sku && record.sku !== filters.sku) {
        return false;
      }
      if (filters.region && record.region !== filters.region) {
        return false;
      }
      if (filters.locationName && record.locationName !== filters.locationName) {
        return false;
      }
      return true;
    });
}

function normalizeFulfillmentStatus(value?: string | null): Order["displayFulfillmentStatus"] {
  if (value === "FULFILLED") return "FULFILLED";
  if (value === "ON_HOLD") return "ON_HOLD";
  if (value === "IN_PROGRESS") return "IN_PROGRESS";
  return "DELAYED";
}

function normalizeOrderLineItem(
  node: LiveOrdersQuery["orders"]["nodes"][number]["lineItems"]["nodes"][number],
): OrderLineItem | null {
  if (!node.variant?.product || !node.variant.sku) {
    return null;
  }

  const sku = node.variant.sku;
  const unitPrice = parseMoneyAmount(node.originalUnitPriceSet?.shopMoney);
  const unitCost = parseMoneyAmount(node.variant.inventoryItem?.unitCost);
  const lineRevenue = Number((unitPrice * node.quantity).toFixed(2));
  const lineMargin = Number(((unitPrice - unitCost) * node.quantity).toFixed(2));

  return {
    id: node.id,
    productId: node.variant.product.id,
    variantId: node.variant.id,
    sku,
    title: node.title,
    vendor: node.variant.product.vendor,
    category: node.variant.product.productType || "General candy",
    quantity: node.quantity,
    unitPrice,
    unitCost,
    lineRevenue,
    lineMargin,
  };
}

class LiveShopifyClient implements ShopifyClient {
  async getProducts(filters: ProductFilters = {}): Promise<ShopifyProductsResponse> {
    validateLiveEnv();
    const first = Math.min(filters.limit ?? 100, 100);
    const data = await shopifyAdminGraphql<LiveProductsQuery>(PRODUCTS_QUERY, {
      first,
      query: buildProductSearchQuery(filters),
    });

    return {
      products: data.products.nodes
        .map((node) => normalizeProduct(node))
        .filter((product) => Boolean(product.variants[0]?.sku)),
    };
  }

  async getInventory(filters: InventoryFilters = {}): Promise<ShopifyInventoryResponse> {
    validateLiveEnv();
    const data = await shopifyAdminGraphql<LiveInventoryQuery>(INVENTORY_QUERY, {
      first: 100,
      query: DEFAULT_PRODUCT_QUERY,
    });

    const inventory = normalizeInventory(data.products.nodes, filters);
    const limited = typeof filters.limit === "number" ? inventory.slice(0, filters.limit) : inventory;

    return { inventory: limited };
  }

  async getRecentOrders(filters: OrderFilters = {}): Promise<ShopifyOrdersResponse> {
    validateLiveEnv();
    const first = Math.min(filters.limit ?? 100, 100);
    const query = buildOrderSearchQuery(filters) || undefined;
    const data = await shopifyAdminGraphql<LiveOrdersQuery>(ORDERS_QUERY, { first, query });

    const orders = data.orders.nodes
      .map((orderNode) => {
        const lineItems = orderNode.lineItems.nodes
          .map((node) => normalizeOrderLineItem(node))
          .filter((lineItem): lineItem is OrderLineItem => lineItem !== null);
        const subtotalPrice = Number(
          lineItems.reduce((sum, lineItem) => sum + lineItem.lineRevenue, 0).toFixed(2),
        );

        return {
          id: orderNode.id,
          name: orderNode.name,
          createdAt: orderNode.createdAt,
          displayFulfillmentStatus: normalizeFulfillmentStatus(orderNode.displayFulfillmentStatus),
          currencyCode: "USD",
          totalPrice: parseMoneyAmount(orderNode.currentTotalPriceSet?.shopMoney) || subtotalPrice,
          subtotalPrice,
          region: "Europe" as FulfillmentRegion,
          customerId: `cust_${orderNode.id.split("/").pop()}`,
          lineItems,
        } satisfies Order;
      })
      .filter((order) => order.lineItems.length > 0);

    return { orders };
  }
}

export const liveShopifyClient = new LiveShopifyClient();
export { validateLiveEnv };
