"use client";

import { useState, useRef, useEffect } from "react";
import type {
  InvoiceProcessedCardBlock,
  DraftEmailCardBlock,
} from "@/types/agentUi";

type EmailData = {
  to: string;
  from: string;
  subject: string;
  body: string;
  emailType: "backorder_followup" | "damage_claim";
  supplier?: string;
};

type AcceptState = "idle" | "updating" | "accepted" | "error";
type EmailState = "draft" | "editing" | "sending" | "sent";

export function InvoiceCard({
  card,
  mergedEmail,
}: {
  card: InvoiceProcessedCardBlock;
  mergedEmail?: DraftEmailCardBlock | null;
}) {
  const isFlagged = card.status === "flagged";
  const emailSource = card.draftEmail ?? mergedEmail;

  const [acceptState, setAcceptState] = useState<AcceptState>("idle");
  const [emailState, setEmailState] = useState<EmailState>("draft");
  const [editedBody, setEditedBody] = useState(emailSource?.body ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (emailState === "editing" && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
    }
  }, [emailState]);

  const email: EmailData | null = emailSource
    ? {
        to: emailSource.to,
        from: emailSource.from,
        subject: emailSource.subject,
        body: editedBody,
        emailType: emailSource.emailType,
        supplier: "supplier" in emailSource ? (emailSource.supplier as string) : undefined,
      }
    : null;

  async function handleAccept() {
    setAcceptState("updating");
    try {
      const res = await fetch("/api/inventory/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: card.supplier,
          invoiceNumber: card.invoiceNumber,
          inventoryImpact: card.inventoryImpact,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setAcceptState("accepted");
    } catch {
      setAcceptState("error");
    }
  }

  function handleEditDraft() {
    setEmailState("editing");
  }

  function handleSaveEdit() {
    setEmailState("draft");
  }

  function handleCancelEdit() {
    setEditedBody(emailSource?.body ?? "");
    setEmailState("draft");
  }

  async function handleSendEmail() {
    setEmailState("sending");
    await new Promise((r) => setTimeout(r, 1500));
    setEmailState("sent");
  }

  return (
    <div
      className={`max-w-[75%] overflow-hidden rounded-[24px] border bg-white/96 shadow-panel ${
        isFlagged ? "border-amber-200" : "border-slate-200"
      }`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">Invoice parsed</p>
            <h3 className="mt-1 text-lg font-semibold text-ink">{card.supplier}</h3>
            <p className="text-sm text-slate-500">
              {card.invoiceNumber} · ${card.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              acceptState === "accepted"
                ? "bg-emerald-50 text-emerald-700"
                : isFlagged
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {acceptState === "accepted" ? "Accepted" : isFlagged ? "⚠ Flagged" : "Ready for review"}
          </div>
        </div>

        {card.lineItems.length > 0 && (
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
                  {card.lineItems.map((item, i) => (
                    <tr key={i} className={item.condition?.toLowerCase().includes("damaged") ? "bg-red-50/50" : ""}>
                      <td className="px-3 py-2 text-ink">
                        {item.description}
                        {item.backordered && <span className="ml-1 text-amber-600">⚠️ backordered</span>}
                        {item.condition?.toLowerCase().includes("damaged") && (
                          <span className="ml-1 text-red-600">⚠️ {item.condition}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {item.quantityShipped !== undefined && item.quantityShipped !== item.quantity ? (
                          <span>
                            {item.quantityShipped}
                            <span className="text-slate-400">/{item.quantity}</span>
                          </span>
                        ) : (
                          item.quantity
                        )}
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

        {card.inventoryImpact.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Inventory impact</p>
            <div className="space-y-1.5">
              {card.inventoryImpact.map((row, i) => (
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

        {!email && !isFlagged && (
          <div className="mt-5 flex justify-end">
            {acceptState === "idle" && (
              <button
                type="button"
                onClick={handleAccept}
                className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Accept &amp; update inventory
              </button>
            )}
            {acceptState === "updating" && (
              <button
                type="button"
                disabled
                className="flex items-center gap-2 rounded-full bg-emerald-600/70 px-5 py-2.5 text-sm font-medium text-white"
              >
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Updating inventory…
              </button>
            )}
            {acceptState === "accepted" && (
              <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-5 py-2.5 text-sm font-medium text-emerald-700">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Inventory updated
              </div>
            )}
            {acceptState === "error" && (
              <button
                type="button"
                onClick={handleAccept}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Retry update
              </button>
            )}
          </div>
        )}
      </div>

      {email && (
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
                  {email.emailType === "damage_claim" ? "Damage claim draft" : "Backorder follow-up draft"}
                </p>
              </div>
              <div
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  emailState === "sent"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {emailState === "sent" ? "Sent" : "Draft"}
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex gap-2 text-sm">
                <span className="w-14 flex-shrink-0 font-medium text-slate-500">To:</span>
                <span className="text-ink">{email.to}</span>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="w-14 flex-shrink-0 font-medium text-slate-500">From:</span>
                <span className="text-ink">{email.from}</span>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="w-14 flex-shrink-0 font-medium text-slate-500">Subject:</span>
                <span className="font-medium text-ink">{email.subject}</span>
              </div>
              <div className="mt-3 border-t border-slate-200 pt-3">
                {emailState === "editing" ? (
                  <textarea
                    ref={textareaRef}
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="w-full resize-none rounded-lg border border-blue-300 bg-white p-3 text-sm leading-6 text-ink focus:outline-none focus:ring-2 focus:ring-blue-400"
                    rows={editedBody.split("\n").length + 2}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-6 text-ink">
                    {emailState === "sent" ? editedBody : email.body}
                  </div>
                )}
              </div>
            </div>

            {emailState === "sent" && (
              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Email sent to {email.to}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-3">
              {emailState === "editing" ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    Save changes
                  </button>
                </>
              ) : emailState === "sending" ? (
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2 rounded-full bg-blue-600/70 px-5 py-2.5 text-sm font-medium text-white"
                >
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending…
                </button>
              ) : emailState === "sent" ? (
                <button
                  type="button"
                  disabled
                  className="rounded-full bg-slate-200 px-5 py-2.5 text-sm font-medium text-slate-400"
                >
                  Sent
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleEditDraft}
                    className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-slate-50"
                  >
                    Edit draft
                  </button>
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    Send email
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
