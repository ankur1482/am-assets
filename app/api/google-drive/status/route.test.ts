import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const world = vi.hoisted(() => ({ user: "owner-id", connected: new Set<string>(), configured: true }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: world.user } }, error: null }) },
    from: () => { const q: any = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { owner_user_id: "owner-id" }, error: null }) }; return q; },
  }),
}));
vi.mock("@/lib/googleDriveOAuth", () => ({
  GOOGLE_DRIVE_TOKEN_COOKIE: "c",
  clearGoogleOAuthCookieOptions: () => ({}),
  driveConfigured: () => world.configured,
  hasGoogleDriveOAuth: async (id: string) => world.connected.has(id),
}));

async function status(query = "?workspaceId=house-id") {
  const { GET } = await import("./route");
  return (await GET(new NextRequest(`http://localhost/api/google-drive/status${query}`, { headers: { authorization: "Bearer t" } }))).json();
}
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://db.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  Object.assign(world, { user: "owner-id", connected: new Set(["owner-id"]), configured: true });
});

describe("where household documents go", () => {
  it("tells the owner their own Drive is used", async () => {
    expect(await status()).toEqual({ connected: true, household: { configured: true, connected: true, mine: true } });
  });

  it("tells a member the owner's Drive is used, apart from their own connection", async () => {
    world.user = "member-id";
    expect(await status()).toEqual({ connected: false, household: { configured: true, connected: true, mine: false } });
  });

  it("says when Google Drive is not set up on the server, even if a sign-in is stored", async () => {
    world.configured = false;
    expect(await status()).toEqual({ connected: false, household: { configured: false, connected: false, mine: true } });
  });
});
