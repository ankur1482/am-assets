import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/appVersion";

// The version now live, so an app left open on a phone can tell it is out of date and offer a reload.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ version: APP_VERSION }, { headers: { "Cache-Control": "no-store" } });
}
