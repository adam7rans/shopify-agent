import process from "node:process";
import { getShopifyClient } from "@/lib/shopify";

async function main() {
  process.env.SHOPIFY_MODE = "mock";

  const client = getShopifyClient();
  const [productsResult, ordersResult, inventoryResult] = await Promise.all([
    client.getProducts({ limit: 5 }),
    client.getRecentOrders({ limit: 5 }),
    client.getInventory({ limit: 5 }),
  ]);

  if (productsResult.products.length === 0) {
    throw new Error("Expected mock products to be returned.");
  }

  if (ordersResult.orders.length === 0) {
    throw new Error("Expected recent mock orders to be returned.");
  }

  if (inventoryResult.inventory.length === 0) {
    throw new Error("Expected mock inventory to be returned.");
  }

  console.log("Mock adapter smoke test passed.");
  console.log(`SHOPIFY_MODE selected: ${process.env.SHOPIFY_MODE}`);
  console.log(`Products returned: ${productsResult.products.length}`);
  console.log(`Orders returned: ${ordersResult.orders.length}`);
  console.log(`Inventory rows returned: ${inventoryResult.inventory.length}`);
}

main().catch((error) => {
  console.error("Mock adapter smoke test failed.");
  console.error(error);
  process.exitCode = 1;
});
