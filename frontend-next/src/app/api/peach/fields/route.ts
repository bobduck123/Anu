import { NextResponse } from 'next/server';
import { listPeachFields, toPublicPeachFieldResponse } from '@/lib/peach/readModel';

export async function GET() {
  return NextResponse.json(
    { ok: true, data: listPeachFields().map(toPublicPeachFieldResponse) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
