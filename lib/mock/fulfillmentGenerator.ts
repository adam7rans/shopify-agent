import type {
  FulfillmentCenter,
  FulfillmentIssueEvent,
  Product,
  WarehouseHealthSnapshot,
} from "@/types/domain";

export function generateFulfillmentCenters(): FulfillmentCenter[] {
  return [
    {
      id: "fc-eu-waw",
      label: "EU-WAW",
      provider: "Baltic Sweet Freight",
      country: "Poland",
      region: "Europe",
    },
    {
      id: "fc-eu-ams",
      label: "EU-AMS",
      provider: "Lowlands Parcel Works",
      country: "Netherlands",
      region: "Europe",
    },
    {
      id: "fc-me-dxb",
      label: "ME-DXB",
      provider: "Desert Parcel Hub",
      country: "United Arab Emirates",
      region: "Middle East",
    },
    {
      id: "fc-us-nj",
      label: "US-NJ",
      provider: "Garden State Fulfillment",
      country: "United States",
      region: "United States",
    },
    {
      id: "fc-us-la",
      label: "US-LA",
      provider: "Pacific Treat Logistics",
      country: "United States",
      region: "United States",
    },
    {
      id: "fc-cn-sz",
      label: "CN-SZ",
      provider: "Pearl River Crossborder",
      country: "China",
      region: "China / Asia",
    },
  ];
}

export function generateWarehouseHealthSnapshots(
  products: Product[],
  centers: FulfillmentCenter[],
): WarehouseHealthSnapshot[] {
  const productCount = products.length;

  return centers.map((center, index) => {
    const baseAvailable = 580 + ((index + 2) * productCount * 7) % 480;
    const baseCommitted = 110 + ((index + 4) * 39) % 180;
    const delayedShipments = [4, 3, 9, 5, 6, 2][index];
    const damagedUnits = [8, 5, 16, 10, 11, 6][index];
    const stuckFulfillments = [3, 2, 7, 4, 5, 2][index];
    const averageFulfillmentHours = [26, 24, 43, 31, 35, 22][index];
    const severity =
      delayedShipments >= 8 || stuckFulfillments >= 6
        ? "high"
        : delayedShipments >= 5 || averageFulfillmentHours >= 30
          ? "medium"
          : "low";

    return {
      centerId: center.id,
      label: center.label,
      region: center.region,
      provider: center.provider,
      availableInventory: baseAvailable,
      committedInventory: baseCommitted,
      delayedShipments,
      damagedUnits,
      stuckFulfillments,
      averageFulfillmentHours,
      severity,
      updatedAt: "2026-06-14T00:00:00.000Z",
    };
  });
}

export function generateFulfillmentIssues(
  products: Product[],
  centers: FulfillmentCenter[],
): FulfillmentIssueEvent[] {
  const skuList = products.slice(0, 8).map((product) => product.variants[0].sku);

  return [
    {
      id: "issue-001",
      centerId: centers[2].id,
      label: centers[2].label,
      region: centers[2].region,
      issueType: "delayed_shipment",
      severity: "high",
      description: "Carrier backlog is pushing outbound candy parcels 2.3 days beyond SLA.",
      impactedOrders: 18,
      status: "open",
      createdAt: "2026-06-12T08:30:00.000Z",
    },
    {
      id: "issue-002",
      centerId: centers[4].id,
      label: centers[4].label,
      region: centers[4].region,
      issueType: "stuck_fulfillment",
      severity: "high",
      description: "Pick-pack queue is stalled on weekend volume and 14 orders remain unassigned.",
      impactedOrders: 14,
      status: "open",
      createdAt: "2026-06-13T10:15:00.000Z",
    },
    {
      id: "issue-003",
      centerId: centers[0].id,
      label: centers[0].label,
      region: centers[0].region,
      issueType: "damaged_inventory",
      severity: "medium",
      description: "Inbound pallet damage affected a small run of ramune and sour items.",
      impactedOrders: 6,
      sku: skuList[0],
      status: "watching",
      createdAt: "2026-06-11T06:20:00.000Z",
    },
    {
      id: "issue-004",
      centerId: centers[3].id,
      label: centers[3].label,
      region: centers[3].region,
      issueType: "delayed_shipment",
      severity: "medium",
      description: "Northeast weather disruptions are slowing handoff to final-mile carriers.",
      impactedOrders: 11,
      status: "watching",
      createdAt: "2026-06-12T14:45:00.000Z",
    },
    {
      id: "issue-005",
      centerId: centers[1].id,
      label: centers[1].label,
      region: centers[1].region,
      issueType: "stuck_fulfillment",
      severity: "medium",
      description: "A receiving mismatch paused replenishment for one export lane.",
      impactedOrders: 7,
      sku: skuList[3],
      status: "watching",
      createdAt: "2026-06-10T12:00:00.000Z",
    },
    {
      id: "issue-006",
      centerId: centers[5].id,
      label: centers[5].label,
      region: centers[5].region,
      issueType: "damaged_inventory",
      severity: "medium",
      description: "Humidity exposure damaged a limited number of seasonal gift boxes.",
      impactedOrders: 5,
      sku: skuList[5],
      status: "watching",
      createdAt: "2026-06-09T09:40:00.000Z",
    },
  ];
}
