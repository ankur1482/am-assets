import { NextResponse } from "next/server";
import { FIXED_INCOME_DEFAULTS, FIXED_INCOME_RATE_SOURCE, fixedIncomeKey } from "@/lib/fixedIncomeRates";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = fixedIncomeKey(searchParams.get("type") || "");
  const data = FIXED_INCOME_DEFAULTS[type];
  if (!data) return NextResponse.json({ type, available: Object.keys(FIXED_INCOME_DEFAULTS), ...FIXED_INCOME_RATE_SOURCE }, { status: 404 });
  return NextResponse.json({ ...data, type, ...FIXED_INCOME_RATE_SOURCE, time: new Date().toISOString() });
}
