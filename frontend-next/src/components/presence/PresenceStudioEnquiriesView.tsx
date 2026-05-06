'use client';

import { useEffect, useState } from 'react';
import { Inbox, UserRound } from 'lucide-react';
import { AnuChip, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { LoadingState } from '@/ui-system/states/LoadingState';
import {
  getOwnerPresenceNodeEnquiries,
  getOwnerPresenceNodes,
  updateOwnerPresenceEnquiry,
  type PresenceEnquiry,
  type PresenceNode,
} from '@/lib/api/presence';
import { describeOwnerPresenceError } from './presenceStudioOwnerUtils';

const ENQUIRY_STATUSES = ['new', 'read', 'replied', 'converted', 'archived', 'spam'];

function excerpt(value: string | null | undefined, max = 220) {
  const plain = (value || '').replace(/\s+/g, ' ').trim();
  if (!plain) return '';
  return plain.length > max ? `${plain.slice(0, max).trim()}...` : plain;
}

function labelize(value: string | null | undefined, fallback = 'not provided') {
  return value && value.trim() ? value.replace(/_/g, ' ') : fallback;
}

export function PresenceStudioEnquiriesView() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [node, setNode] = useState<PresenceNode | null>(null);
  const [enquiries, setEnquiries] = useState<PresenceEnquiry[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const nodes = await getOwnerPresenceNodes();
        const primary = Array.isArray(nodes) ? nodes[0] : null;
        if (!active) return;
        if (!primary) {
          setNode(null);
          setEnquiries([]);
          return;
        }
        const rows = await getOwnerPresenceNodeEnquiries(primary.id);
        if (!active) return;
        setNode(primary);
        setEnquiries(Array.isArray(rows) ? rows : []);
      } catch (loadError) {
        if (!active) return;
        setNode(null);
        setEnquiries([]);
        setError(loadError);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const setStatus = async (enquiry: PresenceEnquiry, status: string) => {
    setSavingId(enquiry.id);
    setMessage('');
    try {
      const updated = await updateOwnerPresenceEnquiry(enquiry.id, status);
      setEnquiries((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      setMessage('Enquiry status updated.');
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <LoadingState message="Loading enquiries..." />
      </AnuSurfacePanel>
    );
  }

  if (error) {
    const errorState = describeOwnerPresenceError(error);
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/64">Enquiries</p>
        <h1 className="mt-3 text-2xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
          {errorState.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">{errorState.description}</p>
      </AnuSurfacePanel>
    );
  }

  if (!node) {
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <EmptyState icon={UserRound} title="No Presence node available" description="This owner account does not have a Presence node attached yet, so there are no enquiries to show." />
      </AnuSurfacePanel>
    );
  }

  return (
    <div className="space-y-4">
      <AnuSurfacePanel tone="soft" className="p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/68">Enquiries</p>
            <h1 className="mt-3 text-3xl text-[#fff7f2] md:text-[2.5rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Owner inbox
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.86)] md:text-base">
              Public portfolio enquiries arrive here with enough context to follow up without turning Presence into a full CRM.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AnuChip tone="accent">{node.display_name}</AnuChip>
            <AnuChip tone="muted">{enquiries.length} enquiries</AnuChip>
          </div>
        </div>
      </AnuSurfacePanel>

      {message ? <p className="rounded-2xl border border-emerald-200/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}

      {enquiries.length === 0 ? (
        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <EmptyState icon={Inbox} title="No enquiries yet" description="When someone contacts this public Presence page, the owner-safe enquiry record will appear here." />
        </AnuSurfacePanel>
      ) : (
        <div className="grid gap-4">
          {enquiries.map((enquiry) => (
            <AnuSurfacePanel key={enquiry.id} tone="quiet" className="p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <AnuChip tone="accent">{labelize(enquiry.status, 'new')}</AnuChip>
                    <AnuChip tone="muted">{labelize(enquiry.enquiry_type, 'general')}</AnuChip>
                    {enquiry.source_type ? <AnuChip tone="muted">{labelize(enquiry.source_type)}</AnuChip> : null}
                  </div>
                  <h2 className="mt-4 text-xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                    {enquiry.name}
                  </h2>
                  <p className="mt-1 text-sm text-[#f6d4cb]/76">
                    {enquiry.email}
                    {enquiry.phone ? ` - ${enquiry.phone}` : ''}
                  </p>
                  {[enquiry.company, enquiry.role_title].filter(Boolean).length ? (
                    <p className="mt-1 text-sm text-[#f6d4cb]/66">{[enquiry.company, enquiry.role_title].filter(Boolean).join(' - ')}</p>
                  ) : null}
                </div>
                <label className="space-y-2 text-sm text-[#f6d4cb]/76">
                  Status
                  <select
                    value={enquiry.status}
                    disabled={savingId === enquiry.id}
                    onChange={(event) => void setStatus(enquiry, event.target.value)}
                    className="block rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white"
                  >
                    {ENQUIRY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[color:rgba(246,212,203,0.86)]">{excerpt(enquiry.message) || 'No message provided.'}</p>
              <div className="mt-4 grid gap-2 text-xs text-[#f6d4cb]/58 sm:grid-cols-2 lg:grid-cols-4">
                <span>Budget: {labelize(enquiry.budget_range)}</span>
                <span>Timeline: {labelize(enquiry.timeline)}</span>
                <span>Project: {labelize(enquiry.project_type)}</span>
                <span>Created: {enquiry.created_at ? new Date(enquiry.created_at).toLocaleString() : 'unknown'}</span>
              </div>
              <p className="mt-3 break-all text-xs text-[#f6d4cb]/48">
                Source: {enquiry.source_url || enquiry.source_type || 'not provided'}
                {enquiry.source_tag_id ? ` / tag ${enquiry.source_tag_id}` : ''}
              </p>
            </AnuSurfacePanel>
          ))}
        </div>
      )}
    </div>
  );
}
