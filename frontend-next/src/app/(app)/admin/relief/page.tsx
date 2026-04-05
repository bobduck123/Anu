'use client';

import { useEffect, useState } from 'react';
import ReliefQueueTable from '@/components/admin/ReliefQueueTable';
import { reliefApi, type ReliefCouncil, type ReliefCouncilMember, type ReliefRequestRecord } from '@/lib/api/endpoints';
import { AlertCircle, Loader2, Users, Plus } from 'lucide-react';

export default function AdminReliefPage() {
  const [queue, setQueue] = useState<ReliefRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [councils, setCouncils] = useState<ReliefCouncil[]>([]);
  const [members, setMembers] = useState<ReliefCouncilMember[]>([]);
  const [selectedCouncil, setSelectedCouncil] = useState<number | null>(null);
  const [newMemberId, setNewMemberId] = useState('');

  const loadQueue = () => {
    reliefApi
      .queue()
      .then(setQueue)
      .catch((err) => setError(err.message || 'Failed to load queue'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQueue();
    reliefApi.councils().then(setCouncils).catch(() => null);
  }, []);

  const onVote = async (id: number, vote: 'approve' | 'reject') => {
    try {
      await reliefApi.vote(id, vote);
      loadQueue();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Vote failed';
      setError(message);
    }
  };

  const loadMembers = async (councilId: number) => {
    setSelectedCouncil(councilId);
    const data = await reliefApi.councilMembers(councilId);
    setMembers(data);
  };

  const addMember = async () => {
    if (!selectedCouncil || !newMemberId) return;
    await reliefApi.addCouncilMember(selectedCouncil, Number(newMemberId));
    setNewMemberId('');
    loadMembers(selectedCouncil);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-28 pb-20">
        {/* Header */}
        <div className="mb-10">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] mb-3">
            <AlertCircle className="w-4 h-4" />
            Administration
          </span>
          <h1
            className="text-3xl md:text-4xl font-semibold text-[var(--color-earth-dark)] mb-3"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Relief Console
          </h1>
          <p className="text-[var(--color-earth-medium)]">
            Micro-council queue with caps and escalation policies.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[var(--color-danger-light)] border border-[var(--color-danger)] mb-6">
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          </div>
        )}

        {/* Queue Table */}
        <section className="mb-10">
          <h2
            className="text-xl font-semibold text-[var(--color-earth-dark)] mb-4"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Request Queue
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-institutional)]" />
            </div>
          ) : (
            <ReliefQueueTable items={queue} onVote={onVote} />
          )}
        </section>

        {/* Micro-Councils */}
        <section>
          <div className="card-civic">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-[var(--color-institutional)]" />
              <h2
                className="text-lg font-semibold text-[var(--color-earth-dark)]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Micro-Councils
              </h2>
            </div>

            {/* Council buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {councils.map((c) => (
                <button
                  key={c.id}
                  onClick={() => loadMembers(c.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCouncil === c.id
                      ? 'text-[var(--color-foreground)]'
                      : 'border border-[var(--color-border)] text-[var(--color-earth-dark)] hover:bg-[var(--color-muted)]'
                  }`}
                  style={
                    selectedCouncil === c.id
                      ? { backgroundColor: 'var(--color-institutional)' }
                      : undefined
                  }
                >
                  {c.name}
                  <span className="ml-1.5 text-xs opacity-70">(Q{c.quorum})</span>
                </button>
              ))}
              {!councils.length && (
                <p className="text-sm text-[var(--color-earth-medium)]">No councils configured.</p>
              )}
            </div>

            {/* Council members */}
            {selectedCouncil && (
              <div className="pt-4 border-t border-[var(--color-border)] space-y-3">
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-earth-dark)] font-mono-data focus:outline-none focus:ring-2 focus:ring-[var(--color-institutional)] transition-shadow"
                    placeholder="User ID"
                    value={newMemberId}
                    onChange={(e) => setNewMemberId(e.target.value)}
                  />
                  <button
                    onClick={addMember}
                    className="btn-pill btn-pill-primary text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </button>
                </div>
                <div className="text-sm text-[var(--color-earth-medium)]">
                  <span className="font-medium">Members:</span>{' '}
                  {members.length > 0
                    ? members.map((m) => m.username || m.user_id).join(', ')
                    : 'None assigned'}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
