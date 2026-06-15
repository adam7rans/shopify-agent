export interface AgentToolTraceEntry {
  toolName: string;
  input: Record<string, string | number>;
  outputSummary: string;
}

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

export type AgentCardBlock =
  | InsightCardBlock
  | InventoryRiskCardBlock
  | ReorderDraftCardBlock
  | WarehouseRegionCardBlock;

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

export interface ProductPerformanceTableBlock {
  type: "product_table";
  title: string;
  dateWindowLabel?: string;
  ordersIncluded?: number;
  sourceLabel?: string;
  rows: ProductPerformanceRow[];
}

export interface StockRiskTableBlock {
  type: "risk_table";
  title: string;
  rows: StockRiskRow[];
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
  | FulfillmentIssueTableBlock;

export interface AgentUiResponse {
  kind: "best_sellers" | "sour_reorder" | "warehouse_health" | "unsupported";
  answer: AgentAnswerBlock;
  primaryCards: AgentCardBlock[];
  secondaryCards: AgentCardBlock[];
  tables: AgentTableBlock[];
  toolTrace: AgentToolTraceEntry[];
  suggestedPrompts?: string[];
}
