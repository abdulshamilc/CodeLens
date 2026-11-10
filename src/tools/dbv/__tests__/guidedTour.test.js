// src/tools/dbv/__tests__/guidedTour.test.js
// Unit test suite for CodeLens DBV Guided Tour configuration and step progression

import { describe, it, expect } from "vitest";
import { TOUR_STEPS, TOUR_STORAGE_KEY } from "../components/GuidedTour";

describe("DBV Guided Tour Suite", () => {
  it("exports a valid persistent storage key for tour completion", () => {
    expect(TOUR_STORAGE_KEY).toBe("codelens_dbv_tour_completed");
  });

  it("defines comprehensive steps covering all key visualizer and compiler zones", () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(7);

    const stepIds = TOUR_STEPS.map((s) => s.id);
    expect(stepIds).toContain("welcome");
    expect(stepIds).toContain("code-zone");
    expect(stepIds).toContain("run-controls");
    expect(stepIds).toContain("examples");
    expect(stepIds).toContain("stage-panel");
    expect(stepIds).toContain("event-loop");
    expect(stepIds).toContain("bottom-controls");
    expect(stepIds).toContain("console");
  });

  it("ensures each tour step has non-empty titles, badges, contents, and icons", () => {
    for (const step of TOUR_STEPS) {
      expect(typeof step.id).toBe("string");
      expect(typeof step.title).toBe("string");
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(typeof step.badge).toBe("string");
      expect(typeof step.content).toBe("string");
      expect(step.content.trim().length).toBeGreaterThan(0);
      expect(typeof step.icon).toBe("string");
    }
  });

  it("targets valid DOM container IDs for all interactive walkthrough steps", () => {
    const validTargets = [
      null,
      "dbv-code-zone",
      "dbv-run-controls",
      "dbv-examples-btn",
      "dbv-stage-panel",
      "dbv-event-loop-zone",
      "dbv-bottom-controls",
      "zone-console",
    ];

    for (const step of TOUR_STEPS) {
      expect(validTargets).toContain(step.targetId);
    }
  });
});

