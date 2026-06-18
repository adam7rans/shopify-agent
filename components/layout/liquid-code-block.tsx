"use client";

import { useState, useMemo, useCallback } from "react";
import type { LiquidPreviewProduct } from "@/types/agentUi";

interface LiquidCodeBlockProps {
  content: string;
  filename?: string;
  previewProducts?: LiquidPreviewProduct[];
  collectionTitle?: string;
}

interface SampleProduct {
  title: string;
  price: string;
  image: string;
  url: string;
  description: string;
}

function parseCollectionInfo(liquid: string): { title: string; description: string } {
  const handleMatch = liquid.match(/collections\['([^']+)'\]/);
  if (handleMatch) {
    const title = handleMatch[1]
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { title, description: `Discover our curated selection of ${title.toLowerCase()}.` };
  }
  const h1Match = liquid.match(/<h1[^>]*>([^<{]+)<\/h1>/i);
  if (h1Match) {
    return { title: h1Match[1].trim(), description: "" };
  }
  return { title: "Collection", description: "Browse our collection." };
}

function buildPreviewHtml(products: SampleProduct[], title: string, description: string): string {
  const cards = products
    .map(
      (p) => `<div class="product-card">
  <a href="#">
    <img class="product-image" src="${p.image}" alt="${p.title}" />
    <h2>${p.title}</h2>
    <span class="product-price">$${p.price}</span>
    <p class="description">${p.description}</p>
  </a>
</div>`,
    )
    .join("\n");

  return `<h1 class="collection-title">${title}</h1>
${description ? `<p>${description}</p>` : ""}
<div class="product-grid">${cards}</div>`;
}

function liquidToPreviewHtml(liquid: string, externalProducts?: LiquidPreviewProduct[], externalTitle?: string): string {
  const parsed = parseCollectionInfo(liquid);
  const title = externalTitle || parsed.title;
  const description = externalTitle
    ? `Discover our curated selection of ${externalTitle.toLowerCase()}.`
    : parsed.description;

  if (externalProducts && externalProducts.length > 0) {
    const products = externalProducts.map((p) => ({
      title: p.title,
      price: p.price,
      image: p.image,
      url: "#",
      description: p.description ?? "",
    }));
    return buildPreviewHtml(products, title, description);
  }

  let html = liquid;
  html = html.replace(/\{%[-\s]*layout\s+'[^']*'\s*[-]?%\}/g, "");
  html = html.replace(/\{%[-\s]*comment\s*[-]?%\}[\s\S]*?\{%[-\s]*endcomment\s*[-]?%\}/g, "");

  const fallbackProducts: SampleProduct[] = [
    { title: "Sample Product 1", price: "4.99", image: "/products/placeholder.png", url: "#", description: "Sample product" },
    { title: "Sample Product 2", price: "5.99", image: "/products/placeholder.png", url: "#", description: "Sample product" },
  ];

  html = html.replace(
    /\{%[-\s]*for\s+product\s+in\s+\S+\.products\s*[-]?%\}([\s\S]*?)\{%[-\s]*endfor\s*[-]?%\}/g,
    (_match, body: string) => {
      return fallbackProducts
        .map((p) => {
          let rendered = body;
          rendered = rendered.replace(/\{\{\s*product\.title\s*\}\}/g, p.title);
          rendered = rendered.replace(/\$?\{\{\s*product\.price[^}]*\}\}/g, `$${p.price}`);
          rendered = rendered.replace(/\{\{\s*product\.featured_image[^}]*\}\}/g, p.image);
          rendered = rendered.replace(/\{\{\s*product\.images\s*\[\s*0\s*\][^}]*\}\}/g, p.image);
          rendered = rendered.replace(/\{\{\s*product\.image[^}]*\}\}/g, p.image);
          rendered = rendered.replace(/\{\{\s*product\.url\s*\}\}/g, p.url);
          rendered = rendered.replace(/\{\{\s*product\.description[^}]*\}\}/g, p.description);
          return rendered;
        })
        .join("\n");
    },
  );

  html = html.replace(/\{\{\s*(?:collection\.title|collections\[[^\]]*\]\.title)\s*\}\}/g, title);
  html = html.replace(/\{\{\s*(?:collection\.description|collections\[[^\]]*\]\.description)\s*\}\}/g, description);

  html = html.replace(/\{%[\s\S]*?%\}/g, "");
  html = html.replace(/\{\{[\s\S]*?\}\}/g, "");

  return html;
}

export function LiquidCodeBlock({ content, filename, previewProducts, collectionTitle }: LiquidCodeBlockProps) {
  const [tab, setTab] = useState<"code" | "preview">("preview");
  const [deploying, setDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<"idle" | "success" | "error">("idle");

  const previewHtml = useMemo(() => liquidToPreviewHtml(content, previewProducts, collectionTitle), [content, previewProducts, collectionTitle]);

  const handleDeploy = useCallback(async () => {
    setDeploying(true);
    setDeployStatus("idle");
    try {
      const res = await fetch("/api/shopify/deploy-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: filename?.replace(/\.liquid$/, "").replace(/[-_]/g, " ") ?? "Generated Page",
          body_html: previewHtml,
        }),
      });
      if (!res.ok) throw new Error("Deploy failed");
      setDeployStatus("success");
      setTimeout(() => setDeployStatus("idle"), 3000);
    } catch {
      setDeployStatus("error");
      setTimeout(() => setDeployStatus("idle"), 3000);
    } finally {
      setDeploying(false);
    }
  }, [previewHtml, filename]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white/96 shadow-panel">
      <div className="flex items-center justify-between border-b border-slate-200 bg-shell px-2 py-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
              tab === "preview"
                ? "bg-white text-ink shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setTab("code")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
              tab === "code"
                ? "bg-white text-ink shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Code
          </button>
          {filename && (
            <span className="ml-3 font-mono text-[11px] text-slate-400">{filename}</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleDeploy}
          disabled={deploying || deployStatus === "success"}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
            deployStatus === "success"
              ? "bg-matcha/15 text-matcha"
              : deployStatus === "error"
                ? "bg-red-50 text-red-600"
                : "bg-plum text-white hover:bg-plum/90 disabled:opacity-50"
          }`}
        >
          {deploying ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Deploying…
            </>
          ) : deployStatus === "success" ? (
            <>
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Deployed
            </>
          ) : deployStatus === "error" ? (
            "Deploy failed"
          ) : (
            <>
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 3v10M6 9l4 4 4-4M4 15h12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Deploy
            </>
          )}
        </button>
      </div>

      {tab === "code" ? (
        <pre className="overflow-x-auto bg-[#faf9f7] p-5 text-sm leading-6 text-[#1a1a2e]">
          <code>{content}</code>
        </pre>
      ) : (
        <div className="bg-white p-6">
          <div className="mx-auto max-w-[800px] rounded-xl border border-slate-200 bg-white shadow-sm">
            <iframe
              srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a2e;padding:24px;overflow:hidden}
a{text-decoration:none;color:inherit}
h1,h2,h3{font-weight:600}
h1{font-size:1.5rem;margin-bottom:6px}
h2{font-size:0.85rem;margin-top:8px}
p{font-size:0.8rem;color:#64748b;margin-top:2px}
img{width:100%!important;aspect-ratio:1/1!important;object-fit:cover!important;border-radius:8px}
[class*="grid"],[class*="product-grid"],[class*="products-grid"]{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;margin-top:16px}
[class*="product-card"],[class*="card"]{border:1px solid #e8e4dd;border-radius:12px;overflow:hidden;padding:10px}
[class*="product-card"] a,[class*="card"] a{display:flex;flex-direction:column;gap:0}
[class*="product-image"],[class*="card"] img{aspect-ratio:1/1!important;width:100%!important;object-fit:cover!important;border-radius:8px;background:#f8f6f2}
[class*="price"],[class*="product-price"]{font-size:0.8rem;font-weight:600;color:#1a1a2e;margin-top:2px}
[class*="description"]{font-size:0.7rem;color:#94a3b8;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
[class*="collection-title"]{font-size:1.5rem}
</style></head><body>${previewHtml}<script>function resize(){var h=document.body.scrollHeight;parent.postMessage({type:'iframe-height',height:h},'*')}window.addEventListener('load',resize);new MutationObserver(resize).observe(document.body,{childList:true,subtree:true});document.querySelectorAll('img').forEach(function(i){i.addEventListener('load',resize);i.addEventListener('error',resize)})</script></body></html>`}
              className="w-full rounded-xl border-0"
              style={{ minHeight: 200 }}
              sandbox="allow-same-origin allow-scripts"
              title="Liquid template preview"
              onLoad={(e) => {
                const iframe = e.currentTarget;
                const handler = (evt: MessageEvent) => {
                  if (evt.data?.type === 'iframe-height' && typeof evt.data.height === 'number') {
                    iframe.style.height = evt.data.height + 'px';
                  }
                };
                window.addEventListener('message', handler);
                return () => window.removeEventListener('message', handler);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
