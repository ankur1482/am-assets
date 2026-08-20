import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/serverAuth";
import { deleteOAuthCredential, readOAuthCredential, saveOAuthCredential } from "@/lib/oauthCredentials";
import type { KotakCredential } from "@/lib/kotak";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ connected: false, error: "Invalid session" }, { status: 401 });
  const cred = await readOAuthCredential<KotakCredential>(auth.user.id, "kotak");
  return NextResponse.json(
    { connected: !!(cred?.token && cred?.baseUrl), baseUrl: cred?.baseUrl || "" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "").trim();
  const baseUrl = String(body.baseUrl || "").trim().replace(/\/+$/, "");
  if (!token) return NextResponse.json({ error: "Access token is required" }, { status: 400 });
  if (!/^https:\/\/.+/.test(baseUrl))
    return NextResponse.json({ error: "A valid Base URL (https://...) is required" }, { status: 400 });
  await saveOAuthCredential(auth.user.id, "kotak", { token, baseUrl } satisfies KotakCredential);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  await deleteOAuthCredential(auth.user.id, "kotak");
  return NextResponse.json({ ok: true });
}
