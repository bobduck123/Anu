import { NextResponse } from 'next/server';
import { getActivePeachFieldResponse } from '@/lib/peach/readModel';

export async function GET() {
  return NextResponse.json(
    { ok: true, data: getActivePeachFieldResponse() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
