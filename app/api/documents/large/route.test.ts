import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UPLOAD_CHUNK_BYTES } from "@/lib/documentRules";

const world = vi.hoisted(() => ({ user: "owner-id", access: {} as Record<string, unknown>, connected: true, started: [] as any[], pieces: [] as any[] }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: world.user } }, error: null }) },
    rpc: async () => ({ data: world.access, error: null }),
    from: () => { const q: any = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { owner_user_id: "owner-id" }, error: null }) }; return q; },
  }),
}));
vi.mock("@/lib/googleDriveOAuth", () => ({
  driveConfigured: () => true,
  hasGoogleDriveOAuth: async () => world.connected,
  isDriveSignInExpired: () => false,
  startOAuthUpload: async (driveUser: string, input: any) => { world.started.push({ driveUser, input }); return "https://www.googleapis.com/upload/drive/v3/files?upload_id=abc"; },
  continueOAuthUpload: async (driveUser: string, address: string, piece: ArrayBuffer, start: number, size: number) => {
    world.pieces.push({ driveUser, address, start, length: piece.byteLength, size });
    return start + piece.byteLength === size ? { done: true, fileId: "big-1", webViewLink: "" } : { done: false };
  },
}));

const all = { can_upload_documents: true, can_edit: true, all_modules: true, modules: [] };
const size = UPLOAD_CHUNK_BYTES + 100;
async function start(extra: object = {}) {
  const { POST } = await import("./route");
  const response = await POST(new NextRequest("http://localhost/api/documents/large", { method: "POST", headers: { authorization: "Bearer t" }, body: JSON.stringify({ moduleKey: "property", workspaceId: "house-id", folderParts: ["Investments"], fileName: "deed.pdf", mimeType: "application/pdf", size, ...extra }) }));
  return { status: response.status, json: await response.json() };
}
async function piece(token: string, from: number, length: number) {
  const { PUT } = await import("./route");
  const response = await PUT(new NextRequest(`http://localhost/api/documents/large?start=${from}`, { method: "PUT", headers: { authorization: "Bearer t", "x-upload-token": token }, body: new Uint8Array(length) }));
  return { status: response.status, json: await response.json() };
}

beforeEach(() => {
  vi.resetModules();
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: "https://db.example", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service" })) vi.stubEnv(key, value);
  Object.assign(world, { user: "owner-id", access: { ...all }, connected: true, started: [], pieces: [] });
});

describe("documents too big for one request", () => {
  it("sends the pieces to the owner's Drive and returns the saved document", async () => {
    world.user = "member-id";
    const { json } = await start();
    expect(world.started[0]).toMatchObject({ driveUser: "owner-id", input: { size, workspaceId: "house-id" } });
    expect((await piece(json.token, 0, UPLOAD_CHUNK_BYTES)).json).toEqual({ done: false });
    const last = await piece(json.token, UPLOAD_CHUNK_BYTES, 100);
    expect(last.json).toMatchObject({ done: true, storage: "drive", document: { file_name: "deed.pdf", file_path: "gdrive:big-1", file_size: size } });
    expect(world.pieces.map((p) => [p.driveUser, p.start, p.length])).toEqual([["owner-id", 0, UPLOAD_CHUNK_BYTES], ["owner-id", UPLOAD_CHUNK_BYTES, 100]]);
  });

  it("checks rights, size, type and the Drive connection before starting", async () => {
    expect((await start({ size: 51 * 1024 * 1024 })).status).toBe(413);
    expect((await start({ fileName: "run.exe", mimeType: "application/x-msdownload" })).status).toBe(415);
    world.access = { ...all, can_edit: false };
    expect((await start()).status).toBe(403);
    world.access = { ...all };
    world.connected = false;
    expect(await start()).toMatchObject({ status: 409, json: { code: "GOOGLE_DRIVE_NOT_CONNECTED" } });
    expect(world.started).toEqual([]);
  });

  it("refuses a made-up or another person's upload, and pieces of the wrong size", async () => {
    const { json } = await start();
    expect((await piece("made-up", 0, UPLOAD_CHUNK_BYTES)).status).toBe(400);
    world.user = "someone-else";
    expect((await piece(json.token, 0, UPLOAD_CHUNK_BYTES)).status).toBe(403);
    world.user = "owner-id";
    expect((await piece(json.token, 0, 10)).status).toBe(400);
    expect((await piece(json.token, 5, UPLOAD_CHUNK_BYTES)).status).toBe(400);
    expect((await piece(json.token, UPLOAD_CHUNK_BYTES, 500)).status).toBe(400);
    expect(world.pieces).toEqual([]);
  });
});
