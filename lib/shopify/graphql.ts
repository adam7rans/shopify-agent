import { getShopifyAdminAccessToken } from "@/lib/shopify/token";

interface GraphQlErrorPayload {
  message?: string;
  extensions?: {
    code?: string;
  };
}

interface ShopifyGraphQlPayload<TData> {
  data?: TData;
  errors?: GraphQlErrorPayload[];
}

function getApiVersion() {
  return process.env.SHOPIFY_API_VERSION ?? "2026-04";
}

function getShopDomain() {
  const value = process.env.SHOPIFY_SHOP_DOMAIN;
  if (!value) {
    throw new Error("Missing required Shopify environment variable: SHOPIFY_SHOP_DOMAIN");
  }

  return value;
}

function sanitizeMessage(message?: string) {
  if (!message) {
    return "Unknown Shopify GraphQL error.";
  }

  return message.replace(/\s+/g, " ").trim().slice(0, 180);
}

export async function shopifyAdminGraphql<TData>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  const accessToken = await getShopifyAdminAccessToken();
  const response = await fetch(
    `https://${getShopDomain()}/admin/api/${getApiVersion()}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => ({}))) as ShopifyGraphQlPayload<TData>;

  if (!response.ok) {
    const firstError = payload.errors?.[0];
    const code = firstError?.extensions?.code ? ` ${firstError.extensions.code}` : "";
    throw new Error(
      `Shopify GraphQL request failed with status ${response.status}.${code} ${sanitizeMessage(firstError?.message)}`,
    );
  }

  if (payload.errors?.length) {
    const firstError = payload.errors[0];
    const code = firstError.extensions?.code ? ` ${firstError.extensions.code}` : "";
    throw new Error(`Shopify GraphQL error.${code} ${sanitizeMessage(firstError.message)}`);
  }

  if (!payload.data) {
    throw new Error("Shopify GraphQL response did not include data.");
  }

  return payload.data;
}
