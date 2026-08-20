import { readOAuthCredential } from '@/lib/oauthCredentials';

export type KotakCredential = { token: string; baseUrl: string };

// Kotak Neo requires a fresh access token minted with your MPIN roughly once
// a day -- rather than storing that MPIN server-side (a credential that can
// also place real trades), the user pastes today's already-generated token
// here manually. See app/api/kotak/status/route.ts for save/read/clear.
export async function getKotakCredential(userId: string): Promise<KotakCredential | null> {
  const cred = await readOAuthCredential<KotakCredential>(userId, 'kotak');
  if (!cred?.token || !cred?.baseUrl) return null;
  return cred;
}
