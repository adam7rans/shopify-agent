"use client";

import { useState, useMemo, useCallback } from "react";

interface LiquidCodeBlockProps {
  content: string;
  filename?: string;
}

function liquidToPreviewHtml(liquid: string): string {
  let html = liquid;

  html = html.replace(/\{%[-\s]*layout\s+'[^']*'\s*[-]?%\}/g, "");
  html = html.replace(/\{%[-\s]*comment\s*[-]?%\}[\s\S]*?\{%[-\s]*endcomment\s*[-]?%\}/g, "");

  html = html.replace(
    /\{%[-\s]*for\s+product\s+in\s+collection\.products\s*[-]?%\}([\s\S]*?)\{%[-\s]*endfor\s*[-]?%\}/g,
    (_match, body: string) => {
      const sampleProducts = [
        { title: "Hi-Chew Green Apple", price: "$3.49", image: "/products/hi-chew-green-apple-fruit-chews.png", url: "#" },
        { title: "Kasugai Peach Gummy", price: "$4.29", image: "/products/kasugai-peach-gummy.png", url: "#" },
        { title: "Hi-Chew Strawberry", price: "$3.49", image: "/products/hi-chew-strawberry-fruit-chews.png", url: "#" },
        { title: "UHA Kororo Peach Jelly", price: "$3.99", image: "/products/uha-kororo-peach-jelly-bites.png", url: "#" },
      ];
      return sampleProducts
        .map((p) => {
          let rendered = body;
          rendered = rendered.replace(/\{\{\s*product\.title\s*\}\}/g, p.title);
          rendered = rendered.replace(/\{\{\s*product\.price\s*\|[^}]*\}\}/g, p.price);
          rendered = rendered.replace(/\{\{\s*product\.featured_image\s*\|\s*img_url:\s*'[^']*'\s*\}\}/g, p.image);
          rendered = rendered.replace(/\{\{\s*product\.url\s*\}\}/g, p.url);
          rendered = rendered.replace(/\{\{\s*product\.description\s*(?:\|[^}]*)?\}\}/g, "Premium Japanese gummy candy");
          return rendered;
        })
        .join("\n");
    },
  );

  html = html.replace(/\{\{\s*collection\.title\s*\}\}/g, "Japanese Gummies");
  html = html.replace(/\{\{\s*collection\.description\s*\}\}/g, "Discover our curated selection of premium Japanese gummy candies.");

  html = html.replace(/\{%[\s\S]*?%\}/g, "");
  html = html.replace(/\{\{[\s\S]*?\}\}/g, "");

  return html;
}

export function LiquidCodeBlock({ content, filename }: LiquidCodeBlockProps) {
  const [tab, setTab] = useState<"code" | "preview">("code");
  const [deploying, setDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<"idle" | "success" | "error">("idle");

  const previewHtml = useMemo(() => liquidToPreviewHtml(content), [content]);

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
            onClick={() => setTab("code")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
              tab === "code"
                ? "bg-white text-ink shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Code
          </button>
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
        <pre className="overflow-x-auto bg-[#1e1e2e] p-5 text-sm leading-6 text-[#cdd6f4]">
          <code>{content}</code>
        </pre>
      ) : (
        <div className="bg-white p-6">
          <div className="mx-auto max-w-[800px] rounded-xl border border-slate-200 bg-white shadow-sm">
            <iframe
              srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;color:#1a1a2e}img{max-width:100%;height:auto;border-radius:8px}</style></head><body>${previewHtml}</body></html>`}
              className="h-[480px] w-full rounded-xl border-0"
              sandbox="allow-same-origin"
              title="Liquid template preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
