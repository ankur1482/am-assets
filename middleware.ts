import { NextRequest, NextResponse } from 'next/server';

const PRIMARY_HOST = 'gupta.vercel.app';
const LEGACY_HOSTS = new Set(['am-assets.vercel.app']);

export function middleware(req: NextRequest) {
  const host = req.headers.get('host')?.split(':')[0].toLowerCase();
  if (host && LEGACY_HOSTS.has(host)) {
    const url = req.nextUrl.clone();
    url.protocol = 'https:';
    url.host = PRIMARY_HOST;
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}
