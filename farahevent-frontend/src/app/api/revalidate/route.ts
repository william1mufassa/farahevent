import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Invalidation ISR à la demande. Le backend FastAPI appelle cet endpoint
 * après chaque sauvegarde CMS : POST { "tag": "event:<slug>" }
 * avec le header X-Revalidate-Secret partagé (env REVALIDATE_SECRET).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || request.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let tag: unknown;
  try {
    ({ tag } = (await request.json()) as { tag?: unknown });
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON body' }, { status: 400 });
  }

  if (typeof tag !== 'string' || tag.length === 0 || tag.length > 200) {
    return NextResponse.json({ ok: false, error: 'tag requis' }, { status: 400 });
  }

  revalidateTag(tag);
  return NextResponse.json({ ok: true, tag });
}
