import { describe, expect, it } from "vitest";
import { normalizeHiddenTabs, toggleHiddenTab } from "./hiddenTabs";

describe("hidden tabs", () => {
  it("drops locked tabs, duplicates and junk", () => {
    expect(normalizeHiddenTabs(["stocks", "dashboard", "stocks", 3, "", "admin", "settings", "nsel"])).toEqual(["stocks", "nsel"]);
    expect(normalizeHiddenTabs(undefined)).toEqual([]);
    expect(normalizeHiddenTabs("stocks")).toEqual([]);
  });

  it("toggles a tab but never a locked one", () => {
    expect(toggleHiddenTab([], "ulips")).toEqual(["ulips"]);
    expect(toggleHiddenTab(["ulips", "nsel"], "ulips")).toEqual(["nsel"]);
    expect(toggleHiddenTab([], "settings")).toEqual([]);
  });
});
