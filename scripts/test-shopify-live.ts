import process from "node:process";
import { loadEnvConfig } from "@next/env";
import { shopifyAdminGraphql } from "@/lib/shopify/graphql";
import { getShopifyClient } from "@/lib/shopify";

interface ShopNameQuery {
  shop: {
    name: string;
    myshopifyDomain: string;
  };
}

async function main() {
  loadEnvConfig(process.cwd());
  process.env.SHOPIFY_MODE = "live";

  const envSummary = {
    hasShopDomain: Boolean(process.env.SHOPIFY_SHOP_DOMAIN),
    hasApiVersion: Boolean(process.env.SHOPIFY_API_VERSION),
    hasClientId: Boolean(process.env.SHOPIFY_CLIENT_ID),
    hasClientSecret: Boolean(process.env.SHOPIFY_CLIENT_SECRET),
    hasAdminAccessToken: Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN),
  };

  console.log("Shopify live env presence:", JSON.stringify(envSummary));

  const shopData = await shopifyAdminGraphql<ShopNameQuery>(
    `query ShopName { shop { name myshopifyDomain } }`,
  );
  console.log(`Connected to ${shopData.shop.name} (${shopData.shop.myshopifyDomain}).`);

  const client = getShopifyClient();
  const productsResult = await client.getProducts({ limit: 5 });
  console.log(`Products readable: ${productsResult.products.length}`);

  const inventoryResult = await client.getInventory({ limit: 5 });
  console.log(`Inventory rows readable: ${inventoryResult.inventory.length}`);

  try {
    const ordersResult = await client.getRecentOrders({ limit: 5 });
    console.log(`Orders readable: ${ordersResult.orders.length}`);
  } catch (error) {
    console.log(
      `Orders read unavailable: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

main().catch((error) => {
  console.error("Shopify live connectivity test failed.");
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
