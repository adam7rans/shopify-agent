export interface AgentToolTraceEntry {
  toolName: string;
  input: Record<string, string | number>;
  outputSummary: string;
}

type TimeGrain = "day" | "week" | "month";

export interface AgentAnswerBlock {
  title: string;
  body: string;
  badge?: string;
}

export interface InsightCardBlock {
  type: "insight";
  title: string;
  confidence: string;
  metric: string;
  explanation: string;
  recommendedAction: string;
}

export interface InventoryRiskCardBlock {
  type: "inventory_risk";
  title: string;
  sku: string;
  availableInventory: number;
  dailySalesVelocity: number;
  daysUntilStockout: number;
  leadTimeDays: number;
  recommendedCases: number;
  severity: "high" | "medium";
}

export interface InventoryHighlightCardBlock {
  type: "inventory_highlight";
  title: string;
  sku: string;
  availableInventory: number;
  onHandInventory: number;
  locationCount: number;
  regionsLabel: string;
  status: "low" | "healthy";
  note: string;
}

export interface ReorderDraftCardBlock {
  type: "reorder_draft";
  title: string;
  supplierName: string;
  sku: string;
  recommendedCases: number;
  recommendedUnits: number;
  estimatedCost: number;
  leadTimeDays: number;
  daysUntilStockout: number;
  rationale: string;
  nextRestockDate: string;
}

export interface WarehouseRegionCardBlock {
  type: "warehouse_region";
  title: string;
  region: string;
  centerLabel: string;
  availableInventory: number;
  committedInventory: number;
  delayedShipments: number;
  averageFulfillmentHours: number;
  severity: "low" | "medium" | "high";
}

export interface TextCardBlock {
  type: "text";
  content: string;
}

export interface LiquidPreviewProduct {
  title: string;
  price: string;
  image: string;
  handle: string;
  description?: string;
}

export interface CodeCardBlock {
  type: "code";
  language: string;
  content: string;
  filename?: string;
  previewProducts?: LiquidPreviewProduct[];
  collectionTitle?: string;
}

export interface PieChartSegment {
  label: string;
  value: number;
  category?: string;
}

export type ChartRangePreset = "7d" | "30d" | "90d" | "6m" | "12m";

export interface SalesChartRefreshQuery {
  source: "sales_data";
  chartKind: "sales_trend" | "sales_by_category" | "revenue_by_category";
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  valueLabel?: string;
  includeRevenueSeries?: boolean;
  category?: string;
  country?: string;
  sku?: string;
  timeQuery?: string;
  originalTimeQuery?: string;
  originalLabel?: string;
  startDate?: string;
  endDate?: string;
  grain?: "auto" | TimeGrain;
}

export interface ChartTimeCustomOption {
  label: string;
  timeQuery: string;
}

export interface ChartTimeControls {
  kind: "sales";
  currentLabel: string;
  currentPreset?: ChartRangePreset;
  presets: ChartRangePreset[];
  query: SalesChartRefreshQuery;
  customOption?: ChartTimeCustomOption;
}

export interface PieChartBlock {
  type: "pie_chart";
  title: string;
  segments: PieChartSegment[];
  valueLabel?: string;
  timeControls?: ChartTimeControls;
}

export interface BarChartBar {
  label: string;
  value: number;
  category?: string;
}

export interface BarChartBlock {
  type: "bar_chart";
  title: string;
  bars: BarChartBar[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  valueLabel?: string;
  timeControls?: ChartTimeControls;
}

export interface LineChartDataPoint {
  x: string;
  y: number;
}

export interface LineChartSeries {
  name: string;
  dataPoints: LineChartDataPoint[];
}

export interface LineChartBlock {
  type: "line_chart";
  title: string;
  series: LineChartSeries[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  enableBrush?: boolean;
  timeControls?: ChartTimeControls;
}

export type AgentChartBlock = PieChartBlock | BarChartBlock | LineChartBlock;

export type AgentCardBlock =
  | InsightCardBlock
  | InventoryRiskCardBlock
  | InventoryHighlightCardBlock
  | ReorderDraftCardBlock
  | WarehouseRegionCardBlock
  | TextCardBlock
  | CodeCardBlock;

export interface ProductPerformanceRow {
  product: string;
  sku: string;
  category: string;
  unitsSold: number;
  revenue: number;
  margin: number;
}

export interface StockRiskRow {
  product: string;
  sku: string;
  availableInventory: number;
  recentUnitsSold: number;
  dailySalesVelocity: number;
  daysUntilStockout: number;
  leadTimeDays: number;
  recommendedCases: number;
}

export interface InventoryTableRow {
  product: string;
  sku: string;
  category: string;
  regions: string;
  locations: number;
  availableInventory: number;
  committedInventory: number;
  incomingInventory: number;
  onHandInventory: number;
}

export interface ProductPerformanceTableBlock {
  type: "product_table";
  title: string;
  dateWindowLabel?: string;
  ordersIncluded?: number;
  sourceLabel?: string;
  rows: ProductPerformanceRow[];
  dataFrom?: string;
}

export interface StockRiskTableBlock {
  type: "risk_table";
  title: string;
  rows: StockRiskRow[];
}

export interface InventoryTableBlock {
  type: "inventory_table";
  title: string;
  sourceLabel?: string;
  rows: InventoryTableRow[];
  visibleColumns?: (keyof InventoryTableRow)[];
  dataFrom?: string;
}

export interface FulfillmentIssueRow {
  warehouse: string;
  region: string;
  issueType: string;
  severity: string;
  impactedOrders: number;
  status: string;
  description: string;
}

export interface FulfillmentIssueTableBlock {
  type: "issue_table";
  title: string;
  rows: FulfillmentIssueRow[];
}

export type AgentTableBlock =
  | ProductPerformanceTableBlock
  | StockRiskTableBlock
  | InventoryTableBlock
  | FulfillmentIssueTableBlock;

export interface DiagnosticsCount {
  label: string;
  value: number;
}

export interface DiagnosticsSummaryBlock {
  title: string;
  sources: string[];
  queryWindowLabel?: string;
  counts: DiagnosticsCount[];
  notes?: string[];
}

export interface AgentUiResponse {
  kind:
    | "best_sellers"
    | "sour_reorder"
    | "warehouse_health"
    | "inventory_overview"
    | "general"
    | "unsupported";
  answer: AgentAnswerBlock;
  primaryCards: AgentCardBlock[];
  secondaryCards: AgentCardBlock[];
  tables: AgentTableBlock[];
  charts?: AgentChartBlock[];
  toolTrace: AgentToolTraceEntry[];
  diagnostics?: DiagnosticsSummaryBlock;
  suggestedPrompts?: string[];
}
