import { NextResponse } from "next/server";
import { getRawShopifyMode, getShopifyMode, isLiveShopifyConfigured } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    SHOPIFY_MODE: getRawShopifyMode(),
    SHOPIFY_SHOP_DOMAIN_PRESENT: Boolean(process.env.SHOPIFY_SHOP_DOMAIN),
    SHOPIFY_API_VERSION_PRESENT: Boolean(process.env.SHOPIFY_API_VERSION),
    SHOPIFY_CLIENT_ID_PRESENT: Boolean(process.env.SHOPIFY_CLIENT_ID),
    SHOPIFY_CLIENT_SECRET_PRESENT: Boolean(process.env.SHOPIFY_CLIENT_SECRET),
    SHOPIFY_ADMIN_ACCESS_TOKEN_PRESENT: Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN),
    OPENAI_API_KEY_PRESENT: Boolean(process.env.OPENAI_API_KEY),
    NEXT_PUBLIC_APP_NAME_PRESENT: Boolean(process.env.NEXT_PUBLIC_APP_NAME),
    resolvedShopifyMode: getShopifyMode(),
    isLiveShopifyConfigured: isLiveShopifyConfigured(),
  });
}
