import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // This route can be requested by Next Link prefetch/RSC navigation. Reads
  // must never destroy an authenticated owner session.
  return NextResponse.redirect(new URL("/", request.url));
}
