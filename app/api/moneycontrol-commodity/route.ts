import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MONEYCONTROL_COMMODITY_URL = "https://www.moneycontrol.com/commodity/";
const MONEYCONTROL_MCX_URL =
  "https://priceapi.moneycontrol.com/technicalCompanyData/commodity/getMajorCommodities?tabName=MCX&deviceType=W";

function assetSymbol(value: string) {
  const asset = value.trim().toLowerCase();
  if (asset.includes("silver")) return "SILVER";
  if (asset.includes("gold")) return "GOLD";
  if (asset.includes("copper")) return "COPPER";
  if (asset.includes("crude")) return "CRUDEOIL";
  if (asset.includes("natural")) return "NATURALGAS";
  return "";
}

function commodityUrl(symbol: string, expiry = "") {
  if (!symbol) return MONEYCONTROL_COMMODITY_URL;
  const params = new URLSearchParams({ type: "futures" });
  if (expiry) params.set("exp", expiry);
  return `https://www.moneycontrol.com/commodity/mcx-${symbol.toLowerCase()}-price?${params}`;
}

function formatExpiry(value: any) {
  const match = String(value || "").match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!match) return "";
  const months: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };
  const month = months[match[2]];
  return month ? `${match[3]}-${month}-${match[1].padStart(2, "0")}` : "";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = assetSymbol(searchParams.get("asset") || "");
  if (!symbol) return NextResponse.redirect(MONEYCONTROL_COMMODITY_URL);

  try {
    const res = await fetch(MONEYCONTROL_MCX_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 AssetManager/1.0",
        Referer: MONEYCONTROL_COMMODITY_URL,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const row = data?.data?.list?.find(
        (item: any) => String(item?.symbol || "").toUpperCase() === symbol,
      );
      const expiry = formatExpiry(row?.expDate);
      return NextResponse.redirect(commodityUrl(symbol, expiry));
    }
  } catch {
    // A destination without expiry still lets Moneycontrol select its contract.
  }

  return NextResponse.redirect(commodityUrl(symbol));
}
