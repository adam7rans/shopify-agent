import { NextResponse } from "next/server";
import { shopifyAdminGraphql } from "@/lib/shopify/graphql";
import { getShopifyMode } from "@/lib/shopify/mode";

interface PageCreatePayload {
  pageCreate: {
    page: { id: string; title: string; handle: string } | null;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}

export async function POST(request: Request) {
  const { title, body_html } = await request.json();

  if (!title || !body_html) {
    return NextResponse.json({ error: "title and body_html are required" }, { status: 400 });
  }

  if (getShopifyMode() !== "live") {
    return NextResponse.json({
      success: true,
      mock: true,
      page: {
        id: "gid://shopify/Page/mock-" + Date.now(),
        title,
        handle: title.toLowerCase().replace(/\s+/g, "-"),
      },
      message: "Page deployed successfully (mock mode)",
    });
  }

  try {
    const data = await shopifyAdminGraphql<PageCreatePayload>(
      `mutation pageCreate($page: PageCreateInput!) {
        pageCreate(page: $page) {
          page { id title handle }
          userErrors { field message }
        }
      }`,
      {
        page: {
          title,
          body: body_html,
          isPublished: true,
        },
      },
    );

    if (data.pageCreate.userErrors.length > 0) {
      return NextResponse.json(
        { error: data.pageCreate.userErrors[0].message },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      page: data.pageCreate.page,
      message: `Page "${title}" deployed successfully`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Deploy failed" },
      { status: 500 },
    );
  }
}
