import { describe, expect, it } from "vitest";
import { documentMime, UPLOAD_CHUNK_BYTES, uploadChunks } from "./documentRules";

describe("which files can be attached", () => {
  it("accepts documents, sheets and photos, including iPhone photos", () => {
    expect(documentMime("deed.pdf", "application/pdf")).toBe("application/pdf");
    expect(documentMime("photo.heic", "image/heic")).toBe("image/heic");
  });

  it("works the type out from the name when the browser does not say", () => {
    expect(documentMime("IMG_0001.HEIC", "")).toBe("image/heic");
    expect(documentMime("policy.PDF", "application/octet-stream")).toBe("application/pdf");
    expect(documentMime("statement.csv", "application/vnd.ms-excel")).toBe("application/vnd.ms-excel");
  });

  it("refuses anything else, whatever it is called", () => {
    expect(documentMime("run.exe", "application/x-msdownload")).toBe("");
    expect(documentMime("page.html", "text/html")).toBe("");
    expect(documentMime("fake.pdf", "text/html")).toBe("");
    expect(documentMime("noextension", "")).toBe("");
  });
});

describe("sending a large file in pieces", () => {
  it("covers every byte once, in pieces Google and Vercel both accept", () => {
    expect(UPLOAD_CHUNK_BYTES % (256 * 1024)).toBe(0);
    expect(UPLOAD_CHUNK_BYTES).toBeLessThan(4_500_000);
    const size = UPLOAD_CHUNK_BYTES * 2 + 10, pieces = uploadChunks(size);
    expect(pieces).toEqual([
      { start: 0, end: UPLOAD_CHUNK_BYTES },
      { start: UPLOAD_CHUNK_BYTES, end: UPLOAD_CHUNK_BYTES * 2 },
      { start: UPLOAD_CHUNK_BYTES * 2, end: size },
    ]);
    expect(uploadChunks(UPLOAD_CHUNK_BYTES)).toHaveLength(1);
  });
});
