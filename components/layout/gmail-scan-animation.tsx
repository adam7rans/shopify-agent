"use client";

import { useState, useEffect } from "react";

interface GmailScanStep {
  label: string;
  detail: string;
  icon: "connect" | "scan" | "found";
}

const SCAN_STEPS: GmailScanStep[] = [
  {
    label: "Connecting to Gmail",
    detail: "Authenticating with supplier inbox...",
    icon: "connect",
  },
  {
    label: "Scanning inbox",
    detail: "Searching for invoices, receipts, and shipping documents...",
    icon: "scan",
  },
  {
    label: "Processing attachments",
    detail: "Extracting PDF and image attachments from supplier emails...",
    icon: "found",
  },
];

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

function ConnectIcon() {
  return (
    <div className="relative flex h-8 w-8 items-center justify-center">
      <div className="absolute inset-0 animate-ping rounded-full bg-blue-400/20" />
      <GmailLogo className="relative h-6 w-6" />
    </div>
  );
}

function ScanIcon() {
  return (
    <div className="flex h-8 w-8 items-center justify-center">
      <svg className="h-6 w-6 animate-[spin_2s_linear_infinite] text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    </div>
  );
}

function FoundIcon() {
  return (
    <div className="flex h-8 w-8 items-center justify-center">
      <svg className="h-6 w-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    </div>
  );
}

function StepIcon({ icon }: { icon: GmailScanStep["icon"] }) {
  if (icon === "connect") return <ConnectIcon />;
  if (icon === "scan") return <ScanIcon />;
  return <FoundIcon />;
}

export function GmailScanAnimation() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setActiveStep(1), 1800));
    timers.push(setTimeout(() => setActiveStep(2), 3600));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="rounded-[28px] border border-white/70 bg-white/84 p-6 shadow-panel">
      <div className="flex items-center gap-3">
        <GmailLogo className="h-5 w-5" />
        <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
          Email integration
        </p>
      </div>

      <div className="mt-5 space-y-0">
        {SCAN_STEPS.map((step, index) => {
          const isActive = index === activeStep;
          const isDone = index < activeStep;
          const isPending = index > activeStep;

          return (
            <div key={step.label} className="flex gap-4">
              {/* Vertical connector line */}
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
                    <StepIcon icon={step.icon} />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                  )}
                </div>
                {index < SCAN_STEPS.length - 1 && (
                  <div
                    className={`w-0.5 flex-1 transition-colors duration-500 ${
                      isDone ? "bg-emerald-200" : "bg-slate-200"
                    }`}
                    style={{ minHeight: "16px" }}
                  />
                )}
              </div>

              {/* Step content */}
              <div className={`pb-5 transition-opacity duration-500 ${isPending ? "opacity-40" : "opacity-100"}`}>
                <p
                  className={`text-sm font-semibold transition-colors duration-500 ${
                    isDone ? "text-emerald-700" : isActive ? "text-ink" : "text-slate-400"
                  }`}
                >
                  {step.label}
                  {isActive && (
                    <span className="ml-1 inline-flex gap-0.5">
                      <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "0ms" }} />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "150ms" }} />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </p>
                <p className={`mt-0.5 text-sm ${isDone ? "text-emerald-600/70" : "text-slate-500"}`}>
                  {step.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
