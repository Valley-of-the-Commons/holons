// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tab visibility: per-device tri-state prefs resolved against an optional
// per-holon code default. Covers the commons.hubs.network goal (default =
// Calendar + Shifts, any tab activatable per device) and guards today's
// behavior for holons with no default.

import { beforeEach, describe, expect, it } from "vitest";
import { get } from "svelte/store";
import {
  visibleTabs,
  holonDefaultTabs,
  resolveHolonDefaultTabs,
  tasksPref,
  calendarPref,
  libraryPref,
  rolesPref,
  checklistsPref,
  shiftsPref,
  statusPref,
  flowsPref,
  rawLibrary,
  rawRoles,
  rawChecklists,
  rawShifts,
} from "./stores";

const COMMONS_HUB = "-5459621960";
const ids = () => get(visibleTabs).map((t) => t.id);

/** Reset every input to its default: all prefs auto, no content, no default. */
beforeEach(() => {
  holonDefaultTabs.set(null);
  tasksPref.set("auto");
  calendarPref.set("auto");
  libraryPref.set("auto");
  rolesPref.set("auto");
  checklistsPref.set("auto");
  shiftsPref.set("auto");
  statusPref.set("auto");
  flowsPref.set("auto");
  rawLibrary.set([]);
  rawRoles.set([]);
  rawChecklists.set([]);
  rawShifts.set({ occurrences: [], rsvps: [] });
});

describe("resolveHolonDefaultTabs", () => {
  it("maps Commons Hub to Calendar + Shifts, others to null", () => {
    expect(resolveHolonDefaultTabs(COMMONS_HUB)).toEqual([
      "calendar",
      "shifts",
    ]);
    expect(resolveHolonDefaultTabs("999")).toBeNull();
    expect(resolveHolonDefaultTabs(null)).toBeNull();
  });
});

describe("no holon default → today's behavior is unchanged", () => {
  it("shows Tasks + Calendar and nothing optional when empty and untouched", () => {
    expect(ids()).toEqual(["tasks", "calendar"]);
  });

  it("still shows an optional tab that has content (content-driven auto)", () => {
    rawLibrary.set([{ id: "x" } as any]);
    expect(ids()).toContain("library");
  });

  it("keeps Status/Flows off by default (historical opt-in)", () => {
    expect(ids()).not.toContain("status");
    expect(ids()).not.toContain("flows");
  });
});

describe("Commons Hub default = Calendar + Shifts", () => {
  beforeEach(() => holonDefaultTabs.set(resolveHolonDefaultTabs(COMMONS_HUB)));

  it("a fresh visitor sees exactly Calendar + Shifts", () => {
    // Tasks is auto → not in default → hidden, even though it is normally
    // always-on; library/roles/lists/status/flows auto → not in default → off.
    expect(ids()).toEqual(["calendar", "shifts"]);
  });

  it("shifts shows from the default even with no occurrences yet", () => {
    rawShifts.set({ occurrences: [], rsvps: [] });
    expect(ids()).toContain("shifts");
  });

  it("a user can activate any other tab on their device", () => {
    tasksPref.set("on");
    expect(ids()).toEqual(["tasks", "calendar", "shifts"]);
    libraryPref.set("on");
    expect(ids()).toContain("library");
  });

  it("a user can also hide a default tab on their device", () => {
    calendarPref.set("off");
    expect(ids()).toEqual(["shifts"]);
  });
});

describe("default resolution honors Status/Flows too", () => {
  it("a default that includes Status shows it without an explicit pref", () => {
    holonDefaultTabs.set(["calendar", "status"]);
    expect(ids()).toEqual(["calendar", "status"]);
  });
});

describe("never blank", () => {
  it("falls back to the holon default when every tab is toggled off", () => {
    holonDefaultTabs.set(resolveHolonDefaultTabs(COMMONS_HUB));
    for (const p of [
      tasksPref,
      calendarPref,
      libraryPref,
      rolesPref,
      checklistsPref,
      shiftsPref,
      statusPref,
      flowsPref,
    ])
      p.set("off");
    expect(ids()).toEqual(["calendar", "shifts"]);
  });

  it("falls back to Tasks when everything is off and there is no default", () => {
    for (const p of [
      tasksPref,
      calendarPref,
      libraryPref,
      rolesPref,
      checklistsPref,
      shiftsPref,
      statusPref,
      flowsPref,
    ])
      p.set("off");
    expect(ids()).toEqual(["tasks"]);
  });
});
