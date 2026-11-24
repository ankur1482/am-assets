// Rules for supporting documents, shared by the screens and the server.
export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;

/**
 * Vercel refuses requests over 4.5 MB, so a larger file is sent to Google Drive in pieces of this size.
 * Google needs every piece but the last to be a multiple of 256 KB.
 */
export const UPLOAD_CHUNK_BYTES = 4 * 1024 * 1024;

const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  txt: "text/plain",
  csv: "text/csv",
  json: "application/json",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
const ALLOWED = new Set(Object.values(TYPES));

/** What the file picker offers. */
export const DOCUMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,.xls,.xlsx,.csv,.txt";

/** The document's type, or "" when it may not be attached. The name is used only when the browser gives no type. */
export function documentMime(name: string, type: string) {
  const given = String(type || "").split(";")[0].trim().toLowerCase();
  if (given && given !== "application/octet-stream") return ALLOWED.has(given) ? given : "";
  return TYPES[String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || ""] || "";
}

export function uploadChunks(size: number) {
  const pieces: { start: number; end: number }[] = [];
  for (let start = 0; start < size; start += UPLOAD_CHUNK_BYTES) pieces.push({ start, end: Math.min(size, start + UPLOAD_CHUNK_BYTES) });
  return pieces;
}
