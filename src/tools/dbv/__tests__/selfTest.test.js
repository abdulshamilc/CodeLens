// src/tools/dbv/__tests__/selfTest.test.js
import { describe, it, expect } from "vitest";
import { runSelfTest } from "../engine/selfTest";

describe("C4: Diagnostic Self-Test Suite", () => {
  it("runs all diagnostic self-tests and passes", () => {
    const report = runSelfTest();
    expect(report.passed).toBe(true);
    expect(report.failedCount).toBe(0);
    expect(report.passedCount).toBe(report.total);
    expect(report.results.length).toBeGreaterThanOrEqual(7);
  });
});
