import { getCoreApiBase } from '@/lib/runtime';
import { getParticipantAuthHeaders } from '@/lib/api/client';

export async function downloadICS(start?: string, end?: string) {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  const apiBase = getCoreApiBase();
  const authHeaders = await getParticipantAuthHeaders({ allowLegacyTokenFallback: false });
  const res = await fetch(`${apiBase}/api/calendar/export.ics?${params}`, {
    headers: authHeaders,
  });
  if (!res.ok) throw new Error('Failed to export calendar');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'calendar.ics';
  a.click();
  URL.revokeObjectURL(url);
}
