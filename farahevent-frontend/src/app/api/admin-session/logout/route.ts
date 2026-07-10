import { NextResponse, type NextRequest } from 'next/server';
import { clearSessionCookies, isCrossOrigin } from '@/lib/security/session';

export const dynamic = 'force-dynamic';

/** Déconnexion admin (BFF) : efface les cookies de session. */
export async function POST(request: NextRequest) {
  if (isCrossOrigin(request)) {
    return NextResponse.json({ detail: 'Origine non autorisée' }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  return res;
}
