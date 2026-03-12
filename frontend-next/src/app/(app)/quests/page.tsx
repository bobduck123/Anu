'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Compass, PlayCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  QuestInstance,
  QuestTemplate,
  fetchQuestTemplates,
  listMyQuests,
  startQuest,
  updateQuestProgress,
} from '@/lib/api/culturalIntelligence';

export default function QuestsPage() {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<QuestTemplate[]>([]);
  const [quests, setQuests] = useState<QuestInstance[]>([]);
  const [draftProgress, setDraftProgress] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const templateRows = await fetchQuestTemplates();
      setTemplates(templateRows);
      if (isAuthenticated) {
        const questRows = await listMyQuests();
        setQuests(questRows);
      } else {
        setQuests([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quests');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const activeQuests = useMemo(
    () => quests.filter((quest) => quest.status === 'active'),
    [quests],
  );

  async function handleStart(templateId: number) {
    try {
      const quest = await startQuest(templateId);
      setQuests((prev) => [quest, ...prev.filter((item) => item.id !== quest.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start quest');
    }
  }

  async function handleProgress(questId: number, progress: number) {
    try {
      const updated = await updateQuestProgress(questId, progress);
      setQuests((prev) => prev.map((item) => (item.id === questId ? { ...item, ...updated } : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update progress');
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Quests</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Triggered by intelligence clusters and linked to commitments.
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm text-[var(--color-primary-foreground)]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
        {!isAuthenticated && (
          <p className="mt-2 text-sm text-amber-700">
            Login required to start quests and track progress.
          </p>
        )}
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.25fr,1fr]">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="text-lg font-semibold">Available Quest Templates</h2>
          {loading ? (
            <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">Loading templates...</p>
          ) : (
            <div className="mt-3 space-y-3">
              {templates.map((template) => (
                <article key={template.id} className="rounded-lg border border-[var(--color-border)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{template.title}</p>
                    <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
                      reward {template.reward_points}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{template.description || 'No description.'}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--color-muted-foreground)]">
                    <span className="inline-flex items-center gap-1"><Compass className="h-3.5 w-3.5" />{template.trigger_event_type || 'any event'}</span>
                    <span>{template.trigger_entity_type || 'any entity'}</span>
                    <span>cluster {'>='} {template.min_cluster_score.toFixed(2)}</span>
                  </div>
                  <button
                    disabled={!isAuthenticated}
                    onClick={() => handleStart(template.id)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Start Quest
                  </button>
                </article>
              ))}
              {templates.length < 1 && <p className="text-sm text-[var(--color-muted-foreground)]">No active quest templates.</p>}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="text-lg font-semibold">My Quests</h2>
          {loading ? (
            <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">Loading quests...</p>
          ) : (
            <div className="mt-3 space-y-3">
              {activeQuests.map((quest) => (
                <article key={quest.id} className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="text-sm font-semibold">{quest.template?.title || `Quest #${quest.id}`}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    progress {quest.progress_percent.toFixed(0)}% · status {quest.status}
                  </p>
                  <div className="mt-2 space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={draftProgress[quest.id] ?? quest.progress_percent}
                      onChange={(event) =>
                        setDraftProgress((prev) => ({
                          ...prev,
                          [quest.id]: Number(event.target.value),
                        }))
                      }
                      className="w-full"
                    />
                    <button
                      onClick={() => handleProgress(quest.id, draftProgress[quest.id] ?? quest.progress_percent)}
                      className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs"
                    >
                      Save Progress
                    </button>
                    <button
                      onClick={() => handleProgress(quest.id, 100)}
                      className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark Complete
                    </button>
                  </div>
                </article>
              ))}
              {activeQuests.length < 1 && <p className="text-sm text-[var(--color-muted-foreground)]">No active quests yet.</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
