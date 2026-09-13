import { describe, expect, it } from "vitest";
import { safeTokenEqual } from "./security";

describe("API security", () => {
  it("compares configured tokens without loose equality", () => {
    expect(safeTokenEqual("judge-secret", "judge-secret")).toBe(true);
    expect(safeTokenEqual("judge-secret-x", "judge-secret")).toBe(false);
    expect(safeTokenEqual("", "judge-secret")).toBe(false);
  });
});
