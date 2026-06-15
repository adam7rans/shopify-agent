import process from "node:process";
import { loadEnvConfig } from "@next/env";
import { shopifyAdminGraphql } from "@/lib/shopify/graphql";
import { generateOperationsData } from "@/lib/mock/operationsGenerator";
import { generateProducts } from "@/lib/mock/productGenerator";

interface LiveVariantQuery {
  productVariants: {
    nodes: Array<{
      id: string;
      sku: string | null;
    }>;
  };
}

interface OrderCreatePayload {
  orderCreate: {
    order: {
      id: string;
      name: string;
    } | null;
    userErrors: Array<{ field?: string[]; message: string }>;
  };
}

const PRODUCT_VARIANTS_QUERY = `
  query VariantBySku($query: String!) {
    productVariants(first: 1, query: $query) {
      nodes {
        id
        sku
      }
    }
  }
`;

const ORDER_CREATE_MUTATION = `
  mutation OrderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
    orderCreate(order: $order, options: $options) {
      order {
        id
        name
      }
      userErrors {
        field
        message
      }
    }
  }
`;

function sampleOrders() {
  const products = generateProducts();
  const { orders } = generateOperationsData(products);
  const sample: typeof orders = [];
  const stride = Math.max(1, Math.floor(orders.length / 12));

  for (let index = 0; index < orders.length && sample.length < 12; index += stride) {
    sample.push(orders[index]);
  }

  return sample.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function findVariantIdBySku(sku: string) {
  const data = await shopifyAdminGraphql<LiveVariantQuery>(PRODUCT_VARIANTS_QUERY, {
    query: `sku:'${sku}'`,
  });

  return data.productVariants.nodes[0]?.id ?? null;
}

async function main() {
  loadEnvConfig(process.cwd());
  process.env.SHOPIFY_MODE = "live";

  const seededOrders = sampleOrders();
  const delayMs = 13_000;
  let created = 0;

  console.log(
    `Preparing to seed ${seededOrders.length} historical orders. Development stores are limited to five orderCreate calls per minute, so this script intentionally paces requests.`,
  );

  for (const [index, order] of seededOrders.entries()) {
    const lineItems = [];

    for (const lineItem of order.lineItems) {
      const variantId = await findVariantIdBySku(lineItem.sku);
      if (!variantId) {
        console.warn(`Skipping line item ${lineItem.sku} because no live variant was found.`);
        continue;
      }

      lineItems.push({
        variantId,
        quantity: lineItem.quantity,
      });
    }

    if (lineItems.length === 0) {
      console.warn(`Skipping ${order.name} because none of its SKUs were available in Shopify.`);
      continue;
    }

    const email = `kandwii-seed-order-${String(index + 1).padStart(3, "0")}@example.invalid`;
    const data = await shopifyAdminGraphql<OrderCreatePayload>(ORDER_CREATE_MUTATION, {
      order: {
        lineItems,
        email,
        processedAt: order.createdAt,
        note: `Kandwii historical seed order imported for demo use (${order.createdAt}).`,
        ...(order.displayFulfillmentStatus === "FULFILLED"
          ? { fulfillmentStatus: "FULFILLED" }
          : {}),
      },
      options: {
        sendReceipt: false,
        sendFulfillmentReceipt: false,
        inventoryBehaviour: "DECREMENT_IGNORING_POLICY",
      },
    });

    if (data.orderCreate.userErrors.length > 0) {
      throw new Error(
        `Order seed failed for ${order.name}: ${data.orderCreate.userErrors
          .map((error) => error.message)
          .join("; ")}`,
      );
    }

    created += 1;
    console.log(`Created ${data.orderCreate.order?.name ?? order.name}.`);

    if (index < seededOrders.length - 1) {
      await delay(delayMs);
    }
  }

  console.log(`Order seed completed. Created ${created} historical demo orders.`);
}

main().catch((error) => {
  console.error("Shopify order seed failed.");
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
