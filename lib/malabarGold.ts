// Malabar Gold & Diamonds publishes one 24K rate a gram for all of India, usually set each morning.
// The rate page loads it from the query below; no sign-in is needed. Malabar does not publish the previous
// day's rate, so the app saves each day's rate with the holding to work out Today's Gain.
export const MALABAR_RATE_PAGE = "https://www.malabargoldanddiamonds.com/in/pan-india/en/live-gold-rate.html";
export const MALABAR_PROVIDER = "Malabar Gold & Diamonds 24K";
const RATE_QUERY =
  "query getMetalRate($filter: MetalRateFilterInput) { getMetalRate(filter: $filter) { items { entry_date entry_time purity unit rate country state } } }";

/** A rate older than this is not used to price gold. */
const MAX_AGE_DAYS = 7;
/** How long a saved rate stands in when Malabar cannot be reached, or counts as "the day before". Covers a weekend. */
const RECENT_DAYS = 3;

export function malabarRateUrl() {
  const variables = JSON.stringify({ filter: { metal_type: "gold", country: "India" } });
  return `https://www.malabargoldanddiamonds.com/graphql-magento?query=${encodeURIComponent(RATE_QUERY)}&operationName=getMetalRate&variables=${encodeURIComponent(variables)}`;
}

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** The newest all-India 24K rate per gram in Malabar's reply. Throws when there is none, or it is too old. */
export function parseMalabar24k(payload: any, today: string): { ratePerGram: number; date: string; time: string } {
  const items: any[] = Array.isArray(payload?.data?.getMetalRate?.items) ? payload.data.getMetalRate.items : [];
  const newest = items
    .filter((item) => /^24\s*k$/i.test(String(item?.purity ?? "").trim()) && /^india$/i.test(String(item?.country ?? "").trim()) && /^g(m|ms|rm|rms|ram|rams)?$/i.test(String(item?.unit ?? "").trim()))
    .map((item) => ({ ratePerGram: Number(item.rate), date: String(item.entry_date ?? "").slice(0, 10), time: String(item.entry_time ?? "") }))
    .filter((item) => Number.isFinite(item.ratePerGram) && item.ratePerGram > 0 && /^\d{4}-\d{2}-\d{2}$/.test(item.date))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))[0];
  if (!newest) throw new Error("Malabar 24K rate unavailable");
  if (daysBetween(newest.date, today) > MAX_AGE_DAYS) throw new Error(`Malabar 24K rate is out of date (${newest.date})`);
  return newest;
}

type SavedRates = {
  malabar_rate_per_gram?: string;
  malabar_rate_date?: string;
  malabar_previous_rate_per_gram?: string;
  malabar_previous_rate_date?: string;
};
type GoldQuote = { basis?: string; malabarUnavailable?: boolean; ratePerGramInr?: number; rateDate?: string } | null | undefined;

const rateOf = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * The Malabar rate to value a gold holding at, and today's change, or null when the market price applies.
 * The change compares Malabar with Malabar only, so moving between Malabar and MCX is never shown as a gain.
 */
export function malabarGold(record: Record<string, any>, quote: GoldQuote, today: string): { ratePerGram: number; changePerGram: number; saved: SavedRates } | null {
  let saved: SavedRates = {
    malabar_rate_per_gram: record.malabar_rate_per_gram,
    malabar_rate_date: record.malabar_rate_date,
    malabar_previous_rate_per_gram: record.malabar_previous_rate_per_gram,
    malabar_previous_rate_date: record.malabar_previous_rate_date,
  };
  const live = rateOf(quote?.ratePerGramInr);
  if (quote?.basis === "malabar" && live && quote.rateDate) {
    // A new day's rate moves the saved one to "the day before"; a revision on the same day only replaces it.
    const newDay = !!rateOf(saved.malabar_rate_per_gram) && !!saved.malabar_rate_date && saved.malabar_rate_date < quote.rateDate;
    saved = {
      malabar_rate_per_gram: live.toFixed(2),
      malabar_rate_date: quote.rateDate,
      malabar_previous_rate_per_gram: (newDay ? saved.malabar_rate_per_gram : saved.malabar_previous_rate_per_gram) || "",
      malabar_previous_rate_date: (newDay ? saved.malabar_rate_date : saved.malabar_previous_rate_date) || "",
    };
  } else if (!quote?.malabarUnavailable || !saved.malabar_rate_date || daysBetween(saved.malabar_rate_date, today) > RECENT_DAYS) {
    return null;
  }
  const ratePerGram = rateOf(saved.malabar_rate_per_gram),
    previous = rateOf(saved.malabar_previous_rate_per_gram);
  if (!ratePerGram) return null;
  const setToday = saved.malabar_rate_date === today && !!previous && !!saved.malabar_previous_rate_date && daysBetween(saved.malabar_previous_rate_date, today) <= RECENT_DAYS;
  return { ratePerGram, changePerGram: setToday ? Math.round((ratePerGram - previous) * 100) / 100 : 0, saved };
}
