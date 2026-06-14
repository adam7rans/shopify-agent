import type { Order, Product } from "@/types/domain";

export interface TopSellerRow {
  sku: string;
  product: string;
  category: string;
  vendor: string;
  unitsSold: number;
  revenue: number;
  margin: number;
  averageSellingPrice: number;
  tags: string[];
}

export interface TopSellersResult {
  rows: TopSellerRow[];
  totalUnitsSold: number;
  topCategory: string;
  topCategoryUnitsSold: number;
}

export function calculateTopSellersFromOrders(
  orders: Order[],
  productsBySku: Map<string, Product>,
  limit = 8,
): TopSellersResult {
  const totalsBySku = new Map<string, TopSellerRow>();
  const categoryTotals = new Map<string, number>();

  for (const order of orders) {
    for (const lineItem of order.lineItems) {
      const existing = totalsBySku.get(lineItem.sku);
      const product = productsBySku.get(lineItem.sku);

      if (existing) {
        existing.unitsSold += lineItem.quantity;
        existing.revenue = Number((existing.revenue + lineItem.lineRevenue).toFixed(2));
        existing.margin = Number((existing.margin + lineItem.lineMargin).toFixed(2));
        existing.averageSellingPrice = Number(
          (existing.revenue / existing.unitsSold).toFixed(2),
        );
      } else {
        totalsBySku.set(lineItem.sku, {
          sku: lineItem.sku,
          product: product?.title ?? lineItem.title,
          category: product?.category ?? lineItem.category,
          vendor: product?.vendor ?? lineItem.vendor,
          unitsSold: lineItem.quantity,
          revenue: lineItem.lineRevenue,
          margin: lineItem.lineMargin,
          averageSellingPrice: lineItem.unitPrice,
          tags: product?.tags ?? [],
        });
      }

      const category = product?.category ?? lineItem.category;
      categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + lineItem.quantity);
    }
  }

  const rows = Array.from(totalsBySku.values())
    .sort((a, b) => {
      if (b.unitsSold !== a.unitsSold) {
        return b.unitsSold - a.unitsSold;
      }
      return b.revenue - a.revenue;
    })
    .slice(0, limit)
    .map((row) => ({
      ...row,
      revenue: Number(row.revenue.toFixed(2)),
      margin: Number(row.margin.toFixed(2)),
      averageSellingPrice: Number(row.averageSellingPrice.toFixed(2)),
    }));

  const topCategoryEntry = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0];

  return {
    rows,
    totalUnitsSold: rows.reduce((sum, row) => sum + row.unitsSold, 0),
    topCategory: topCategoryEntry?.[0] ?? "Unknown",
    topCategoryUnitsSold: topCategoryEntry?.[1] ?? 0,
  };
}
