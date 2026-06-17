import type { AgentUiResponse } from "@/types/agentUi";
import { enhanceChartsWithTimeControls } from "@/lib/charts/salesChartRefresh";

export function enhanceAgentResponse(agentResponse: AgentUiResponse): AgentUiResponse {
  return {
    ...agentResponse,
    charts: enhanceChartsWithTimeControls(agentResponse.charts, agentResponse.toolTrace),
  };
}
