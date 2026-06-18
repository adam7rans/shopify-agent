"use client";

import { useState, useMemo } from "react";

interface ColumnDef<R> {
  key: keyof R;
  label: string;
  sortable?: boolean;
  format?: (value: R[keyof R], row: R) => React.ReactNode;
  primary?: boolean;
}

interface SortableTableProps<R> {
  title: string;
  headerChips?: React.ReactNode;
  columns: ColumnDef<R>[];
  rows: R[];
  rowKey: (row: R, index: number) => string;
}

type SortDir = "asc" | "desc";

function ChevronUp({ active }: { active: boolean }) {
  return (
    <svg className={`h-3 w-3 ${active ? "text-ink" : "text-slate-300"}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8l3-4 3 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDown({ active }: { active: boolean }) {
  return (
    <svg className={`h-3 w-3 ${active ? "text-ink" : "text-slate-300"}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 4l3 4 3-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SortableTable<R extends object>({
  title,
  headerChips,
  columns,
  rows,
  rowKey,
}: SortableTableProps<R>) {
  const [sortCol, setSortCol] = useState<keyof R | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    const sorted = [...rows].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return sorted;
  }, [rows, sortCol, sortDir]);

  function handleSort(key: keyof R) {
    if (sortCol === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white/98 shadow-panel">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {headerChips ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">{headerChips}</div>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-shell text-slate-600">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-4 py-3 font-medium ${col.primary ? "md:px-6" : ""} ${col.sortable ? "cursor-pointer select-none hover:text-ink" : ""}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {col.sortable ? (
                      <span className="inline-flex flex-col gap-0">
                        <ChevronUp active={sortCol === col.key && sortDir === "asc"} />
                        <ChevronDown active={sortCol === col.key && sortDir === "desc"} />
                      </span>
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <tr key={rowKey(row, i)} className="border-t border-slate-100 text-slate-700">
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`px-4 py-3 ${col.primary ? "font-medium text-ink md:px-6" : ""}`}
                  >
                    {col.format ? col.format(row[col.key], row) : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
