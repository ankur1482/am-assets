import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const malabarFeed = (date: string, rate = "12780.00") => ({ data: { getMetalRate: { items: [{ entry_date: date, entry_time: "09:41:14", purity: "22k", unit: "G", rate: "11715.00", country: "India" }, { entry_date: date, entry_time: "09:41:14", purity: "24k", unit: "G", rate, country: "India" }] } } });
const mcx = { d: { Data: [
  { InstrumentName: "FUTCOM", Symbol: "GOLD", ExpiryDate: "04DEC2026", LTP: 124000, High: 124500, Low: 123500, AbsChange: 300, PreviousClose: 123700 },
  { InstrumentName: "FUTCOM", Symbol: "SILVER", ExpiryDate: "04DEC2026", LTP: 155000, High: 156000, Low: 154000, AbsChange: -500, PreviousClose: 155500 },
] } };
type Feeds = { malabar?: () => Response; mcx?: () => Response };

/** Answers the outside price feeds from memory; a feed left out is down. */
async function call(query: string, feeds: Feeds) {
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("malabargoldanddiamonds.com")) { if (!feeds.malabar) throw new Error("Malabar down"); return feeds.malabar(); }
    if (url.includes("mcxindia.com")) { if (!feeds.mcx) throw new Error("MCX down"); return feeds.mcx(); }
    throw new Error("Feed down");
  });
  vi.stubGlobal("fetch", fetcher);
  const { GET } = await import("./route");
  const response = await GET(new Request(`http://localhost/api/market-rate?${query}`));
  return { status: response.status, json: await response.json(), GET, malabarCalls: () => fetcher.mock.calls.filter(([url]) => String(url).includes("malabar")).length };
}

beforeEach(() => { vi.resetModules(); vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-24T17:00:00+05:30") }); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("gold rate source", () => {
  it("prices gold at Malabar's 24K rate and keeps MCX beside it for comparison", async () => {
    const { status, json } = await call("asset=gold&source=auto", { malabar: () => Response.json(malabarFeed("2026-11-24")), mcx: () => Response.json(mcx) });
    expect(status).toBe(200);
    expect(json).toMatchObject({ basis: "malabar", ratePerGramInr: 12780, ratePer10GramInr: 127800, rateDate: "2026-11-24", dayLow: 123500, dayHigh: 124500, benchmark: { ratePer10GramInr: 124000 } });
    // MCX's daily move belongs to the MCX price, so it is never added to Malabar's.
    expect(json.changePerGramInr).toBeUndefined();
    expect(json.previousPerGramInr).toBeUndefined();
    expect(json.sourceUrl).toContain("live-gold-rate");
  });

  it("still gives Malabar's rate when MCX and Moneycontrol are both down", async () => {
    const { json } = await call("asset=gold", { malabar: () => Response.json(malabarFeed("2026-11-24")) });
    expect(json).toMatchObject({ basis: "malabar", ratePerGramInr: 12780, benchmark: null });
  });

  it("falls back to MCX and says so when Malabar is down or its rate is old", async () => {
    const down = await call("asset=gold&source=auto", { mcx: () => Response.json(mcx) });
    expect(down.json).toMatchObject({ ratePer10GramInr: 124000, malabarUnavailable: true });
    expect(down.json.basis).toBeUndefined();
    vi.resetModules();
    const old = await call("asset=gold&source=auto", { malabar: () => Response.json(malabarFeed("2026-11-02")), mcx: () => Response.json(mcx) });
    expect(old.json).toMatchObject({ ratePer10GramInr: 124000, malabarUnavailable: true });
  });

  it("does not ask Malabar when the market price is wanted, or for silver", async () => {
    const feeds = { malabar: () => Response.json(malabarFeed("2026-11-24")), mcx: () => Response.json(mcx) };
    const market = await call("asset=gold&source=market", feeds);
    expect(market.json).toMatchObject({ ratePer10GramInr: 124000, changePer10GramInr: 300 });
    expect(market.json.malabarUnavailable).toBeUndefined();
    expect(market.malabarCalls()).toBe(0);
    const silver = await call("asset=silver&source=auto", feeds);
    expect(silver.json).toMatchObject({ ratePerKgInr: 155000 });
    expect(silver.malabarCalls()).toBe(0);
  });

  it("asks Malabar once in five minutes, however often the screen refreshes", async () => {
    const { GET, malabarCalls } = await call("asset=gold", { malabar: () => Response.json(malabarFeed("2026-11-24")), mcx: () => Response.json(mcx) });
    const again = () => GET(new Request("http://localhost/api/market-rate?asset=gold"));
    await again();
    expect(malabarCalls()).toBe(1);
    vi.setSystemTime(new Date("2026-11-24T17:06:00+05:30"));
    await again();
    expect(malabarCalls()).toBe(2);
  });
});
