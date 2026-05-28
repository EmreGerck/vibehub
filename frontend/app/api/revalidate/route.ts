import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * On-demand revalidation endpoint.
 *
 * Backend calls this when products/stores/categories change so the cached
 * Next.js pages refresh immediately instead of waiting for the next
 * scheduled revalidate (1hr for sitemap, 60s for product pages).
 *
 * Auth: shared secret query param. Backend env: FRONTEND_REVALIDATE_SECRET.
 * Frontend env:                                 REVALIDATE_SECRET.
 *
 * Usage:
 *   POST /api/revalidate?secret=XXX&paths=/product/abc,/sitemap.xml
 */
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  const expected = process.env.REVALIDATE_SECRET;

  if (!expected) {
    // No secret configured — refuse to run (fail-closed). Otherwise anyone
    // could trigger arbitrary revalidation.
    return NextResponse.json({ ok: false, error: 'revalidate not configured' }, { status: 503 });
  }
  if (!secret || secret !== expected) {
    return NextResponse.json({ ok: false, error: 'invalid secret' }, { status: 401 });
  }

  const pathsParam = req.nextUrl.searchParams.get('paths') ?? '';
  const paths = pathsParam.split(',').map((p) => p.trim()).filter(Boolean);

  if (paths.length === 0) {
    return NextResponse.json({ ok: false, error: 'no paths provided' }, { status: 400 });
  }

  const results: { path: string; ok: boolean; error?: string }[] = [];
  for (const path of paths) {
    try {
      revalidatePath(path);
      results.push({ path, ok: true });
    } catch (err: any) {
      results.push({ path, ok: false, error: err?.message ?? 'revalidate failed' });
    }
  }

  return NextResponse.json({ ok: true, revalidated: results });
}
