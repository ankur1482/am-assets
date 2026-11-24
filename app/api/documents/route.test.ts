import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Everything outside the route is made up here: no real Supabase or Google Drive is reached.
const OWNER = "owner-id", MEMBER = "member-id", HOUSE = "house-id";
const world = vi.hoisted(() => ({
  user: "owner-id",
  access: {} as Record<string, unknown>,
  doc: null as Record<string, unknown> | null,
  connected: new Set<string>(),
  files: {} as Record<string, { workspaceId?: string; owner: string }>,
  stored: [] as string[],
  deletedRows: [] as string[],
  trashed: [] as string[],
  uploads: [] as { driveUser: string; input: any }[],
  expired: false,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (_url: string, key: string) => ({
    auth: { getUser: async () => ({ data: { user: { id: world.user } }, error: null }) },
    rpc: async () => ({ data: world.access, error: null }),
    from: (table: string) => {
      const query: any = {
        select: () => query,
        eq: () => query,
        delete: () => { query.deleting = true; return query; },
        maybeSingle: async () => ({ data: table === "workspaces" ? { owner_user_id: "owner-id" } : world.doc, error: null }),
        then: (done: (value: unknown) => void) => {
          if (query.deleting && world.access.can_delete) world.deletedRows.push(String(world.doc?.id));
          done({ data: query.deleting && world.access.can_delete ? [{ id: world.doc?.id }] : [], error: null });
        },
      };
      return query;
    },
    storage: {
      getBucket: async () => ({ data: {} }),
      from: () => ({
        upload: async (path: string) => { if (key === "service") world.stored.push(path); return { error: null }; },
        createSignedUrl: async () => ({ data: { signedUrl: "https://store.example/signed" }, error: null }),
        remove: async () => ({ error: null }),
      }),
    },
  }),
}));

vi.mock("@/lib/googleDriveOAuth", () => {
  const open = (driveUser: string, path: string, workspaceId?: string) => {
    const file = world.files[path.replace("gdrive:", "")];
    if (!file || file.owner !== driveUser) throw Object.assign(new Error("File not found"), { status: 404 });
    if (workspaceId && file.workspaceId !== workspaceId) throw Object.assign(new Error("not this household's"), { status: 403 });
  };
  return {
    driveConfigured: () => !!process.env.GOOGLE_OAUTH_CLIENT_ID,
    hasGoogleDriveOAuth: async (id: string) => world.connected.has(id),
    isDriveSignInExpired: (e: any) => /invalid_grant/.test(String(e?.message)),
    uploadOAuthAssetDocument: async (driveUser: string, input: any) => {
      if (world.expired) throw new Error("invalid_grant");
      world.uploads.push({ driveUser, input });
      return { fileId: "file-1", webViewLink: "https://drive.example/file-1" };
    },
    downloadOAuthAssetDocument: async (driveUser: string, path: string, workspaceId?: string) => {
      open(driveUser, path, workspaceId);
      return { name: "deed.pdf", mimeType: "application/pdf", body: Buffer.from("content") };
    },
    trashOAuthAssetDocument: async (driveUser: string, path: string, workspaceId?: string) => {
      open(driveUser, path, workspaceId);
      world.trashed.push(path);
    },
  };
});

const all = { can_upload_documents: true, can_edit: true, can_delete: true, all_modules: true, modules: [] };
const request = (method: string, query = "", body?: BodyInit) => new NextRequest(`http://localhost/api/documents${query}`, { method, body, headers: { authorization: "Bearer t" } });
async function upload(moduleKey = "property", file = new File(["content"], "deed.pdf", { type: "application/pdf" })) {
  const form = new FormData();
  form.append("moduleKey", moduleKey);
  form.append("workspaceId", HOUSE);
  form.append("folderParts", JSON.stringify(["Investments", "Property", "Example Heights"]));
  form.append("file", file);
  const { POST } = await import("./route");
  const response = await POST(request("POST", "", form));
  return { status: response.status, json: await response.json() };
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://db.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "client");
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "secret");
  Object.assign(world, { user: OWNER, access: { ...all }, doc: null, connected: new Set([OWNER]), files: {}, stored: [], deletedRows: [], trashed: [], uploads: [], expired: false });
});

describe("saving a household document", () => {
  it("goes to the owner's connected Google Drive, in the holding's folder", async () => {
    const { status, json } = await upload();
    expect(status).toBe(200);
    expect(json.document.file_path).toBe("gdrive:file-1");
    expect(world.uploads[0]).toMatchObject({ driveUser: OWNER, input: { workspaceId: HOUSE, folderParts: ["Investments", "Property", "Example Heights"] } });
    expect(world.stored).toEqual([]);
  });

  it("goes to the owner's Drive when a family member adds it", async () => {
    world.user = MEMBER;
    const { json } = await upload();
    expect(json.document.file_path).toBe("gdrive:file-1");
    expect(world.uploads[0].driveUser).toBe(OWNER);
  });

  it("asks for Drive to be connected, rather than quietly saving somewhere else", async () => {
    world.connected.clear();
    expect(await upload()).toMatchObject({ status: 409, json: { code: "GOOGLE_DRIVE_NOT_CONNECTED" } });
    world.user = MEMBER;
    expect(await upload()).toMatchObject({ status: 409, json: { code: "HOUSEHOLD_DRIVE_NOT_CONNECTED" } });
    expect(world.stored).toEqual([]);
  });

  it("asks to reconnect when Google has ended the sign-in", async () => {
    world.expired = true;
    expect(await upload()).toMatchObject({ status: 409, json: { code: "GOOGLE_DRIVE_NOT_CONNECTED" } });
  });

  it("never blocks the monthly documents, which lock the app when overdue", async () => {
    world.connected.clear();
    expect((await upload("monthlyUpload")).status).toBe(200);
    world.connected.add(OWNER);
    world.expired = true;
    expect((await upload("monthlyUpload")).status).toBe(200);
    expect(world.stored).toHaveLength(2);
  });

  it("keeps the app's own storage when Google Drive is not set up on the server", async () => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "");
    const { status, json } = await upload();
    expect(status).toBe(200);
    expect(json.document.file_path.startsWith(`${HOUSE}/`)).toBe(true);
    expect(json.storage).toBe("app");
  });

  it("refuses someone without upload rights, or without that type of asset", async () => {
    world.access = { ...all, can_upload_documents: false };
    expect((await upload()).status).toBe(403);
    world.access = { ...all, all_modules: false, modules: ["stocks"] };
    expect((await upload("property")).status).toBe(403);
    expect(world.uploads).toEqual([]);
  });

  it("accepts an iPhone photo and refuses a web page", async () => {
    expect((await upload("property", new File(["x"], "IMG.HEIC", { type: "" }))).status).toBe(200);
    expect((await upload("property", new File(["x"], "page.html", { type: "text/html" }))).status).toBe(415);
  });
});

describe("opening and deleting a household document", () => {
  const get = async () => { const { GET } = await import("./route"); return GET(request("GET", "?id=doc-1")); };
  const remove = async () => { const { DELETE } = await import("./route"); return DELETE(request("DELETE", "?id=doc-1")); };
  beforeEach(() => {
    world.doc = { id: "doc-1", user_id: OWNER, workspace_id: HOUSE, file_path: "gdrive:deed" };
    world.files = { deed: { owner: OWNER, workspaceId: HOUSE }, private: { owner: OWNER }, old: { owner: OWNER } };
  });

  it("opens from the owner's Drive for a family member", async () => {
    world.user = MEMBER;
    const response = await get();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("content");
  });

  it("never opens or deletes another file in the owner's Drive, even if a record points at it", async () => {
    world.user = MEMBER;
    world.doc = { ...world.doc, file_path: "gdrive:private" };
    expect((await get()).status).toBe(403);
    expect((await remove()).status).toBe(403);
    expect(world.trashed).toEqual([]);
    expect(world.deletedRows).toEqual([]);
  });

  it("still opens the owner's older files, saved before household tagging", async () => {
    world.doc = { ...world.doc, file_path: "gdrive:old" };
    expect((await get()).status).toBe(200);
  });

  it("moves the file to Drive's bin and removes the entry", async () => {
    expect((await remove()).status).toBe(200);
    expect(world.trashed).toEqual(["gdrive:deed"]);
    expect(world.deletedRows).toEqual(["doc-1"]);
  });

  it("refuses to delete without delete rights, before touching the file", async () => {
    world.user = MEMBER;
    world.access = { ...all, can_delete: false };
    expect((await remove()).status).toBe(403);
    expect(world.trashed).toEqual([]);
  });

  it("removes the entry when the file is already gone from Drive", async () => {
    world.files = {};
    expect((await remove()).status).toBe(200);
    expect(world.deletedRows).toEqual(["doc-1"]);
  });
});
