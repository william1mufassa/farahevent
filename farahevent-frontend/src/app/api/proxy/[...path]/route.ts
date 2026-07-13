import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_COOKIE,
  API_URL,
  REFRESH_COOKIE,
  clearSessionCookies,
  isCrossOrigin,
  setSessionCookies,
} from '@/lib/security/session';

export const dynamic = 'force-dynamic';

/**
 * Proxy authentifié des appels admin (BFF, audit §07). Le navigateur ne voit
 * jamais les JWT : le proxy lit le cookie httpOnly, ajoute le Bearer côté
 * serveur, rafraîchit silencieusement sur 401 et repose les cookies.
 * /api/proxy/admin/events/ → {API_URL}/admin/events/
 */
async function handler(request: NextRequest) {
  if (isCrossOrigin(request)) {
    return NextResponse.json({ detail: 'Origine non autorisée' }, { status: 403 });
  }

  // Chemin relatif exact (slash final compris — FastAPI y est sensible).
  const upstreamPath = request.nextUrl.pathname.replace(/^\/api\/proxy\//, '');
  const url = `${API_URL}/${upstreamPath}${request.nextUrl.search}`;

  const access = request.cookies.get(ACCESS_COOKIE)?.value ?? null;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value ?? null;
  if (!access && !refresh) {
    return NextResponse.json({ detail: 'Non authentifié' }, { status: 401 });
  }

  // Corps bufferisé une seule fois : réutilisé si retry après refresh.
  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.arrayBuffer();
  const contentType = request.headers.get('content-type');

  const forward = async (token: string | null): Promise<Response> => {
    const headers = new Headers();
    if (contentType) headers.set('content-type', contentType);
    if (token) headers.set('authorization', `Bearer ${token}`);
    return fetch(url, { method: request.method, headers, body, cache: 'no-store' });
  };

  const toResponse = async (upstream: Response): Promise<NextResponse> => {
    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  };

  try {
    let upstream = await forward(access);

    // Rafraîchit si le backend rejette le jeton (401) OU si l'access a expiré côté
    // navigateur (cookie tombé → aucun Bearer transmis → 403 HTTPBearer), dès qu'un
    // refresh token subsiste. Sans le cas 403+!access, toute session cassait à 30 min.
    const shouldRefresh =
      !!refresh && (upstream.status === 401 || (upstream.status === 403 && !access));
    if (shouldRefresh) {
      const refreshRes = await fetch(`${API_URL}/admin/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
        cache: 'no-store',
      });

      if (refreshRes.ok) {
        const tokens = (await refreshRes.json()) as {
          access_token: string;
          refresh_token: string;
        };
        upstream = await forward(tokens.access_token);
        const res = await toResponse(upstream);
        setSessionCookies(res, request, tokens);
        return res;
      }

      const res = await toResponse(upstream); // 401 d'origine
      clearSessionCookies(res);
      return res;
    }

    return toResponse(upstream);
  } catch {
    return NextResponse.json({ detail: 'Backend indisponible' }, { status: 502 });
  }
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
