import { describe, it, expect } from "vitest";
import { agentTools } from "../toolDefinitions";

describe("agentTools", () => {
  it("exports 8 tool definitions", () => {
    expect(agentTools).toHaveLength(8);
  });

  it("all tools have type 'function'", () => {
    for (const tool of agentTools) {
      expect(tool.type).toBe("function");
    }
  });

  const expectedTools = [
    "search_products",
    "get_inventory",
    "get_sales_data",
    "check_reorder_risk",
    "get_warehouse_health",
    "get_distributor_availability",
    "list_documents",
    "parse_document",
  ];

  it("contains all expected tool names", () => {
    const names = agentTools.map((t) => t.function.name);
    for (const expected of expectedTools) {
      expect(names).toContain(expected);
    }
  });

  it("every tool has a description", () => {
    for (const tool of agentTools) {
      expect(tool.function.description).toBeTruthy();
      expect(tool.function.description!.length).toBeGreaterThan(20);
    }
  });

  it("every tool has a parameters object schema", () => {
    for (const tool of agentTools) {
      expect(tool.function.parameters).toBeDefined();
      expect(tool.function.parameters!.type).toBe("object");
    }
  });

  it("parse_document requires filename", () => {
    const parseTool = agentTools.find((t) => t.function.name === "parse_document");
    const params = parseTool!.function.parameters as Record<string, unknown>;
    expect(params.required).toContain("filename");
  });

  it("list_documents has no required parameters", () => {
    const listTool = agentTools.find((t) => t.function.name === "list_documents");
    const params = listTool!.function.parameters as Record<string, unknown>;
    expect(params.required).toBeUndefined();
  });

  it("search_products supports category, country, tags, sort_by, limit", () => {
    const tool = agentTools.find((t) => t.function.name === "search_products");
    const props = (tool!.function.parameters as Record<string, unknown>).properties as Record<string, unknown>;
    expect(props).toHaveProperty("category");
    expect(props).toHaveProperty("country");
    expect(props).toHaveProperty("tags");
    expect(props).toHaveProperty("sort_by");
    expect(props).toHaveProperty("limit");
  });

  it("get_sales_data has valid date_range enum", () => {
    const tool = agentTools.find((t) => t.function.name === "get_sales_data");
    const props = (tool!.function.parameters as Record<string, unknown>).properties as Record<string, { enum?: string[] }>;
    expect(props.date_range.enum).toEqual(["7d", "30d", "60d", "90d", "6mo"]);
  });
});
