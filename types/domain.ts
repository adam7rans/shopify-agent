export type FulfillmentRegion =
  | "Europe"
  | "Middle East"
  | "United States"
  | "China / Asia";

export interface ProductVariant {
  id: string;
  productId: string;
  title: string;
  sku: string;
  price: number;
  cost: number;
  margin: number;
  inventoryQuantity: number;
  fulfillmentRegion: FulfillmentRegion;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  category: string;
  countryOfOrigin: string;
  vendor: string;
  distributor: string;
  flavorProfile: string[];
  tags: string[];
  price: number;
  cost: number;
  margin: number;
  inventoryQuantity: number;
  fulfillmentRegion: FulfillmentRegion;
  variants: ProductVariant[];
  createdAt: string;
  salesHistoryDays: number;
}

export interface InventoryLevel {
  id: string;
  productId: string;
  variantId: string;
  sku: string;
  locationId: string;
  locationName: string;
  region: FulfillmentRegion;
  available: number;
  committed: number;
  incoming: number;
  onHand: number;
  updatedAt: string;
}

export interface OrderLineItem {
  id: string;
  productId: string;
  variantId: string;
  sku: string;
  title: string;
  vendor: string;
  category: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  lineRevenue: number;
  lineMargin: number;
}

export interface Order {
  id: string;
  name: string;
  createdAt: string;
  displayFulfillmentStatus: "FULFILLED" | "IN_PROGRESS" | "ON_HOLD" | "DELAYED";
  currencyCode: "USD";
  totalPrice: number;
  subtotalPrice: number;
  region: FulfillmentRegion;
  customerId: string;
  lineItems: OrderLineItem[];
}

export interface DailySalesMetric {
  id: string;
  date: string;
  sku: string;
  productTitle: string;
  category: string;
  region: FulfillmentRegion;
  unitsSold: number;
  revenue: number;
  grossMargin: number;
}

export interface Warehouse {
  id: string;
  label: string;
  provider: string;
  country: string;
  region: FulfillmentRegion;
}

export interface Supplier {
  id: string;
  name: string;
  country: string;
  distributor: string;
  leadTimeDays: number;
  specialties: string[];
}

export interface DistributorAvailability {
  supplierId: string;
  supplierName: string;
  sku: string;
  productTitle: string;
  availableCases: number;
  unitsPerCase: number;
  minimumOrderCases: number;
  unitCost: number;
  estimatedLeadTimeDays: number;
  nextRestockDate: string;
}

export interface FulfillmentCenter {
  id: string;
  label: string;
  provider: string;
  country: string;
  region: FulfillmentRegion;
}

export interface WarehouseHealthSnapshot {
  centerId: string;
  label: string;
  region: FulfillmentRegion;
  provider: string;
  availableInventory: number;
  committedInventory: number;
  delayedShipments: number;
  damagedUnits: number;
  stuckFulfillments: number;
  averageFulfillmentHours: number;
  severity: "low" | "medium" | "high";
  updatedAt: string;
}

export interface FulfillmentIssueEvent {
  id: string;
  centerId: string;
  label: string;
  region: FulfillmentRegion;
  issueType: "delayed_shipment" | "damaged_inventory" | "stuck_fulfillment";
  severity: "medium" | "high";
  description: string;
  impactedOrders: number;
  sku?: string;
  status: "open" | "watching";
  createdAt: string;
}
