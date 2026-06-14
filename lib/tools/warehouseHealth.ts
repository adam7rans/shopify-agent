import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  FulfillmentCenter,
  FulfillmentIssueEvent,
  WarehouseHealthSnapshot,
} from "@/types/domain";
import type { ToolTraceEntry } from "@/lib/tools/bestSellers";

function normalizeWarehousePrompt(prompt: string) {
  return prompt
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isWarehouseHealthPrompt(prompt: string) {
  const normalized = normalizeWarehousePrompt(prompt);

  return new Set([
    "show me warehouse issues globally",
    "show global fulfillment issues",
    "which warehouse has problems",
    "are there any fulfillment delays",
    "show me warehouse health",
    "where is fulfillment getting stuck",
  ]).has(normalized);
}

async function readGeneratedFile<T>(fileName: string): Promise<T> {
  const filePath = path.join(process.cwd(), "data", "generated", fileName);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export async function get_mock_fulfillment_centers() {
  return readGeneratedFile<FulfillmentCenter[]>("fulfillmentCenters.json");
}

export async function get_mock_warehouse_inventory() {
  return readGeneratedFile<WarehouseHealthSnapshot[]>("warehouseHealthSnapshots.json");
}

export async function get_mock_fulfillment_issues() {
  return readGeneratedFile<FulfillmentIssueEvent[]>("fulfillmentIssues.json");
}

export function summarize_global_warehouse_health(
  centers: FulfillmentCenter[],
  snapshots: WarehouseHealthSnapshot[],
  issues: FulfillmentIssueEvent[],
) {
  const hottestCenter =
    snapshots
      .slice()
      .sort((a, b) => {
        const severityScore = { high: 3, medium: 2, low: 1 };
        return (
          severityScore[b.severity] - severityScore[a.severity] ||
          b.delayedShipments - a.delayedShipments ||
          b.stuckFulfillments - a.stuckFulfillments
        );
      })[0] ?? null;

  const totalDelayedShipments = snapshots.reduce(
    (sum, snapshot) => sum + snapshot.delayedShipments,
    0,
  );
  const totalDamagedUnits = snapshots.reduce((sum, snapshot) => sum + snapshot.damagedUnits, 0);
  const totalStuckFulfillments = snapshots.reduce(
    (sum, snapshot) => sum + snapshot.stuckFulfillments,
    0,
  );
  const averageFulfillmentHours = Number(
    (
      snapshots.reduce((sum, snapshot) => sum + snapshot.averageFulfillmentHours, 0) /
      snapshots.length
    ).toFixed(1),
  );

  const regionalCards = centers.map((center) => {
    const snapshot = snapshots.find((entry) => entry.centerId === center.id);
    return snapshot
      ? {
          type: "warehouse_region" as const,
          title: `${center.label} warehouse health`,
          region: center.region,
          centerLabel: center.label,
          availableInventory: snapshot.availableInventory,
          committedInventory: snapshot.committedInventory,
          delayedShipments: snapshot.delayedShipments,
          averageFulfillmentHours: snapshot.averageFulfillmentHours,
          severity: snapshot.severity,
        }
      : null;
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const delayedIssuesTable = issues
    .slice()
    .sort((a, b) => {
      const severityScore = { high: 2, medium: 1 };
      return severityScore[b.severity] - severityScore[a.severity] || b.impactedOrders - a.impactedOrders;
    })
    .map((issue) => ({
      warehouse: issue.label,
      region: issue.region,
      issueType: issue.issueType.replace(/_/g, " "),
      severity: issue.severity,
      impactedOrders: issue.impactedOrders,
      status: issue.status,
      description: issue.description,
    }));

  const toolTrace: ToolTraceEntry[] = [
    {
      toolName: "get_mock_fulfillment_centers",
      input: { scope: "global" },
      outputSummary: `Loaded ${centers.length} fulfillment centers across all active regions.`,
    },
    {
      toolName: "get_mock_warehouse_inventory",
      input: { scope: "regional snapshots" },
      outputSummary: `Loaded ${snapshots.length} warehouse health snapshots with inventory, delays, and fulfillment times.`,
    },
    {
      toolName: "get_mock_fulfillment_issues",
      input: { status: "open and watching" },
      outputSummary: `Loaded ${issues.length} active fulfillment issues including delays, damage, and stuck orders.`,
    },
    {
      toolName: "summarize_global_warehouse_health",
      input: { centers: centers.length, issues: issues.length },
      outputSummary: hottestCenter
        ? `${hottestCenter.label} is the highest-risk node, with ${totalDelayedShipments} delayed shipments across the network.`
        : "Summarized warehouse health across the network.",
    },
  ];

  return {
    hottestCenter,
    totalDelayedShipments,
    totalDamagedUnits,
    totalStuckFulfillments,
    averageFulfillmentHours,
    regionalCards,
    delayedIssuesTable,
    toolTrace,
  };
}

export async function runWarehouseHealthFlow() {
  const centers = await get_mock_fulfillment_centers();
  const snapshots = await get_mock_warehouse_inventory();
  const issues = await get_mock_fulfillment_issues();

  return summarize_global_warehouse_health(centers, snapshots, issues);
}
