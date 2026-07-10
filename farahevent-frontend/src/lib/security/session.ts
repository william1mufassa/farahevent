import type { NextRequest, NextResponse } from 'next/server';

/**
 * Session admin en cookies httpOnly (audit §07 — les jetons ne transitent
 * jamais par le JS client). Posés/lus uniquement par les route handlers
 * (/api/admin-session/*, /api/proxy/*) qui servent de BFF devant FastAPI.
 */

export const ACCESS_COOKIE = 'fe_access';
export const REFRESH_COOKIE = 'fe_refresh';

/** Origine de l'API FastAPI, côté serveur uniquement. */
export const API_URL =
  process.env.ADMIN_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

interface Tokens {
  access_token: string;
  refresh_token: string;
}

/** `secure` suit le protocole réel : requis en https, toléré en dev http. */
function isSecure(req: NextRequest): boolean {
  return req.nextUrl.protocol === 'https:';
}

export function setSessionCookies(res: NextResponse, req: NextRequest, tokens: Tokens): void {
  const base = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isSecure(req),
    path: '/',
  };
  // Durées indicatives — l'expiration réelle est celle des JWT (backend).
  res.cookies.set(ACCESS_COOKIE, tokens.access_token, { ...base, maxAge: 60 * 30 });
  res.cookies.set(REFRESH_COOKIE, tokens.refresh_token, { ...base, maxAge: 60 * 60 * 24 * 7 });
}

export function clearSessionCookies(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/**
 * Garde anti-CSRF pour les méthodes mutantes : les cookies SameSite=Lax ne
 * partent déjà pas sur les requêtes cross-site, ceci ajoute une défense en
 * profondeur si un Origin étranger se présente quand même.
 */
export function isCrossOrigin(req: NextRequest): boolean {
  if (req.method === 'GET' || req.method === 'HEAD') return false;
  const origin = req.headers.get('origin');
  return origin !== null && origin !== req.nextUrl.origin;
}
