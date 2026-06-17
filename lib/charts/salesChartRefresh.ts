import type {
  AgentChartBlock,
  AgentToolTraceEntry,
  BarChartBlock,
  ChartRangePreset,
  ChartTimeControls,
  LineChartBlock,
  PieChartBlock,
  SalesChartRefreshQuery,
} from "@/types/agentUi";
import {
  resolveExplicitTimeWindow,
  resolveTimeWindowFromPrompt,
  type TimeGrain,
} from "@/lib/agent/timeWindows";
import { executeGetSalesData, type GetSalesDataArgs } from "@/lib/agent/toolExecutors";
import { resolveAnalysisReferenceDate } from "@/lib/tools/bestSellers";

const DEFAULT_PRESETS: ChartRangePreset[] = ["7d", "30d", "90d", "6m", "12m"];

function isSalesToolTraceEntry(entry: AgentToolTraceEntry) {
  return entry.toolName === "get_sales_data";
}

function normalizeToolString(value: string | number | undefined) {
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function inferPresetFromTimeQuery(timeQuery?: string): ChartRangePreset | undefined {
  if (!timeQuery) return undefined;
  const normalized = timeQuery.trim().toLowerCase();
  if (normalized === "past 7 days") return "7d";
  if (normalized === "past 30 days" || normalized === "past month") return "30d";
  if (normalized === "past 90 days" || normalized === "past 3 months") return "90d";
  if (normalized === "past 6 months") return "6m";
  if (normalized === "past 12 months" || normalized === "past year" || normalized === "last year") return "12m";
  return undefined;
}

function presetToTimeQuery(preset: ChartRangePreset) {
  switch (preset) {
    case "7d":
      return "past 7 days";
    case "30d":
      return "past 30 days";
    case "90d":
      return "past 90 days";
    case "6m":
      return "past 6 months";
    case "12m":
      return "past 12 months";
  }
}

function presetToLabel(preset: ChartRangePreset) {
  switch (preset) {
    case "7d":
      return "Past 7 days";
    case "30d":
      return "Past 30 days";
    case "90d":
      return "Past 90 days";
    case "6m":
      return "Past 6 months";
    case "12m":
      return "Past 12 months";
  }
}

function humanizeTimeLabel(query?: string) {
  if (!query) return "Past 30 days";
  return query.charAt(0).toUpperCase() + query.slice(1);
}

function buildCurrentLabel(query: SalesChartRefreshQuery) {
  if (query.timeQuery) return humanizeTimeLabel(query.timeQuery);
  if (query.startDate && query.endDate) return `${query.startDate} to ${query.endDate}`;
  return "Past 30 days";
}

function inferChartKind(chart: AgentChartBlock): SalesChartRefreshQuery["chartKind"] | null {
  if (chart.type === "pie_chart") return "revenue_by_category";
  if (chart.type === "bar_chart") {
    if (/revenue/i.test(chart.title) || /revenue/i.test(chart.valueLabel ?? "")) {
      return "revenue_by_category";
    }
    return "sales_by_category";
  }
  return "sales_trend";
}

function buildQueryFromTrace(chart: AgentChartBlock, traceEntry?: AgentToolTraceEntry): SalesChartRefreshQuery | null {
  const chartKind = inferChartKind(chart);
  if (!chartKind) return null;

  const input = traceEntry?.input ?? {};
  const timeQuery = normalizeToolString(input.time_query) ?? normalizeToolString(input.date_range);
  const startDate = normalizeToolString(input.start_date);
  const endDate = normalizeToolString(input.end_date);
  const query: SalesChartRefreshQuery = {
    source: "sales_data",
    chartKind,
    title: chart.title,
    xAxisLabel: "xAxisLabel" in chart ? chart.xAxisLabel : undefined,
    yAxisLabel: "yAxisLabel" in chart ? chart.yAxisLabel : undefined,
    valueLabel:
      chart.type === "pie_chart" || chart.type === "bar_chart"
        ? chart.valueLabel
        : undefined,
    includeRevenueSeries:
      chart.type === "line_chart"
        ? chart.series.some((series) => /revenue/i.test(series.name))
        : undefined,
    category: normalizeToolString(input.category),
    country: normalizeToolString(input.country),
    sku: normalizeToolString(input.sku),
    timeQuery,
    startDate,
    endDate,
    grain:
      normalizeToolString(input.grain) === "day" ||
      normalizeToolString(input.grain) === "week" ||
      normalizeToolString(input.grain) === "month" ||
      normalizeToolString(input.grain) === "auto"
        ? (normalizeToolString(input.grain) as "auto" | TimeGrain)
        : undefined,
  };

  if (!query.timeQuery && !query.startDate && !query.endDate) {
    query.timeQuery = "past 30 days";
  }

  if (
    query.timeQuery &&
    !query.originalTimeQuery &&
    !inferPresetFromTimeQuery(query.timeQuery)
  ) {
    query.originalTimeQuery = query.timeQuery;
    query.originalLabel = humanizeTimeLabel(query.timeQuery);
  }

  if (!query.valueLabel) {
    if (chartKind === "revenue_by_category") query.valueLabel = "revenue";
    else if (chartKind === "sales_by_category") query.valueLabel = "units sold";
  }

  if (chart.type === "line_chart" && !query.yAxisLabel) {
    query.yAxisLabel = query.includeRevenueSeries ? "Units / Revenue" : "Units Sold";
  }

  return query;
}

function attachTimeControls<T extends AgentChartBlock>(
  chart: T,
  query: SalesChartRefreshQuery,
): T {
  const customOption =
    query.originalTimeQuery && !inferPresetFromTimeQuery(query.originalTimeQuery)
      ? {
          label: query.originalLabel ?? humanizeTimeLabel(query.originalTimeQuery),
          timeQuery: query.originalTimeQuery,
        }
      : undefined;

  const timeControls: ChartTimeControls = {
    kind: "sales",
    currentLabel: buildCurrentLabel(query),
    currentPreset: inferPresetFromTimeQuery(query.timeQuery),
    presets: DEFAULT_PRESETS,
    query,
    customOption,
  };

  return {
    ...chart,
    timeControls,
  };
}

export function enhanceChartsWithTimeControls(
  charts: AgentChartBlock[] | undefined,
  toolTrace: AgentToolTraceEntry[],
): AgentChartBlock[] | undefined {
  if (!charts || charts.length === 0) return charts;

  const salesTraceEntries = toolTrace.filter(isSalesToolTraceEntry);
  const traceEntry = salesTraceEntries.at(-1);

  return charts.map((chart) => {
    if (
      chart.type !== "line_chart" &&
      chart.type !== "bar_chart" &&
      chart.type !== "pie_chart"
    ) {
      return chart;
    }

    const query = buildQueryFromTrace(chart, traceEntry);
    if (!query) return chart;
    return attachTimeControls(chart, query);
  });
}

async function fetchSalesDataForQuery(
  query: SalesChartRefreshQuery,
  override?: { preset?: ChartRangePreset; timeQuery?: string },
) {
  const args: GetSalesDataArgs = {
    category: query.category,
    country: query.country,
    sku: query.sku,
    grain: query.grain ?? "auto",
  };

  if (override?.preset) {
    args.time_query = presetToTimeQuery(override.preset);
    args.grain = "auto";
  } else if (override?.timeQuery) {
    args.time_query = override.timeQuery;
    args.grain = "auto";
  } else if (query.startDate && query.endDate) {
    args.start_date = query.startDate;
    args.end_date = query.endDate;
  } else if (query.timeQuery) {
    args.time_query = query.timeQuery;
  } else {
    args.time_query = "past 30 days";
  }

  return executeGetSalesData(args);
}

function buildLineChart(query: SalesChartRefreshQuery, salesData: Awaited<ReturnType<typeof executeGetSalesData>>): LineChartBlock {
  const grainLabel =
    salesData.grain === "month"
      ? "Monthly"
      : salesData.grain === "week"
        ? "Weekly"
        : "Daily";
  const title = query.includeRevenueSeries
    ? `${grainLabel} Sales Trend (Units Sold and Revenue)`
    : `${grainLabel} Total Sales (Units Sold)`;
  const xAxisLabel =
    salesData.grain === "month"
      ? "Month"
      : salesData.grain === "week"
        ? "Week Starting"
        : "Date";
  const unitsSeries = {
    name: "Units Sold",
    dataPoints: salesData.timeSeries.map((point) => ({
      x: point.periodStart,
      y: point.unitsSold,
    })),
  };
  const series = query.includeRevenueSeries
    ? [
        {
          name: "Revenue ($)",
          dataPoints: salesData.timeSeries.map((point) => ({
            x: point.periodStart,
            y: point.revenue,
          })),
        },
        unitsSeries,
      ]
    : [unitsSeries];

  return {
    type: "line_chart",
    title,
    series,
    xAxisLabel,
    yAxisLabel: query.yAxisLabel ?? (query.includeRevenueSeries ? "Units / Revenue" : "Units Sold"),
    enableBrush: false,
  };
}

function buildBarChart(query: SalesChartRefreshQuery, salesData: Awaited<ReturnType<typeof executeGetSalesData>>): BarChartBlock {
  const useRevenue = query.chartKind === "revenue_by_category";
  return {
    type: "bar_chart",
    title: query.title,
    bars: salesData.categoryBreakdown.map((entry) => ({
      label: entry.category,
      value: useRevenue ? entry.revenue : entry.unitsSold,
      category: entry.category,
    })),
    xAxisLabel: query.xAxisLabel ?? "Category",
    yAxisLabel: query.yAxisLabel ?? (useRevenue ? "Revenue" : "Units Sold"),
    valueLabel: query.valueLabel ?? (useRevenue ? "revenue" : "units sold"),
  };
}

function buildPieChart(query: SalesChartRefreshQuery, salesData: Awaited<ReturnType<typeof executeGetSalesData>>): PieChartBlock {
  const useRevenue = query.chartKind === "revenue_by_category";
  return {
    type: "pie_chart",
    title: query.title,
    segments: salesData.categoryBreakdown.map((entry) => ({
      label: entry.category,
      value: useRevenue ? entry.revenue : entry.unitsSold,
      category: entry.category,
    })),
    valueLabel: query.valueLabel ?? (useRevenue ? "revenue" : "units sold"),
  };
}

export async function refreshSalesChart(
  query: SalesChartRefreshQuery,
  override: { preset?: ChartRangePreset; timeQuery?: string },
): Promise<AgentChartBlock> {
  const nextTimeQuery = override.preset
    ? presetToTimeQuery(override.preset)
    : override.timeQuery;
  const salesData = await fetchSalesDataForQuery(query, override);
  const updatedQuery: SalesChartRefreshQuery = {
    ...query,
    timeQuery: nextTimeQuery ?? query.timeQuery,
    startDate: undefined,
    endDate: undefined,
    grain: salesData.grain,
  };

  const chart =
    query.chartKind === "sales_trend"
      ? buildLineChart(updatedQuery, salesData)
      : query.chartKind === "sales_by_category"
        ? buildBarChart(updatedQuery, salesData)
        : buildPieChart(updatedQuery, salesData);

  return attachTimeControls(chart, {
    ...updatedQuery,
    timeQuery: nextTimeQuery ?? updatedQuery.timeQuery,
    originalTimeQuery: query.originalTimeQuery,
    originalLabel: query.originalLabel,
  });
}

export async function describeChartTimeWindow(
  query: SalesChartRefreshQuery,
  preset?: ChartRangePreset,
) {
  const referenceDate = await resolveAnalysisReferenceDate();
  if (preset) {
    return {
      label: presetToLabel(preset),
      preset,
      resolved: resolveTimeWindowFromPrompt(presetToTimeQuery(preset), referenceDate),
    };
  }

  if (query.startDate && query.endDate) {
    return {
      label: `${query.startDate} to ${query.endDate}`,
      preset: undefined,
      resolved: resolveExplicitTimeWindow(query.startDate, query.endDate, referenceDate, query.grain),
    };
  }

  const timeQuery = query.timeQuery ?? "past 30 days";
  return {
    label: humanizeTimeLabel(timeQuery),
    preset: inferPresetFromTimeQuery(timeQuery),
    resolved: resolveTimeWindowFromPrompt(timeQuery, referenceDate),
  };
}
