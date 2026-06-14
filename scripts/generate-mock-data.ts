import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateDistributorAvailability } from "@/lib/mock/distributorAvailabilityGenerator";
import {
  generateFulfillmentCenters,
  generateFulfillmentIssues,
  generateWarehouseHealthSnapshots,
} from "@/lib/mock/fulfillmentGenerator";
import { generateOperationsData } from "@/lib/mock/operationsGenerator";
import { generateProducts } from "@/lib/mock/productGenerator";

async function main() {
  const products = generateProducts();
  const { orders, inventory, dailySalesMetrics } = generateOperationsData(products);
  const distributorAvailability = generateDistributorAvailability(products);
  const fulfillmentCenters = generateFulfillmentCenters();
  const warehouseHealthSnapshots = generateWarehouseHealthSnapshots(
    products,
    fulfillmentCenters,
  );
  const fulfillmentIssues = generateFulfillmentIssues(products, fulfillmentCenters);
  const outputDir = path.join(process.cwd(), "data", "generated");

  await mkdir(outputDir, { recursive: true });

  await Promise.all([
    writeFile(path.join(outputDir, "products.json"), JSON.stringify(products, null, 2) + "\n"),
    writeFile(path.join(outputDir, "orders.json"), JSON.stringify(orders, null, 2) + "\n"),
    writeFile(
      path.join(outputDir, "inventory.json"),
      JSON.stringify(inventory, null, 2) + "\n",
    ),
    writeFile(
      path.join(outputDir, "dailySalesMetrics.json"),
      JSON.stringify(dailySalesMetrics, null, 2) + "\n",
    ),
    writeFile(
      path.join(outputDir, "distributorAvailability.json"),
      JSON.stringify(distributorAvailability, null, 2) + "\n",
    ),
    writeFile(
      path.join(outputDir, "fulfillmentCenters.json"),
      JSON.stringify(fulfillmentCenters, null, 2) + "\n",
    ),
    writeFile(
      path.join(outputDir, "warehouseHealthSnapshots.json"),
      JSON.stringify(warehouseHealthSnapshots, null, 2) + "\n",
    ),
    writeFile(
      path.join(outputDir, "fulfillmentIssues.json"),
      JSON.stringify(fulfillmentIssues, null, 2) + "\n",
    ),
  ]);

  console.log(
    `Generated ${products.length} products, ${orders.length} orders, ${inventory.length} inventory records, ${dailySalesMetrics.length} daily sales metrics, ${distributorAvailability.length} distributor availability records, ${fulfillmentCenters.length} fulfillment centers, ${warehouseHealthSnapshots.length} warehouse health snapshots, and ${fulfillmentIssues.length} fulfillment issues.`,
  );
}

main().catch((error) => {
  console.error("Failed to generate mock data.");
  console.error(error);
  process.exitCode = 1;
});
