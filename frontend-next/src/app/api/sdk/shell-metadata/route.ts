import { NextResponse } from 'next/server';
import { buildShellMetadata } from '@/ui-system/shell/shellMetadata';

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: buildShellMetadata(),
  });
}
