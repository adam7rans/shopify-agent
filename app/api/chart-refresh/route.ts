import { NextResponse } from "next/server";
import { hasAgentConfig } from "@/lib/agent/config";
import { refreshSalesChart } from "@/lib/charts/salesChartRefresh";
import type { AgentChartBlock, ChartRangePreset, SalesChartRefreshQuery } from "@/types/agentUi";

function isValidPreset(value: unknown): value is ChartRangePreset {
  return value === "7d" || value === "30d" || value === "90d" || value === "6m" || value === "12m";
}

function isSalesChartQuery(value: unknown): value is SalesChartRefreshQuery {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.source === "sales_data" &&
    typeof candidate.chartKind === "string" &&
    typeof candidate.title === "string"
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    preset?: unknown;
    timeQuery?: unknown;
    query?: unknown;
  };

  if (!hasAgentConfig()) {
    return NextResponse.json(
      { error: "Kandwii needs OPENAI_API_KEY configured before chart refresh can run." },
      { status: 503 },
    );
  }

  const hasPreset = body.preset !== undefined;
  const hasTimeQuery = typeof body.timeQuery === "string" && body.timeQuery.trim().length > 0;

  if (
    !isSalesChartQuery(body.query) ||
    (hasPreset && !isValidPreset(body.preset)) ||
    (!hasPreset && !hasTimeQuery)
  ) {
    return NextResponse.json(
      { error: "Invalid chart refresh request." },
      { status: 400 },
    );
  }

  try {
    const chart = await refreshSalesChart(body.query, {
      preset: isValidPreset(body.preset) ? body.preset : undefined,
      timeQuery: hasTimeQuery ? String(body.timeQuery).trim() : undefined,
    });
    const payload: { chart: AgentChartBlock } = { chart };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Chart refresh failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Chart refresh failed before the updated data could be returned.",
      },
      { status: 500 },
    );
  }
}
