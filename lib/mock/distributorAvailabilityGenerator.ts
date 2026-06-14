import { suppliers } from "@/lib/mock/taxonomy";
import type { DistributorAvailability, Product } from "@/types/domain";

export function generateDistributorAvailability(products: Product[]): DistributorAvailability[] {
  return products.map((product, index) => {
    const variant = product.variants[0];
    const supplier =
      suppliers.find((entry) => entry.distributor === product.distributor) ?? suppliers[0];
    const isSour = product.tags.includes("sour") || product.category === "Sour candy";
    const unitsPerCase = isSour ? 24 : 18 + (index % 2) * 6;
    const minimumOrderCases = isSour ? 5 + (index % 3) : 3 + (index % 2);
    const estimatedLeadTimeDays = isSour ? 16 + (index % 5) : supplier.leadTimeDays;
    const availableCases = isSour ? 8 + (index % 6) * 2 : 14 + (index % 7) * 3;
    const nextRestockDate = new Date(
      Date.UTC(2026, 5, 20 + (index % 8), 0, 0, 0, 0),
    ).toISOString().slice(0, 10);

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      sku: variant.sku,
      productTitle: product.title,
      availableCases,
      unitsPerCase,
      minimumOrderCases,
      unitCost: Number((variant.cost * (0.92 + (index % 4) * 0.03)).toFixed(2)),
      estimatedLeadTimeDays,
      nextRestockDate,
    };
  });
}
