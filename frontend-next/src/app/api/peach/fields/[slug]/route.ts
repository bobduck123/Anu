import { NextResponse } from 'next/server';
import { getPeachFieldBySlug, toPublicPeachFieldResponse } from '@/lib/peach/readModel';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const field = getPeachFieldBySlug(slug);

  if (!field) {
    return NextResponse.json(
      { ok: false, error: { code: 'not_found', message: 'PEACH Field not found.' } },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(
    { ok: true, data: toPublicPeachFieldResponse(field) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
