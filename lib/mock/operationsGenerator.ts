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

export function generateOperationsData(products: Product[]): MockOperationsData {
  const random = createSeededRandom(42_4242);
  const endDate = new Date(Date.UTC(2026, 5, 14));
  const startDate = new Date(Date.UTC(2025, 11, 17));
  const inventory: InventoryLevel[] = [];
  const orders: Order[] = [];
  const dailyMetricsMap = new Map<string, DailySalesMetric>();

  products.forEach((product, productIndex) => {
    const variant = product.variants[0];
    const isSour = product.tags.includes("sour") || product.category === "Sour candy";

    warehouses.forEach((warehouse, warehouseIndex) => {
      const available = isSour
        ? 8 + ((productIndex + 2) * (warehouseIndex + 3) * 5) % 18
        : 28 + ((productIndex + 3) * (warehouseIndex + 4) * 7) % 120;
      const committed = 4 + ((productIndex + warehouseIndex) * 5) % 28;
      const incoming = isSour
        ? ((productIndex + 1) * (warehouseIndex + 2) * 3) % 18
        : ((productIndex + 1) * (warehouseIndex + 2) * 9) % 96;
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
    const ordersToday = 2 + Math.floor(random() * 4);

    for (let index = 0; index < ordersToday; index += 1) {
      const lineItemCount = 1 + Math.floor(random() * 3);
      const lineItems: OrderLineItem[] = [];
      const region = fulfillmentRegions[Math.floor(random() * fulfillmentRegions.length)];

      for (let lineIndex = 0; lineIndex < lineItemCount; lineIndex += 1) {
        const weightedIndex = Math.floor(random() * products.length);
        const preferredProduct = products[weightedIndex];
        const boostedProduct = products.find((product) => {
          if (preferredProduct.tags.includes("sour") || preferredProduct.category === "Sour candy") {
            return false;
          }
          return random() > 0.72 && (product.tags.includes("sour") || product.category === "Sour candy");
        });
        const product = boostedProduct ?? preferredProduct;
        const variant = product.variants[0];
        const quantity = 1 + Math.floor(random() * 4);
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
