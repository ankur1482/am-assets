import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function citySlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function amount(value: string | undefined) {
  const parsed = Number(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function cleanText(value: string | undefined) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPage(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,*/*",
      "Accept-Language": "en-IN,en;q=0.9",
      "User-Agent": "Mozilla/5.0 AssetManager/1.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`5paisa returned ${response.status}`);
  return response.text();
}

function parseGold(html: string) {
  const block = html.match(
    /<span>\s*24K Gold\s*<\/span>[\s\S]{0,900}?<strong>\s*₹?\s*([\d,]+(?:\.\d+)?)\s*<\/strong>/i,
  );
  const table = html.match(
    /<td>\s*10\s*gram\s*<\/td>\s*<td>\s*([\d,]+(?:\.\d+)?)\s*<\/td>/i,
  );
  const date = html.match(
    /<span>\s*24K Gold\s*<\/span>[\s\S]{0,350}?As on\s*([\d]{1,2}\s+[A-Za-z]+,\s*[\d]{4})/i,
  );
  return {
    rate: amount(block?.[1] || table?.[1]),
    asOn: cleanText(date?.[1]),
  };
}

function parseSilver(html: string) {
  const block = html.match(
    /<span>\s*Silver\s*<\/span>\s*<span[^>]*>\s*\/\s*kg\s*<\/span>[\s\S]{0,900}?<strong>\s*₹?\s*([\d,]+(?:\.\d+)?)\s*<\/strong>/i,
  );
  const table = html.match(
    /<td>\s*1\s*Kg\s*<\/td>\s*<td>\s*([\d,]+(?:\.\d+)?)\s*<\/td>/i,
  );
  const date = html.match(
    /<span>\s*Silver\s*<\/span>\s*<span[^>]*>\s*\/\s*kg\s*<\/span>[\s\S]{0,350}?As on\s*([\d]{1,2}\s+[A-Za-z]+,\s*[\d]{4})/i,
  );
  return {
    rate: amount(block?.[1] || table?.[1]),
    asOn: cleanText(date?.[1]),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = String(searchParams.get("city") || "").trim();
  const slug = citySlug(city);
  if (!slug)
    return NextResponse.json({ error: "City is required" }, { status: 400 });

  const goldUrl = `https://www.5paisa.com/commodity-trading/gold/${encodeURIComponent(slug)}`;
  const silverUrl = `https://www.5paisa.com/commodity-trading/silver/${encodeURIComponent(slug)}`;
  try {
    const [goldHtml, silverHtml] = await Promise.all([
      fetchPage(goldUrl),
      fetchPage(silverUrl),
    ]);
    const gold = parseGold(goldHtml);
    const silver = parseSilver(silverHtml);
    if (!gold.rate && !silver.rate)
      throw new Error(`5paisa local rates unavailable for ${city}`);
    return NextResponse.json(
      {
        city,
        provider: "5paisa city bullion rates",
        gold24kPer10GramInr: gold.rate,
        silverPerKgInr: silver.rate,
        goldAsOn: gold.asOn,
        silverAsOn: silver.asOn,
        goldUrl,
        silverUrl,
        time: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "5paisa local rates unavailable",
        city,
        provider: "5paisa city bullion rates",
        goldUrl,
        silverUrl,
      },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
