import { readOAuthCredential } from '@/lib/oauthCredentials';

export type KotakCredential = { token: string; baseUrl: string };

// Kotak Neo requires a fresh access token minted with your MPIN roughly once
// a day -- rather than storing that MPIN server-side (a credential that can
// also place real trades), the user pastes today's already-generated token
// here manually. See app/api/kotak/status/route.ts for save/read/clear.
export async function getKotakCredential(userId?: string): Promise<KotakCredential | null> {
  if (userId) {
    const cred = await readOAuthCredential<KotakCredential>(userId, 'kotak');
    if (cred?.token && cred?.baseUrl) return cred;
  }
  // Local/dev convenience: fall back to a shared env-var token if nothing is
  // saved for this user (mirrors the pattern lib/upstox.ts used to use for
  // UPSTOX_ACCESS_TOKEN). Not meant for production multi-user use.
  const token = process.env.KOTAK_ACCESS_TOKEN?.trim();
  const baseUrl = process.env.KOTAK_BASE_URL?.trim().replace(/\/+$/, '');
  if (token && baseUrl) return { token, baseUrl };
  return null;
}
