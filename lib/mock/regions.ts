import type { FulfillmentRegion, Warehouse } from "@/types/domain";

export const fulfillmentRegions: FulfillmentRegion[] = [
  "Europe",
  "Middle East",
  "United States",
  "China / Asia",
];

export const warehouses: Warehouse[] = [
  {
    id: "warehouse-eu-waw",
    label: "EU-WAW",
    provider: "Baltic Sweet Freight",
    country: "Poland",
    region: "Europe",
  },
  {
    id: "warehouse-me-dxb",
    label: "ME-DXB",
    provider: "Desert Parcel Hub",
    country: "United Arab Emirates",
    region: "Middle East",
  },
  {
    id: "warehouse-us-nj",
    label: "US-NJ",
    provider: "Garden State Fulfillment",
    country: "United States",
    region: "United States",
  },
  {
    id: "warehouse-cn-sz",
    label: "CN-SZ",
    provider: "Pearl River Crossborder",
    country: "China",
    region: "China / Asia",
  },
];
