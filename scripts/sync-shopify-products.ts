import process from "node:process";
import crypto from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { shopifyAdminGraphql } from "@/lib/shopify/graphql";
import { buildShopifySeedTags } from "@/lib/shopify/tagMetadata";
import { generateProducts } from "@/lib/mock/productGenerator";
import type { Product } from "@/types/domain";

interface ExistingSeededProductsQuery {
  products: {
    nodes: Array<{
      id: string;
      handle: string;
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
  locations: {
    nodes: Array<{
      id: string;
      name: string;
    }>;
  };
}

interface ProductMutationPayload {
  productCreate?: {
    product: {
      id: string;
      handle: string;
      variants: {
        nodes: Array<{
          id: string;
          inventoryItem: { id: string } | null;
        }>;
      };
    } | null;
    userErrors: Array<{ field?: string[]; message: string }>;
  };
  productUpdate?: {
    product: {
      id: string;
      handle: string;
      variants: {
        nodes: Array<{
          id: string;
          inventoryItem: { id: string } | null;
        }>;
      };
    } | null;
    userErrors: Array<{ field?: string[]; message: string }>;
  };
}

interface ProductVariantsBulkUpdatePayload {
  productVariantsBulkUpdate: {
    productVariants: Array<{
      id: string;
      price: string;
    }>;
    userErrors: Array<{ field?: string[]; message: string }>;
  };
}

interface InventoryItemUpdatePayload {
  inventoryItemUpdate: {
    inventoryItem: {
      id: string;
      tracked: boolean;
    } | null;
    userErrors: Array<{ message: string }>;
  };
}

interface InventorySetPayload {
  inventorySetQuantities: {
    userErrors: Array<{ code?: string; field?: string[]; message: string }>;
  };
}

const PRODUCT_CREATE_MUTATION = `
  mutation CreateProduct($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product {
        id
        handle
        variants(first: 1) {
          nodes {
            id
            inventoryItem {
              id
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const PRODUCT_UPDATE_MUTATION = `
  mutation UpdateProduct($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product {
        id
        handle
        variants(first: 1) {
          nodes {
            id
            inventoryItem {
              id
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const PRODUCT_VARIANT_UPDATE_MUTATION = `
  mutation VariantUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        price
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const INVENTORY_ITEM_UPDATE_MUTATION = `
  mutation InventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
    inventoryItemUpdate(id: $id, input: $input) {
      inventoryItem {
        id
        tracked
      }
      userErrors {
        message
      }
    }
  }
`;

const INVENTORY_SET_QUANTITIES_MUTATION = `
  mutation InventorySet(
    $input: InventorySetQuantitiesInput!
    $idempotencyKey: String!
  ) {
    inventorySetQuantities(input: $input) @idempotent(key: $idempotencyKey) {
      userErrors {
        code
        field
        message
      }
    }
  }
`;

const SEEDED_PRODUCTS_AND_LOCATIONS_QUERY = `
  query SeededProductsAndLocations($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
      nodes {
        id
        handle
        title
        variants(first: 1) {
          nodes {
            id
            sku
            inventoryItem {
              id
              inventoryLevels(first: 5) {
                nodes {
                  location {
                    id
                    name
                  }
                  quantities(names: ["available"]) {
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
    locations(first: 20) {
      nodes {
        id
        name
      }
    }
  }
`;

function assertNoUserErrors<T extends { userErrors: Array<{ message: string }> }>(
  payload: T,
  context: string,
) {
  if (payload.userErrors.length > 0) {
    throw new Error(
      `${context} failed: ${payload.userErrors.map((error) => error.message).join("; ")}`,
    );
  }
}

function getProductInput(product: Product) {
  return {
    title: product.title,
    handle: product.handle,
    descriptionHtml: `<p>${product.productDescription}</p>`,
    vendor: product.vendor,
    productType: product.category,
    tags: buildShopifySeedTags(product),
    status: "ACTIVE",
  };
}

async function upsertProduct(
  product: Product,
  existingProduct: ExistingSeededProductsQuery["products"]["nodes"][number] | undefined,
) {
  if (existingProduct) {
    const data = await shopifyAdminGraphql<ProductMutationPayload>(PRODUCT_UPDATE_MUTATION, {
      product: {
        id: existingProduct.id,
        ...getProductInput(product),
      },
    });

    assertNoUserErrors(data.productUpdate!, `Updating ${product.handle}`);
    return data.productUpdate!.product;
  }

  const data = await shopifyAdminGraphql<ProductMutationPayload>(PRODUCT_CREATE_MUTATION, {
    product: getProductInput(product),
  });

  assertNoUserErrors(data.productCreate!, `Creating ${product.handle}`);
  return data.productCreate!.product;
}

async function updateVariantPrice(productId: string, variantId: string, price: number) {
  const data = await shopifyAdminGraphql<ProductVariantsBulkUpdatePayload>(
    PRODUCT_VARIANT_UPDATE_MUTATION,
    {
      productId,
      variants: [
        {
          id: variantId,
          price: price.toFixed(2),
        },
      ],
    },
  );

  assertNoUserErrors(data.productVariantsBulkUpdate, `Updating variant ${variantId}`);
}

async function updateInventoryItem(
  inventoryItemId: string,
  product: Product,
  sku: string,
) {
  const data = await shopifyAdminGraphql<InventoryItemUpdatePayload>(
    INVENTORY_ITEM_UPDATE_MUTATION,
    {
      id: inventoryItemId,
      input: {
        sku,
        cost: product.cost,
        tracked: true,
      },
    },
  );

  assertNoUserErrors(data.inventoryItemUpdate, `Updating inventory item ${inventoryItemId}`);
}

async function setInventoryQuantity(
  inventoryItemId: string,
  locationId: string,
  quantity: number,
  changeFromQuantity: number,
  productHandle: string,
) {
  const data = await shopifyAdminGraphql<InventorySetPayload>(INVENTORY_SET_QUANTITIES_MUTATION, {
    idempotencyKey: crypto.randomUUID(),
    input: {
      name: "available",
      reason: "correction",
      referenceDocumentUri: `kandwii://seed-products/${productHandle}`,
      quantities: [
        {
          inventoryItemId,
          locationId,
          quantity,
          changeFromQuantity,
        },
      ],
    },
  });

  if (data.inventorySetQuantities.userErrors.length > 0) {
    throw new Error(
      `Setting inventory for ${productHandle} failed: ${data.inventorySetQuantities.userErrors
        .map((error) => error.message)
        .join("; ")}`,
    );
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  process.env.SHOPIFY_MODE = "live";

  const seedProducts = generateProducts();
  const existingData = await shopifyAdminGraphql<ExistingSeededProductsQuery>(
    SEEDED_PRODUCTS_AND_LOCATIONS_QUERY,
    {
      first: 250,
      query: "tag:kandwii-seed",
    },
  );

  const existingProductsByHandle = new Map(
    existingData.products.nodes.map((product) => [product.handle, product]),
  );
  const primaryLocation = existingData.locations.nodes[0];

  if (!primaryLocation) {
    throw new Error("No Shopify locations were available for inventory seeding.");
  }

  let createdCount = 0;
  let updatedCount = 0;
  let inventoryWarnings = 0;

  for (const product of seedProducts) {
    const existingProduct = existingProductsByHandle.get(product.handle);
    const upsertedProduct = await upsertProduct(product, existingProduct);

    if (!upsertedProduct) {
      throw new Error(`Shopify did not return a product payload for ${product.handle}.`);
    }

    if (existingProduct) {
      updatedCount += 1;
    } else {
      createdCount += 1;
    }

    const variant = upsertedProduct.variants.nodes[0];
    const inventoryItemId = variant?.inventoryItem?.id;

    if (!variant?.id || !inventoryItemId) {
      throw new Error(`Shopify did not return a variant or inventory item for ${product.handle}.`);
    }

    await updateVariantPrice(upsertedProduct.id, variant.id, product.price);
    await updateInventoryItem(inventoryItemId, product, product.variants[0].sku);

    const currentQuantity =
      existingProduct?.variants.nodes[0]?.inventoryItem?.inventoryLevels.nodes
        .find((level) => level.location.id === primaryLocation.id)
        ?.quantities.find((quantity) => quantity.name === "available")?.quantity ?? 0;

    try {
      await setInventoryQuantity(
        inventoryItemId,
        primaryLocation.id,
        product.startingInventory,
        currentQuantity,
        product.handle,
      );
    } catch (error) {
      inventoryWarnings += 1;
      console.warn(
        `Inventory quantity not applied for ${product.handle}: ${
          error instanceof Error ? error.message : "Unknown inventory error"
        }`,
      );
    }
  }

  console.log(
    `Shopify product sync completed. Created: ${createdCount}. Updated: ${updatedCount}. Inventory warnings: ${inventoryWarnings}. Primary location: ${primaryLocation.name}.`,
  );
}

main().catch((error) => {
  console.error("Shopify product sync failed.");
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
