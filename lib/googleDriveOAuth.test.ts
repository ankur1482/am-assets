import { Readable } from "stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Google itself is made up here: a small Drive with one household file and one private file.
const drive = vi.hoisted(() => ({ created: [] as any[], updated: [] as any[], asked: [] as any[] }));
vi.mock("@/lib/oauthCredentials", () => ({ readOAuthCredential: async () => ({ refresh_token: "r" }) }));
vi.mock("googleapis", () => ({
  google: {
    auth: { OAuth2: class { setCredentials() {} async getAccessToken() { return { token: "access" }; } } },
    drive: () => ({
      files: {
        list: async () => ({ data: { files: [] } }),
        create: async (request: any) => { drive.created.push(request); return { data: { id: `id-${drive.created.length}`, name: request.requestBody.name, webViewLink: "https://drive.example/x" } }; },
        update: async (request: any) => { drive.updated.push(request); return { data: {} }; },
        get: async (request: any) => {
          drive.asked.push(request);
          if (request.alt === "media") return { data: Readable.from([Buffer.from("content")]) };
          return { data: { name: "deed.pdf", mimeType: "application/pdf", appProperties: request.fileId === "shared" ? { workspaceId: "house-id" } : undefined } };
        },
      },
    }),
  },
}));

const load = () => import("./googleDriveOAuth");
const address = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=abc";
beforeEach(() => {
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "client");
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "secret");
  vi.stubEnv("GOOGLE_DRIVE_ROOT_FOLDER_ID", "");
  Object.assign(drive, { created: [], updated: [], asked: [] });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("household files in Google Drive", () => {
  it("marks each file as the household's and files it by type, institution and holding", async () => {
    const { uploadOAuthAssetDocument } = await load();
    await uploadOAuthAssetDocument("owner", { userId: "owner", moduleKey: "property", fileName: "deed.pdf", mimeType: "application/pdf", buffer: Buffer.from("x"), folderParts: ["Investments", "Property", "Example Heights"], workspaceId: "house-id" });
    expect(drive.created.map((c) => c.requestBody.name).slice(0, 4)).toEqual(["Important Documents", "Investments", "Property", "Example Heights"]);
    expect(drive.created.at(-1).requestBody).toMatchObject({ appProperties: { workspaceId: "house-id" } });
  });

  it("opens only that household's files on a member's behalf", async () => {
    const { downloadOAuthAssetDocument, trashOAuthAssetDocument } = await load();
    const file = await downloadOAuthAssetDocument("owner", "gdrive:shared", "house-id");
    expect(await new Response(file.body as any).text()).toBe("content");
    await expect(downloadOAuthAssetDocument("owner", "gdrive:private", "house-id")).rejects.toMatchObject({ status: 403 });
    await expect(trashOAuthAssetDocument("owner", "gdrive:private", "house-id")).rejects.toMatchObject({ status: 403 });
    expect(drive.asked.filter((a) => a.alt === "media" && a.fileId === "private")).toEqual([]);
    expect(drive.updated).toEqual([]);
  });

  it("moves a deleted file to the bin instead of erasing it", async () => {
    const { trashOAuthAssetDocument } = await load();
    await trashOAuthAssetDocument("owner", "gdrive:shared", "house-id");
    expect(drive.updated).toEqual([{ fileId: "shared", requestBody: { trashed: true } }]);
  });
});

describe("large uploads", () => {
  it("asks Google for an upload address with the file's size and folder", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200, headers: { location: address } }));
    vi.stubGlobal("fetch", fetcher);
    const { startOAuthUpload } = await load();
    expect(await startOAuthUpload("owner", { userId: "owner", moduleKey: "property", fileName: "deed.pdf", mimeType: "application/pdf", folderParts: ["Investments"], workspaceId: "house-id", size: 5000 })).toBe(address);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toContain("uploadType=resumable");
    expect(options.headers).toMatchObject({ "X-Upload-Content-Length": "5000", "X-Upload-Content-Type": "application/pdf" });
    expect(JSON.parse(options.body)).toMatchObject({ appProperties: { workspaceId: "house-id" } });
  });

  it("sends pieces with their position, and reads Google's 308 as 'send the next'", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ status: 308, ok: false } as Response)
      .mockResolvedValueOnce(Response.json({ id: "big" }));
    vi.stubGlobal("fetch", fetcher);
    const { continueOAuthUpload } = await load();
    expect(await continueOAuthUpload("owner", address, new ArrayBuffer(4), 0, 6)).toEqual({ done: false });
    expect(await continueOAuthUpload("owner", address, new ArrayBuffer(2), 4, 6)).toMatchObject({ done: true, fileId: "big" });
    expect(fetcher.mock.calls.map(([, o]) => o.headers["Content-Range"])).toEqual(["bytes 0-3/6", "bytes 4-5/6"]);
    expect(fetcher.mock.calls[0][1].redirect).toBe("manual");
  });

  it("never sends a file anywhere but Google, and reports a refusal", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
    vi.stubGlobal("fetch", fetcher);
    const { continueOAuthUpload, startOAuthUpload } = await load();
    await expect(continueOAuthUpload("owner", "https://elsewhere.example/upload", new ArrayBuffer(1), 0, 1)).rejects.toThrow(/not valid/);
    expect(fetcher).not.toHaveBeenCalled();
    await expect(continueOAuthUpload("owner", address, new ArrayBuffer(1), 0, 1)).rejects.toThrow(/403/);
    await expect(startOAuthUpload("owner", { userId: "owner", moduleKey: "property", fileName: "a.pdf", mimeType: "application/pdf", size: 1 })).rejects.toThrow(/403/);
  });
});

describe("the Google sign-in", () => {
  it("recognises a sign-in Google has ended", async () => {
    const { isDriveSignInExpired } = await load();
    expect(isDriveSignInExpired({ response: { data: { error: "invalid_grant" } } })).toBe(true);
    expect(isDriveSignInExpired(new Error("Google Drive is not connected."))).toBe(true);
    expect(isDriveSignInExpired(new Error("Rate limit exceeded"))).toBe(false);
  });
});
