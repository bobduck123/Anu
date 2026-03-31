import { NextResponse } from 'next/server';
import { ANU_PRIMITIVE_MANIFEST, getPrimitiveAdoptionSummary } from '@/ui-system/anu/primitiveManifest';

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      manifest: ANU_PRIMITIVE_MANIFEST,
      adoption: getPrimitiveAdoptionSummary(),
    },
  });
}
