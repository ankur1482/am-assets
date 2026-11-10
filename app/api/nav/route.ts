import { NextResponse } from "next/server";
import { findAmfiNav } from "@/lib/amfiNav";

const AMFI_NAV_URL = "https://portal.amfiindia.com/spages/NAVAll.txt";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("schemeCode") || "").trim();
  if (!code) return NextResponse.json({ error: "Scheme code missing" }, { status: 400 });
  try {
    const res = await fetch(AMFI_NAV_URL, {
      headers: { "User-Agent": "Mozilla/5.0 AssetManager/1.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ error: "AMFI NAV request failed" }, { status: 502 });
    const found = findAmfiNav(await res.text(), code);
    if ("error" in found) {
      const error = found.error === "not-found" ? "Scheme code not found" : "NAV not available";
      return NextResponse.json({ error, schemeCode: code }, { status: 404 });
    }
    return NextResponse.json({
      ...found,
      provider: "AMFI NAVAll via Vercel API route",
      time: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "NAV failed", schemeCode: code }, { status: 500 });
  }
}
