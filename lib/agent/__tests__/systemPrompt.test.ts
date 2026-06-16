import { describe, it, expect } from "vitest";
import { getSystemPrompt } from "../systemPrompt";

describe("getSystemPrompt", () => {
  const prompt = getSystemPrompt();

  it("returns a non-empty string", () => {
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(500);
  });

  it("identifies the agent as Kandwii", () => {
    expect(prompt).toContain("Kandwii");
  });

  it("describes the AgentUiResponse JSON schema", () => {
    expect(prompt).toContain("AgentUiResponse");
    expect(prompt).toContain('"kind"');
    expect(prompt).toContain('"answer"');
    expect(prompt).toContain('"primaryCards"');
    expect(prompt).toContain('"tables"');
  });

  it("documents all card types", () => {
    for (const cardType of ["insight", "inventory_highlight", "inventory_risk", "reorder_draft", "warehouse_region", "text", "code"]) {
      expect(prompt).toContain(`"type": "${cardType}"`);
    }
  });

  it("documents all table types", () => {
    for (const tableType of ["product_table", "risk_table", "inventory_table", "issue_table"]) {
      expect(prompt).toContain(`"type": "${tableType}"`);
    }
  });

  it("includes product image path convention", () => {
    expect(prompt).toContain("/products/{handle}.png");
  });

  it("includes Liquid generation guidance", () => {
    expect(prompt).toContain("Shopify Liquid");
    expect(prompt).toContain("liquid");
  });

  it("includes tool-calling efficiency guidance", () => {
    expect(prompt).toContain("Tool-calling efficiency");
    expect(prompt).toContain("broad queries");
  });

  it("instructs the LLM to call tools before responding", () => {
    expect(prompt).toContain("Always call at least one tool before responding");
  });
});
