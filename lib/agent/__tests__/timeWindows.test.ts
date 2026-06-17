import { describe, expect, it } from "vitest";
import { resolveTimeWindowFromPrompt } from "../timeWindows";

const referenceDate = new Date("2026-06-17T12:00:00.000Z");

describe("resolveTimeWindowFromPrompt", () => {
  it("resolves this week", () => {
    const resolved = resolveTimeWindowFromPrompt("Which candy is performing best this week?", referenceDate);
    expect(resolved.startDate.slice(0, 10)).toBe("2026-06-15");
    expect(resolved.endDate.slice(0, 10)).toBe("2026-06-17");
    expect(resolved.grain).toBe("day");
  });

  it("resolves last week", () => {
    const resolved = resolveTimeWindowFromPrompt("Which candy is performing best last week?", referenceDate);
    expect(resolved.startDate.slice(0, 10)).toBe("2026-06-08");
    expect(resolved.endDate.slice(0, 10)).toBe("2026-06-14");
  });

  it("resolves two weeks ago", () => {
    const resolved = resolveTimeWindowFromPrompt("Which candy is performing best 2 weeks ago?", referenceDate);
    expect(resolved.startDate.slice(0, 10)).toBe("2026-06-01");
    expect(resolved.endDate.slice(0, 10)).toBe("2026-06-07");
  });

  it("resolves past 3 months", () => {
    const resolved = resolveTimeWindowFromPrompt("show me a graph of past 3 months of total sales", referenceDate);
    expect(resolved.startDate.slice(0, 10)).toBe("2026-04-01");
    expect(resolved.grain).toBe("week");
  });

  it("resolves past 12 months", () => {
    const resolved = resolveTimeWindowFromPrompt("show me a graph of past 12 months of total sales", referenceDate);
    expect(resolved.startDate.slice(0, 10)).toBe("2025-07-01");
    expect(resolved.grain).toBe("month");
  });
});
