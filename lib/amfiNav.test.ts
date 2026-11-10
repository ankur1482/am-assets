import { describe, expect, it } from "vitest";
import { findAmfiNav } from "./amfiNav";

const NEW_FORMAT = [
  "Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Plan;Option;Net Asset Value;Date",
  " ",
  "Axis Mutual Fund",
  "120503;INF846K01EW2;-;Axis ELSS- Tax Saver Fund;Direct Plan;Growth Option;114.9682;09-Nov-2026",
  "100001;INF000000001;-;Closed Fund;Regular Plan;Growth;N.A.;09-Nov-2026",
].join("\r\n");

const OLD_FORMAT = [
  "Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date",
  "120503;INF846K01EW2;-;Axis ELSS Tax Saver Fund - Direct Plan - Growth;98.1234;05-Nov-2026",
].join("\n");

describe("findAmfiNav", () => {
  it("reads the NAV from the Nov 2026 layout with Plan and Option columns", () => {
    expect(findAmfiNav(NEW_FORMAT, "120503")).toEqual({
      schemeCode: "120503",
      schemeName: "Axis ELSS- Tax Saver Fund - Direct Plan - Growth Option",
      nav: 114.9682,
      navDate: "09-Nov-2026",
    });
  });

  it("still reads the older layout", () => {
    expect(findAmfiNav(OLD_FORMAT, "120503")).toMatchObject({ nav: 98.1234, navDate: "05-Nov-2026" });
  });

  it("reports missing schemes and missing NAVs separately", () => {
    expect(findAmfiNav(NEW_FORMAT, "999999")).toEqual({ error: "not-found" });
    expect(findAmfiNav(NEW_FORMAT, "100001")).toEqual({ error: "no-nav" });
  });
});
