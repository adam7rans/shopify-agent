import { describe, expect, it } from "vitest";
import { enhanceChartsWithTimeControls } from "@/lib/charts/salesChartRefresh";
import type { AgentChartBlock, AgentToolTraceEntry } from "@/types/agentUi";

describe("enhanceChartsWithTimeControls", () => {
  it("defaults vague sales charts to past 30 days", () => {
    const charts: AgentChartBlock[] = [
      {
        type: "bar_chart",
        title: "Units Sold by Product Category",
        bars: [{ label: "Sour candy", value: 120 }],
        xAxisLabel: "Category",
        yAxisLabel: "Units Sold",
        valueLabel: "units",
      },
    ];
    const toolTrace: AgentToolTraceEntry[] = [
      {
        toolName: "get_sales_data",
        input: { limit: 50 },
        outputSummary: "Fetched sales data.",
      },
    ];

    const enhanced = enhanceChartsWithTimeControls(charts, toolTrace);
    expect(enhanced?.[0].timeControls?.currentLabel).toBe("Past 30 days");
    expect(enhanced?.[0].timeControls?.currentPreset).toBe("30d");
  });

  it("preserves explicit time queries from the sales tool", () => {
    const charts: AgentChartBlock[] = [
      {
        type: "line_chart",
        title: "Weekly Sales Trend",
        series: [
          {
            name: "Units Sold",
            dataPoints: [{ x: "2026-05-01T00:00:00.000Z", y: 42 }],
          },
        ],
        xAxisLabel: "Date",
        yAxisLabel: "Units Sold",
      },
    ];
    const toolTrace: AgentToolTraceEntry[] = [
      {
        toolName: "get_sales_data",
        input: { time_query: "past 6 weeks", category: "Japanese gummies" },
        outputSummary: "Fetched weekly sales trend.",
      },
    ];

    const enhanced = enhanceChartsWithTimeControls(charts, toolTrace);
    expect(enhanced?.[0].timeControls?.currentLabel).toBe("Past 6 weeks");
    expect(enhanced?.[0].timeControls?.query.category).toBe("Japanese gummies");
  });
});
