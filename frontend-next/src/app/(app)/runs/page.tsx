'use client';

// Redirect /runs to /cost-lowering (runs listing is in cost-lowering page)
import { redirect } from 'next/navigation';

export default function RunsPage() {
  redirect('/cost-lowering');
}
