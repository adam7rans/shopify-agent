interface ShopifyAccessTokenCacheEntry {
  accessToken: string;
  expiresAt: number;
}

interface ClientCredentialsResponse {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

const tokenCache = new Map<string, ShopifyAccessTokenCacheEntry>();

function getRequiredEnvVar(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required Shopify environment variable: ${name}`);
  }

  return value;
}

function getShopDomain() {
  return getRequiredEnvVar("SHOPIFY_SHOP_DOMAIN");
}

export function hasClientCredentials() {
  return Boolean(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET);
}

export function hasAdminAccessToken() {
  return Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
}

export async function getShopifyAdminAccessToken() {
  if (hasAdminAccessToken()) {
    return process.env.SHOPIFY_ADMIN_ACCESS_TOKEN as string;
  }

  if (!hasClientCredentials()) {
    throw new Error(
      "Shopify live mode requires either SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET.",
    );
  }

  const shopDomain = getShopDomain();
  const clientId = getRequiredEnvVar("SHOPIFY_CLIENT_ID");
  const clientSecret = getRequiredEnvVar("SHOPIFY_CLIENT_SECRET");
  const cacheKey = `${shopDomain}:${clientId}`;
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as ClientCredentialsResponse;

  if (!response.ok || !payload.access_token) {
    const providerCode = payload.error ? ` ${payload.error}` : "";
    const message = payload.error_description
      ? ` ${payload.error_description.replace(/\s+/g, " ").trim().slice(0, 160)}`
      : "";
    throw new Error(
      `Shopify token request failed with status ${response.status}.${providerCode}${message}`,
    );
  }

  const expiresInMs = (payload.expires_in ?? 86_399) * 1000;
  tokenCache.set(cacheKey, {
    accessToken: payload.access_token,
    expiresAt: Date.now() + expiresInMs,
  });

  return payload.access_token;
}
