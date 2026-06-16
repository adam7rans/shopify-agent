import { fulfillmentRegions, warehouses } from "@/lib/mock/regions";
import type { DailySalesMetric, InventoryLevel, Order, OrderLineItem, Product } from "@/types/domain";

interface MockOperationsData {
  orders: Order[];
  inventory: InventoryLevel[];
  dailySalesMetrics: DailySalesMetric[];
}

function createSeededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function pickFulfillmentStatus(n: number): Order["displayFulfillmentStatus"] {
  if (n > 0.95) return "DELAYED";
  if (n > 0.86) return "ON_HOLD";
  if (n > 0.42) return "FULFILLED";
  return "IN_PROGRESS";
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function buildProductDemandScores(products: Product[]) {
  return products.map((product, index) => {
    const hash = hashString(`${product.title}:${product.category}:${index}`);
    const categoryBias: Record<string, number> = {
      "Japanese gummies": 1.18,
      "Korean gummies": 1.12,
      "Sour candy": 1.42,
      "Ramune / soda candy": 0.92,
      "Chocolate biscuit sticks": 1.08,
      "Mochi candy": 0.88,
      "Matcha chocolate/snacks": 1.01,
      "Hard candy": 0.8,
      "Jelly candy": 0.95,
      "Character / kawaii candy": 0.9,
      "Variety boxes": 0.72,
      "Seasonal limited editions": 0.76,
    };
    const seasonalBoost =
      product.tags.includes("seasonal") || product.category === "Seasonal limited editions"
        ? 0.85
        : 1;
    const sourBoost =
      product.tags.includes("sour") || product.category === "Sour candy" ? 1.18 : 1;
    const popularityBand = 0.74 + ((hash % 100) / 100) * 0.9;

    return {
      product,
      score:
        (categoryBias[product.category] ?? 1) *
        seasonalBoost *
        sourBoost *
        popularityBand,
    };
  });
}

function pickWeightedProduct(
  scoredProducts: Array<{ product: Product; score: number }>,
  random: () => number,
) {
  const totalScore = scoredProducts.reduce((sum, entry) => sum + entry.score, 0);
  let cursor = random() * totalScore;

  for (const entry of scoredProducts) {
    cursor -= entry.score;
    if (cursor <= 0) {
      return entry.product;
    }
  }

  return scoredProducts[scoredProducts.length - 1]?.product ?? null;
}

export function generateOperationsData(products: Product[]): MockOperationsData {
  const random = createSeededRandom(42_4242);
  const endDate = new Date(Date.UTC(2026, 5, 14));
  const startDate = new Date(Date.UTC(2025, 11, 17));
  const inventory: InventoryLevel[] = [];
  const orders: Order[] = [];
  const dailyMetricsMap = new Map<string, DailySalesMetric>();
  const scoredProducts = buildProductDemandScores(products);

  products.forEach((product, productIndex) => {
    const variant = product.variants[0];
    const isSour = product.tags.includes("sour") || product.category === "Sour candy";

    warehouses.forEach((warehouse) => {
      const hash = hashString(`${variant.sku}:${warehouse.id}:${productIndex}`);
      const baseAvailable = Math.max(
        6,
        Math.round(product.startingInventory * (0.22 + ((hash % 37) / 100))),
      );
      const available = isSour
        ? Math.max(5, Math.round(baseAvailable * (0.58 + ((hash >>> 5) % 20) / 100)))
        : baseAvailable;
      const committed = 2 + ((hash >>> 8) % 24);
      const incoming = Math.max(
        0,
        Math.round(product.startingInventory * (((hash >>> 13) % 22) / 100)),
      );
      const onHand = available + committed + incoming;

      inventory.push({
        id: `inventory-${variant.id}-${warehouse.id}`,
        productId: product.id,
        variantId: variant.id,
        sku: variant.sku,
        locationId: warehouse.id,
        locationName: warehouse.label,
        region: warehouse.region,
        available,
        committed,
        incoming,
        onHand,
        updatedAt: endDate.toISOString(),
      });
    });
  });

  let orderNumber = 1001;
  for (let cursor = new Date(startDate); cursor <= endDate; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const weekday = cursor.getUTCDay();
    const weekendLift = weekday === 5 || weekday === 6 ? 1.2 : 1;
    const seasonalLift = cursor.getUTCMonth() === 4 || cursor.getUTCMonth() === 5 ? 1.15 : 1;
    const baseOrders = 2 + Math.floor(random() * 3);
    const ordersToday = Math.max(
      1,
      Math.round(baseOrders * weekendLift * seasonalLift + random() * 2),
    );

    for (let index = 0; index < ordersToday; index += 1) {
      const lineItemCount = 1 + Math.floor(random() * 3);
      const lineItems: OrderLineItem[] = [];
      const region = fulfillmentRegions[Math.floor(random() * fulfillmentRegions.length)];

      for (let lineIndex = 0; lineIndex < lineItemCount; lineIndex += 1) {
        const product = pickWeightedProduct(scoredProducts, random) ?? products[0];
        const variant = product.variants[0];
        const quantityRoll = random();
        const quantity =
          quantityRoll > 0.94
            ? 5
            : quantityRoll > 0.8
              ? 3 + Math.floor(random() * 2)
              : 1 + Math.floor(random() * 2);
        const lineRevenue = Number((quantity * variant.price).toFixed(2));
        const lineMargin = Number((quantity * variant.margin).toFixed(2));

        lineItems.push({
          id: `line-${orderNumber}-${lineIndex + 1}`,
          productId: product.id,
          variantId: variant.id,
          sku: variant.sku,
          title: product.title,
          vendor: product.vendor,
          category: product.category,
          quantity,
          unitPrice: variant.price,
          unitCost: variant.cost,
          lineRevenue,
          lineMargin,
        });

        const dateKey = isoDate(cursor);
        const metricKey = `${dateKey}:${variant.sku}:${region}`;
        const existingMetric = dailyMetricsMap.get(metricKey);

        if (existingMetric) {
          existingMetric.unitsSold += quantity;
          existingMetric.revenue = Number((existingMetric.revenue + lineRevenue).toFixed(2));
          existingMetric.grossMargin = Number(
            (existingMetric.grossMargin + lineMargin).toFixed(2),
          );
        } else {
          dailyMetricsMap.set(metricKey, {
            id: `metric-${dateKey}-${variant.sku}-${region}`,
            date: dateKey,
            sku: variant.sku,
            productTitle: product.title,
            category: product.category,
            region,
            unitsSold: quantity,
            revenue: lineRevenue,
            grossMargin: lineMargin,
          });
        }
      }

      const subtotalPrice = Number(
        lineItems.reduce((sum, lineItem) => sum + lineItem.lineRevenue, 0).toFixed(2),
      );

      orders.push({
        id: `order-${orderNumber}`,
        name: `#${orderNumber}`,
        createdAt: new Date(
          Date.UTC(
            cursor.getUTCFullYear(),
            cursor.getUTCMonth(),
            cursor.getUTCDate(),
            9 + Math.floor(random() * 10),
            Math.floor(random() * 60),
            0,
          ),
        ).toISOString(),
        displayFulfillmentStatus: pickFulfillmentStatus(random()),
        currencyCode: "USD",
        totalPrice: Number((subtotalPrice * 1.07).toFixed(2)),
        subtotalPrice,
        region,
        customerId: `cust_${orderNumber}`,
        lineItems,
      });

      orderNumber += 1;
    }
  }

  const dailySalesMetrics = Array.from(dailyMetricsMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date) || a.sku.localeCompare(b.sku),
  );

  return { orders, inventory, dailySalesMetrics };
}
