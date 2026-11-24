import { describe, expect, it } from "vitest";
import { malabarGold, parseMalabar24k } from "./malabarGold";

const item = (extra: Record<string, unknown> = {}) => ({ entry_date: "2026-11-24", entry_time: "09:41:14", purity: "24k", unit: "G", rate: "12780.00", country: "India", state: "", ...extra });
const feed = (items: unknown[]) => ({ data: { getMetalRate: { items } } });
const quote = (rate: number, date: string) => ({ basis: "malabar", ratePerGramInr: rate, rateDate: date });

describe("reading Malabar's 24K rate", () => {
  it("takes the all-India 24K rate per gram, not another purity or 99.9 bullion", () => {
    const payload = feed([item({ purity: "22k", rate: "11715.00" }), item(), item({ purity: "99.99", rate: "12779.00" }), item({ purity: "99.93", unit: "Grms", rate: "7871.00", entry_date: "2024-11-11" })]);
    expect(parseMalabar24k(payload, "2026-11-24")).toEqual({ ratePerGram: 12780, date: "2026-11-24", time: "09:41:14" });
  });

  it("takes the newest entry when there is more than one", () => {
    const payload = feed([item({ rate: "12700.00" }), item({ rate: "12820.00", entry_time: "15:05:00" }), item({ rate: "12650.00", entry_date: "2026-11-23" })]);
    expect(parseMalabar24k(payload, "2026-11-24").ratePerGram).toBe(12820);
  });

  it("refuses another country, another unit, a zero rate and an old rate", () => {
    expect(() => parseMalabar24k(feed([item({ country: "UAE" })]), "2026-11-24")).toThrow(/unavailable/);
    expect(() => parseMalabar24k(feed([item({ unit: "KG" })]), "2026-11-24")).toThrow(/unavailable/);
    expect(() => parseMalabar24k(feed([item({ rate: "0" })]), "2026-11-24")).toThrow(/unavailable/);
    expect(() => parseMalabar24k({ errors: [{ message: "no" }] }, "2026-11-24")).toThrow(/unavailable/);
    expect(() => parseMalabar24k(feed([item({ entry_date: "2026-11-10" })]), "2026-11-24")).toThrow(/out of date/);
  });
});

describe("valuing gold at Malabar's rate", () => {
  it("values at today's rate, with no change until an earlier day's Malabar rate is known", () => {
    const first = malabarGold({ benchmark_rate_per_gram: "12400", previous_rate_per_gram: "12350" }, quote(12780, "2026-11-24"), "2026-11-24");
    expect(first).toMatchObject({ ratePerGram: 12780, changePerGram: 0 });
    expect(first!.saved).toMatchObject({ malabar_rate_per_gram: "12780.00", malabar_rate_date: "2026-11-24" });
  });

  it("works out today's change from the last day's rate, and keeps that day's rate when today's is revised", () => {
    const monday = malabarGold({}, quote(12780, "2026-11-23"), "2026-11-23")!;
    const tuesday = malabarGold(monday.saved, quote(12830, "2026-11-24"), "2026-11-24")!;
    expect(tuesday.changePerGram).toBe(50);
    const revised = malabarGold(tuesday.saved, quote(12800, "2026-11-24"), "2026-11-24")!;
    expect(revised.changePerGram).toBe(20);
    expect(malabarGold(revised.saved, quote(12800, "2026-11-24"), "2026-11-24")!.changePerGram).toBe(20);
  });

  it("shows no change on a day Malabar has not set a rate, or when the last known rate is too old", () => {
    const friday = malabarGold({}, quote(12700, "2026-11-20"), "2026-11-20")!;
    const saturday = malabarGold(friday.saved, quote(12780, "2026-11-21"), "2026-11-21")!;
    expect(saturday.changePerGram).toBe(80);
    expect(malabarGold(saturday.saved, quote(12780, "2026-11-21"), "2026-11-22")!.changePerGram).toBe(0);
    const weeksAgo = malabarGold({}, quote(12000, "2026-11-01"), "2026-11-01")!;
    expect(malabarGold(weeksAgo.saved, quote(12780, "2026-11-24"), "2026-11-24")!.changePerGram).toBe(0);
  });

  it("keeps Malabar's last rate for up to three days when Malabar cannot be reached, then uses the market", () => {
    const saved = malabarGold({}, quote(12780, "2026-11-21"), "2026-11-21")!.saved;
    const down = { malabarUnavailable: true, ratePerGramInr: 12400 };
    expect(malabarGold(saved, down, "2026-11-24")).toMatchObject({ ratePerGram: 12780, changePerGram: 0 });
    expect(malabarGold(saved, down, "2026-11-25")).toBeNull();
    expect(malabarGold({}, down, "2026-11-24")).toBeNull();
  });

  it("leaves gold at the market price when another source is chosen or no price has loaded", () => {
    const saved = malabarGold({}, quote(12780, "2026-11-24"), "2026-11-24")!.saved;
    expect(malabarGold(saved, { ratePerGramInr: 12400 }, "2026-11-24")).toBeNull();
    expect(malabarGold(saved, null, "2026-11-24")).toBeNull();
  });
});
