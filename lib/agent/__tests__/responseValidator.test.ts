import { describe, it, expect } from "vitest";
import { validateAndNormalizeResponse } from "../responseValidator";

describe("validateAndNormalizeResponse", () => {
  it("returns null for non-object input", () => {
    expect(validateAndNormalizeResponse("string")).toBeNull();
    expect(validateAndNormalizeResponse(42)).toBeNull();
    expect(validateAndNormalizeResponse(null)).toBeNull();
    expect(validateAndNormalizeResponse([])).toBeNull();
  });

  it("returns null when answer block is missing", () => {
    expect(validateAndNormalizeResponse({ kind: "general" })).toBeNull();
  });

  it("returns null when answer.title or answer.body is missing", () => {
    expect(
      validateAndNormalizeResponse({
        kind: "general",
        answer: { title: "hi" },
      }),
    ).toBeNull();
    expect(
      validateAndNormalizeResponse({
        kind: "general",
        answer: { body: "hi" },
      }),
    ).toBeNull();
  });

  it("accepts a minimal valid response", () => {
    const result = validateAndNormalizeResponse({
      kind: "general",
      answer: { title: "Test", body: "Test body" },
    });
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("general");
    expect(result!.answer.title).toBe("Test");
    expect(result!.primaryCards).toEqual([]);
    expect(result!.secondaryCards).toEqual([]);
    expect(result!.tables).toEqual([]);
  });

  it("defaults unknown kind to 'general'", () => {
    const result = validateAndNormalizeResponse({
      kind: "nonexistent_kind",
      answer: { title: "T", body: "B" },
    });
    expect(result!.kind).toBe("general");
  });

  it("preserves valid kind values", () => {
    for (const kind of ["best_sellers", "sour_reorder", "warehouse_health", "inventory_overview", "general", "unsupported"]) {
      const result = validateAndNormalizeResponse({
        kind,
        answer: { title: "T", body: "B" },
      });
      expect(result!.kind).toBe(kind);
    }
  });

  it("filters out invalid cards", () => {
    const result = validateAndNormalizeResponse({
      kind: "general",
      answer: { title: "T", body: "B" },
      primaryCards: [
        { type: "insight", title: "Valid", confidence: "High", metric: "10", explanation: "E", recommendedAction: "R" },
        { type: "invalid_type", title: "Bad" },
        "not a card",
      ],
    });
    expect(result!.primaryCards).toHaveLength(1);
    expect(result!.primaryCards[0].type).toBe("insight");
  });

  it("accepts all valid card types", () => {
    const cards = [
      { type: "insight", title: "I", confidence: "High", metric: "1", explanation: "E", recommendedAction: "R" },
      { type: "text", content: "markdown text" },
      { type: "code", language: "liquid", content: "<div>hi</div>" },
      { type: "inventory_highlight", title: "IH", sku: "S", availableInventory: 10, onHandInventory: 12, locationCount: 1, regionsLabel: "US", status: "low", note: "N" },
      { type: "inventory_risk", title: "IR", sku: "S", availableInventory: 5, dailySalesVelocity: 2, daysUntilStockout: 2.5, leadTimeDays: 7, recommendedCases: 3, severity: "high" },
      { type: "reorder_draft", title: "RD", supplierName: "S", sku: "SK", recommendedCases: 3, recommendedUnits: 72, estimatedCost: 100, leadTimeDays: 7, daysUntilStockout: 5, rationale: "R", nextRestockDate: "2026-07-01" },
      { type: "warehouse_region", title: "WR", region: "EU", centerLabel: "EU-WAW", availableInventory: 100, committedInventory: 10, delayedShipments: 2, averageFulfillmentHours: 24, severity: "medium" },
    ];
    const result = validateAndNormalizeResponse({
      kind: "general",
      answer: { title: "T", body: "B" },
      primaryCards: cards,
    });
    expect(result!.primaryCards).toHaveLength(7);
  });

  it("filters out invalid tables", () => {
    const result = validateAndNormalizeResponse({
      kind: "general",
      answer: { title: "T", body: "B" },
      tables: [
        { type: "product_table", title: "Valid", rows: [] },
        { type: "bad_table", title: "Bad", rows: [] },
        { type: "product_table", title: "No rows" },
        "not a table",
      ],
    });
    expect(result!.tables).toHaveLength(1);
    expect(result!.tables[0].title).toBe("Valid");
  });

  it("accepts all valid table types", () => {
    const tables = [
      { type: "product_table", title: "PT", rows: [{ product: "P", sku: "S", category: "C", unitsSold: 10, revenue: 50, margin: 25 }] },
      { type: "risk_table", title: "RT", rows: [] },
      { type: "inventory_table", title: "IT", rows: [] },
      { type: "issue_table", title: "FT", rows: [] },
    ];
    const result = validateAndNormalizeResponse({
      kind: "general",
      answer: { title: "T", body: "B" },
      tables,
    });
    expect(result!.tables).toHaveLength(4);
  });

  it("preserves suggestedPrompts when valid", () => {
    const result = validateAndNormalizeResponse({
      kind: "general",
      answer: { title: "T", body: "B" },
      suggestedPrompts: ["What sells best?", "Check inventory", 42],
    });
    expect(result!.suggestedPrompts).toEqual(["What sells best?", "Check inventory"]);
  });

  it("preserves answer.badge when present", () => {
    const result = validateAndNormalizeResponse({
      kind: "general",
      answer: { title: "T", body: "B", badge: "Mock mode" },
    });
    expect(result!.answer.badge).toBe("Mock mode");
  });
});
