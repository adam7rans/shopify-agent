"use client";

import type { ActivityLogEntry } from "@/types/activityLog";
import type { ProcessedDocument } from "@/lib/tools/documentParser";

interface DocumentProcessingAnimationProps {
  activityLog: ActivityLogEntry[];
}

interface DocFile {
  filename: string;
  fileType: "image" | "pdf";
}

interface ParsedDoc {
  filename: string;
  fileType: "image" | "pdf";
  document: ProcessedDocument;
}

type GmailPhase = "connecting" | "scanning" | "done" | null;

function deriveState(log: ActivityLogEntry[]) {
  let files: DocFile[] = [];
  let activeIndex = -1;
  let activeFileType: "image" | "pdf" | null = null;
  const parsed: ParsedDoc[] = [];
  let gmailPhase: GmailPhase = null;
  let foundCount = 0;

  for (const entry of log) {
    const d = entry.data;
    if (!d) continue;

    if (d.event === "gmail_connect") {
      gmailPhase = "connecting";
    }

    if (d.event === "gmail_scan") {
      gmailPhase = "scanning";
    }

    if (d.event === "scan_start") {
      gmailPhase = "done";
      files = (d.files as DocFile[]) ?? [];
      foundCount = files.length;
    }

    if (d.event === "parse_start") {
      activeIndex = d.index as number;
      activeFileType = (d.fileType as "image" | "pdf") ?? null;
    }

    if (d.event === "parse_complete") {
      const doc = d.document as unknown as ProcessedDocument;
      parsed.push({
        filename: d.filename as string,
        fileType: (d.fileType as "image" | "pdf") ?? "pdf",
        document: doc,
      });
      activeIndex = -1;
      activeFileType = null;
    }
  }

  return { files, activeIndex, activeFileType, parsed, gmailPhase, foundCount };
}

function FileTypeBadge({ type }: { type: "image" | "pdf" }) {
  if (type === "image") {
    return (
      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-600">
        png
      </span>
    );
  }
  return (
    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-600">
      pdf
    </span>
  );
}

function VisionScanIcon() {
  return (
    <div className="relative flex h-6 w-6 items-center justify-center">
      <svg className="h-5 w-5 animate-pulse text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    </div>
  );
}

function GmailLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22 6L12 13L2 6V4L12 11L22 4V6Z" fill="#EA4335" />
      <path d="M2 6L12 13L22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6Z" fill="#FBBC05" />
      <path d="M2 6V18C2 19.1 2.9 20 4 20H12V13L2 6Z" fill="#34A853" />
      <path d="M22 6V18C22 19.1 21.1 20 20 20H12V13L22 6Z" fill="#4285F4" />
      <rect x="2" y="4" width="20" height="2" rx="1" fill="#EA4335" />
    </svg>
  );
}

function GmailSteps({ phase, foundCount }: { phase: GmailPhase; foundCount: number }) {
  const steps = [
    { id: "connect", label: "Connecting to Gmail", detail: "Authenticating with supplier inbox..." },
    { id: "scan", label: "Scanning inbox", detail: "Searching for invoices, receipts, and shipping documents..." },
    { id: "found", label: "Extracting attachments", detail: `Found ${foundCount} documents attached to supplier emails` },
  ];

  const activeIdx = phase === "connecting" ? 0 : phase === "scanning" ? 1 : phase === "done" ? 3 : -1;

  return (
    <div className="rounded-[28px] border border-white/70 bg-white/84 p-6 shadow-panel">
      <div className="flex items-center gap-3">
        <GmailLogo className="h-5 w-5" />
        <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Email integration</p>
      </div>
      <div className="mt-5 space-y-0">
        {steps.map((step, index) => {
          const isActive = index === activeIdx;
          const isDone = index < activeIdx;
          const isPending = index > activeIdx;

          return (
            <div key={step.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                  isDone ? "bg-emerald-50" : isActive ? "bg-blue-50" : "bg-slate-50"
                }`}>
                  {isDone ? (
                    <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : isActive ? (
                    <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-0.5 flex-1 transition-colors duration-500 ${isDone ? "bg-emerald-200" : "bg-slate-200"}`} style={{ minHeight: "16px" }} />
                )}
              </div>
              <div className={`pb-5 transition-opacity duration-500 ${isPending ? "opacity-40" : "opacity-100"}`}>
                <p className={`text-sm font-semibold transition-colors duration-500 ${
                  isDone ? "text-emerald-700" : isActive ? "text-ink" : "text-slate-400"
                }`}>
                  {step.label}
                  {isActive && (
                    <span className="ml-1 inline-flex gap-0.5">
                      <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "0ms" }} />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "150ms" }} />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </p>
                <p className={`mt-0.5 text-sm ${isDone ? "text-emerald-600/70" : "text-slate-500"}`}>{step.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DocumentProcessingAnimation({ activityLog }: DocumentProcessingAnimationProps) {
  const { files, activeIndex, activeFileType, parsed, gmailPhase, foundCount } = deriveState(activityLog);

  const parsedFilenames = new Set(parsed.map((p) => p.filename));
  const showParseList = gmailPhase === "done";

  return (
    <div className="space-y-4">
      <GmailSteps phase={gmailPhase ?? "connecting"} foundCount={foundCount} />

      {showParseList && (
      <div className="rounded-[28px] border border-white/70 bg-white/84 p-6 shadow-panel">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 text-plum/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p className="text-sm uppercase tracking-[0.18em] text-plum/70">
            Parsing documents with AI vision
          </p>
        </div>

        <div className="mt-5 space-y-0">
          {files.map((file, index) => {
              const isActive = index === activeIndex;
              const isDone = parsedFilenames.has(file.filename);
              const isPending = !isActive && !isDone;
              const parsedDoc = parsed.find((p) => p.filename === file.filename);

              return (
                <div key={file.filename} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                        isDone
                          ? "bg-emerald-50"
                          : isActive
                            ? "bg-blue-50"
                            : "bg-slate-50"
                      }`}
                    >
                      {isDone ? (
                        <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : isActive ? (
                        <VisionScanIcon />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-slate-300" />
                      )}
                    </div>
                    {index < files.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 transition-colors duration-500 ${
                          isDone ? "bg-emerald-200" : "bg-slate-200"
                        }`}
                        style={{ minHeight: "16px" }}
                      />
                    )}
                  </div>

                  <div className={`pb-5 transition-opacity duration-500 ${isPending ? "opacity-40" : "opacity-100"}`}>
                    <p className={`text-sm font-semibold transition-colors duration-500 ${
                      isDone ? "text-emerald-700" : isActive ? "text-ink" : "text-slate-400"
                    }`}>
                      {parsedDoc ? parsedDoc.document.supplier : isActive ? "Parsing" : file.filename.replace(/\.(png|pdf)$/, "").replace(/[-_]/g, " ")}
                      {isActive && (
                        <span className="ml-1 inline-flex gap-0.5">
                          <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "0ms" }} />
                          <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "150ms" }} />
                          <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "300ms" }} />
                        </span>
                      )}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className={`text-xs ${isDone ? "text-emerald-600/60" : "text-slate-400"}`}>
                        {file.filename}
                      </span>
                      <FileTypeBadge type={file.fileType} />
                    </div>
                    <p className={`mt-0.5 text-sm ${isDone ? "text-emerald-600/70" : "text-slate-500"}`}>
                      {isActive
                        ? file.fileType === "image"
                          ? "Reading image with AI vision — images take a bit longer than PDFs"
                          : "Extracting line items and cross-referencing inventory..."
                        : isDone && parsedDoc
                          ? parsedDoc.document.status === "flagged"
                            ? `${parsedDoc.document.invoiceNumber} · $${parsedDoc.document.total.toLocaleString("en-US", { minimumFractionDigits: 2 })} · ⚠️ ${parsedDoc.document.flagReason}`
                            : `${parsedDoc.document.invoiceNumber} · $${parsedDoc.document.total.toLocaleString("en-US", { minimumFractionDigits: 2 })} · Ready for review`
                          : "Waiting..."}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {parsed.map((p) => {
        const isFlagged = p.document.status === "flagged";
        return (
          <div key={p.filename} className={`max-w-[75%] overflow-hidden rounded-[24px] border bg-white/96 shadow-panel ${
            isFlagged ? "border-amber-200" : "border-emerald-200"
          }`}>
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-600">Invoice parsed</p>
                  <h4 className="mt-1 text-lg font-semibold text-ink">{p.document.supplier}</h4>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {p.document.invoiceNumber} · ${p.document.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                  isFlagged ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                }`}>
                  {isFlagged ? "Flagged" : "Ready for review"}
                </div>
              </div>

              {p.document.lineItems.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Line items</p>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Item</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-600">Qty</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-600">Price</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-600">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {p.document.lineItems.map((item, i) => (
                          <tr key={i} className={item.condition?.toLowerCase().includes("damaged") ? "bg-red-50/50" : ""}>
                            <td className="px-3 py-2 text-ink">
                              {item.description}
                              {item.backordered && <span className="ml-1 text-amber-600">⚠️ backordered</span>}
                              {item.condition?.toLowerCase().includes("damaged") && <span className="ml-1 text-red-600">⚠️ {item.condition}</span>}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600">
                              {item.quantityShipped !== undefined && item.quantityShipped !== item.quantity
                                ? <span>{item.quantityShipped}<span className="text-slate-400">/{item.quantity}</span></span>
                                : item.quantity}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600">${item.unitPrice.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-medium text-ink">${item.lineTotal.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {p.document.inventoryImpact.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Inventory impact</p>
                  <div className="space-y-1.5">
                    {p.document.inventoryImpact.map((row, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 truncate text-ink">{row.item}</span>
                        <span className="text-slate-500">{row.currentStock}</span>
                        <span className="text-emerald-500">→</span>
                        <span className="font-semibold text-emerald-700">{row.projectedStock}</span>
                        <span className="text-xs text-emerald-600">(+{row.incoming})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isFlagged && (
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                  >
                    Accept &amp; update inventory
                  </button>
                </div>
              )}
            </div>

            {p.document.draftEmail && (
              <>
                <div className="border-t border-dashed border-slate-300" />
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      <p className="text-xs uppercase tracking-[0.18em] text-blue-600">
                        {p.document.draftEmail.emailType === "damage_claim" ? "Damage claim draft" : "Backorder follow-up draft"}
                      </p>
                    </div>
                    <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">Draft</div>
                  </div>

                  <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="flex gap-2 text-sm">
                      <span className="w-14 flex-shrink-0 font-medium text-slate-500">To:</span>
                      <span className="text-ink">{p.document.draftEmail.to}</span>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <span className="w-14 flex-shrink-0 font-medium text-slate-500">From:</span>
                      <span className="text-ink">{p.document.draftEmail.from}</span>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <span className="w-14 flex-shrink-0 font-medium text-slate-500">Subject:</span>
                      <span className="font-medium text-ink">{p.document.draftEmail.subject}</span>
                    </div>
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <div className="whitespace-pre-wrap text-sm leading-6 text-ink">{p.document.draftEmail.body}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-slate-50"
                    >
                      Edit draft
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                    >
                      Send email
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
