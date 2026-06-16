"use client";

import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
  Brush,
} from "recharts";
import type {
  AgentChartBlock,
  PieChartBlock,
  BarChartBlock,
  LineChartBlock,
} from "@/types/agentUi";

const CATEGORY_COLORS: Record<string, string> = {
  "Sour candy": "#e8a735",
  "Japanese gummies": "#d4577a",
  "Jelly candy": "#5daa68",
  "Character / kawaii candy": "#7c6bc4",
  "Chocolate candy": "#8b6347",
  "Matcha candy": "#5daa68",
  "Hard candy": "#4a90d9",
  "Chewy candy": "#e07b39",
  "Mochi": "#c470b3",
  "Ramune": "#3db8c1",
};

const PALETTE = [
  "#e8a735",
  "#d4577a",
  "#5daa68",
  "#7c6bc4",
  "#4a90d9",
  "#e07b39",
  "#8b6347",
  "#c470b3",
  "#3db8c1",
  "#9aab4f",
  "#d96459",
  "#6b8cae",
];

function getColor(index: number, category?: string): string {
  if (category && CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  return PALETTE[index % PALETTE.length];
}

function formatValue(value: number, label?: string): string {
  if (label === "revenue" || label === "cost" || label === "margin") {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return value.toLocaleString();
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: Record<string, unknown> }>;
  valueLabel?: string;
}

function ChartTooltip({ active, payload, valueLabel }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
      <p className="text-sm font-medium text-ink">{item.name}</p>
      <p className="mt-1 text-lg font-semibold text-ink">
        {formatValue(item.value, valueLabel)}
        {valueLabel && !["revenue", "cost", "margin"].includes(valueLabel) ? ` ${valueLabel}` : ""}
      </p>
    </div>
  );
}

function renderPieChart(chart: PieChartBlock) {
  const total = chart.segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white/98 p-6 shadow-panel">
      <h3 className="text-base font-semibold text-ink">{chart.title}</h3>
      <div className="mt-4 flex flex-col items-center gap-6 lg:flex-row">
        <div className="h-[320px] w-full max-w-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chart.segments}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={60}
                paddingAngle={2}
                strokeWidth={2}
                stroke="#fff"
              >
                {chart.segments.map((segment, i) => (
                  <Cell key={segment.label} fill={getColor(i, segment.category)} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip valueLabel={chart.valueLabel} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full max-w-[340px] space-y-2">
          {chart.segments.map((segment, i) => {
            const pct = total > 0 ? ((segment.value / total) * 100).toFixed(1) : "0";
            return (
              <div key={segment.label} className="flex items-center gap-3">
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: getColor(i, segment.category) }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  {segment.label}
                </span>
                <span className="shrink-0 text-sm font-medium text-ink">
                  {formatValue(segment.value, chart.valueLabel)}
                </span>
                <span className="shrink-0 text-xs text-slate-400">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function truncateLabel(label: string, max: number): string {
  return label.length > max ? `${label.slice(0, max)}…` : label;
}

function FilterableBarChart({ chart }: { chart: BarChartBlock }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visibleBars = useMemo(
    () => chart.bars.filter((b) => !hidden.has(b.label)),
    [chart.bars, hidden],
  );

  const showFilter = chart.bars.length > 4;

  function toggle(label: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white/98 p-6 shadow-panel">
      <h3 className="text-base font-semibold text-ink">{chart.title}</h3>
      {showFilter && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chart.bars.map((bar, i) => {
            const active = !hidden.has(bar.label);
            const color = getColor(i, bar.category);
            return (
              <button
                key={bar.label}
                type="button"
                onClick={() => toggle(bar.label)}
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition"
                style={{
                  borderColor: active ? color : "#e2e8f0",
                  backgroundColor: active ? `${color}14` : "transparent",
                  color: active ? color : "#94a3b8",
                  opacity: active ? 1 : 0.6,
                }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: active ? color : "#cbd5e1" }}
                />
                {truncateLabel(bar.label, 18)}
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-4 h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={visibleBars}
            margin={{ top: 8, right: 8, bottom: 24, left: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ece4" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#64748b" }}
              angle={-35}
              textAnchor="end"
              height={120}
              interval={0}
              tickFormatter={(value: string) => truncateLabel(value, 22)}
              label={
                chart.xAxisLabel
                  ? { value: chart.xAxisLabel, position: "insideBottom", offset: 0, fontSize: 12, fill: "#94a3b8" }
                  : undefined
              }
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              label={
                chart.yAxisLabel
                  ? { value: chart.yAxisLabel, angle: -90, position: "insideLeft", offset: 8, fontSize: 12, fill: "#94a3b8" }
                  : undefined
              }
            />
            <Tooltip content={<ChartTooltip valueLabel={chart.valueLabel} />} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
              {visibleBars.map((bar) => {
                const originalIndex = chart.bars.findIndex((b) => b.label === bar.label);
                return <Cell key={bar.label} fill={getColor(originalIndex, bar.category)} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RangeLineChart({ chart }: { chart: LineChartBlock }) {
  const merged = useMemo(() => {
    const xSet = new Set<string>();
    for (const s of chart.series) {
      for (const dp of s.dataPoints) xSet.add(dp.x);
    }
    const xValues = Array.from(xSet).sort();
    return xValues.map((x) => {
      const point: Record<string, string | number> = { x };
      for (const s of chart.series) {
        const match = s.dataPoints.find((dp) => dp.x === x);
        point[s.name] = match ? match.y : 0;
      }
      return point;
    });
  }, [chart.series]);

  const showBrush = chart.enableBrush !== false && merged.length > 10;

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white/98 p-6 shadow-panel">
      <h3 className="text-base font-semibold text-ink">{chart.title}</h3>
      <div className="mt-4 h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={merged} margin={{ top: 8, right: 24, bottom: 24, left: 24 }}>
            <defs>
              {chart.series.map((s, i) => (
                <linearGradient key={s.name} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ece4" />
            <XAxis
              dataKey="x"
              tick={{ fontSize: 11, fill: "#64748b" }}
              label={
                chart.xAxisLabel
                  ? { value: chart.xAxisLabel, position: "insideBottom", offset: -4, fontSize: 12, fill: "#94a3b8" }
                  : undefined
              }
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              label={
                chart.yAxisLabel
                  ? { value: chart.yAxisLabel, angle: -90, position: "insideLeft", offset: 8, fontSize: 12, fill: "#94a3b8" }
                  : undefined
              }
            />
            <Tooltip content={<ChartTooltip valueLabel={chart.yAxisLabel} />} />
            {chart.series.length > 1 ? (
              <Legend
                iconType="circle"
                iconSize={10}
                formatter={(value: string) => (
                  <span className="text-sm text-slate-700">{value}</span>
                )}
              />
            ) : null}
            {chart.series.map((s, i) => (
              <Area
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={2.5}
                fill={`url(#gradient-${i})`}
                dot={{ r: 3, fill: PALETTE[i % PALETTE.length], strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              />
            ))}
            {showBrush ? (
              <Brush
                dataKey="x"
                height={28}
                stroke="#e8a735"
                fill="#fefbf4"
                travellerWidth={10}
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function renderChart(chart: AgentChartBlock) {
  if (chart.type === "pie_chart") return renderPieChart(chart);
  if (chart.type === "bar_chart") return <FilterableBarChart chart={chart} />;
  return <RangeLineChart chart={chart} />;
}
