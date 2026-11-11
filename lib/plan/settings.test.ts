import { describe, expect, it } from "vitest";
import { cleanPlanSettings, DEFAULT_PLAN_SETTINGS, planSettingsData, readPlanSettings, withBirthDate } from "./settings";

describe("plan settings", () => {
  it("are the defaults when nothing is saved", () => {
    expect(readPlanSettings([])).toEqual(DEFAULT_PLAN_SETTINGS);
  });

  it("keep only valid birth dates", () => {
    expect(cleanPlanSettings({ birth_dates: { Mira: "2014-02-10", Kavi: "soon", "": "2010-01-01" } }).birthDates).toEqual({ Mira: "2014-02-10" });
  });

  it("set, clear and carry a birth date across a rename", () => {
    let s = withBirthDate(DEFAULT_PLAN_SETTINGS, "Mira", "2014-02-10");
    s = withBirthDate(s, "Mira G", "2014-02-10", "Mira");
    expect(s.birthDates).toEqual({ "Mira G": "2014-02-10" });
    expect(withBirthDate(s, "Mira G", "").birthDates).toEqual({});
  });

  it("round-trip through the saved record", () => {
    const s = withBirthDate(DEFAULT_PLAN_SETTINGS, "Asha", "1985-07-01");
    expect(readPlanSettings([{ id: "p", module_key: "planSettings", data: planSettingsData(s) }])).toEqual(s);
  });
});
