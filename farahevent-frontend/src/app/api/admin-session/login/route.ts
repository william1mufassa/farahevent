import { NextResponse, type NextRequest } from 'next/server';
import {
  API_URL,
  isCrossOrigin,
  setSessionCookies,
} from '@/lib/security/session';

export const dynamic = 'force-dynamic';

/**
 * Connexion admin (BFF). Relaye email/mot de passe (+ OTP éventuel) vers
 * FastAPI, pose les jetons en cookies httpOnly et ne renvoie au client que
 * le profil. Le statut 202 (2FA requis) est transmis tel quel.
 */
export async function POST(request: NextRequest) {
  if (isCrossOrigin(request)) {
    return NextResponse.json({ detail: 'Origine non autorisée' }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Corps JSON invalide' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ detail: 'Backend indisponible' }, { status: 502 });
  }

  const body = await upstream.json().catch(() => ({}));

  // 202 = 2FA attendu ; erreurs = transmises sans cookie.
  if (!upstream.ok || upstream.status === 202) {
    return NextResponse.json(body, { status: upstream.status });
  }

  const { access_token, refresh_token, admin } = body as {
    access_token?: string;
    refresh_token?: string;
    admin?: unknown;
  };
  if (!access_token || !refresh_token) {
    return NextResponse.json({ detail: 'Réponse backend inattendue' }, { status: 502 });
  }

  const res = NextResponse.json({ admin });
  setSessionCookies(res, request, { access_token, refresh_token });
  return res;
}
