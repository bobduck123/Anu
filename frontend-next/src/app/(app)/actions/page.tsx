'use client';

import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';
import { motion } from 'framer-motion';
import { api, Action } from '@/lib/api';
import { getCoreApiBase } from '@/lib/runtime';
import { Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import ViewToggle, { ViewMode } from '@/components/shared/ViewToggle';
import dynamicImport from 'next/dynamic';
import { BentoGrid, BentoHero, BentoStat, BentoStyles } from '@/ui/patterns/chromatic-bento';

const MapView = dynamicImport(() => import('@/components/shared/MapView'), { ssr: false });
const CalendarView = dynamicImport(() => import('@/components/shared/CalendarView'), { ssr: false });
const CreateActionModal = dynamicImport(() => import('@/components/shared/CreateActionModal'), { ssr: false });

export default function ActionsPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [filteredActions, setFilteredActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'online' | 'local'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const getBadge = (action: Action) => {
    if (action.trendLabel) return action.trendLabel;
    const end = action.endDate ? new Date(action.endDate) : null;
    if (end) {
      const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 3) return 'Closing Soon';
    }
    const start = action.startDate ? new Date(action.startDate) : null;
    if (start) {
      const daysSince = Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince <= 7) return 'New';
    }
    return 'Trending';
  };

  useEffect(() => {
    loadActions();
    // Check organizer status
    try {
      const applied = localStorage.getItem('organizer_applied') === 'true';
      setIsOrganizer(applied);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let filtered = actions;
    if (filter === 'online') {
      filtered = actions.filter(action => action.isOnline);
    } else if (filter === 'local') {
      filtered = actions.filter(action => !action.isOnline && !action.isGlobal);
    }
    setFilteredActions(filtered);
  }, [actions, filter]);

  const loadActions = async () => {
    try {
      const data = await api.actions.getAll();
      setActions(data);
    } catch (error) {
      console.error('Failed to load actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (actionId: string) => {
    try {
      await api.actions.complete(actionId);
      await loadActions();
      setNotice('Action completed. Your progress was recorded.');
    } catch (error) {
      console.error('Failed to complete action:', error);
      setNotice('Could not complete action. Please try again.');
    }
  };

  const handleAddToTodo = async (action: Action) => {
    try {
      await api.todos.addAction(action._id, action.title);
      setNotice('Added to your todo list.');
    } catch (error) {
      console.error('Failed to add to todo:', error);
      setNotice('Could not add to todo. Please try again.');
    }
  };

  const handleCreateAction = async (formData: FormData) => {
    const API_BASE = getCoreApiBase();
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`${API_BASE}/api/actions`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to create action');
    await loadActions();
  };

  const mapMarkers = filteredActions
    .filter(a => a.location?.coordinates)
    .map(a => ({
      id: a._id,
      lat: a.location!.coordinates[1],
      lng: a.location!.coordinates[0],
      title: a.title,
      popup: `<strong>${a.title}</strong><br/>${a.pointsAssigned} points<br/>${a.completions} completions`,
      color: 'sage' as const,
    }));

  const calendarEvents = filteredActions.map(a => ({
    id: a._id,
    title: `${a.title} (${a.pointsAssigned}pts)`,
    start: new Date(a.startDate),
    end: new Date(a.endDate),
    color: 'var(--color-sage)',
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-sage)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <BentoStyles />
        <BentoGrid columns={12} rowHeight={80} gap={12} className="mb-8">
          <BentoHero
            title="Community Actions"
            subtitle="Join environmental and community initiatives"
            metric={String(filteredActions.length)}
            metricLabel="actions available"
            colSpan={8}
            rowSpan={2}
          />
          <BentoStat
            label="Total Points"
            value={filteredActions.reduce((sum, a) => sum + (a.pointsAssigned || 0), 0).toLocaleString()}
            colSpan={4}
            rowSpan={1}
            stagger={1}
          />
          <BentoStat
            label="Completions"
            value={filteredActions.reduce((sum, a) => sum + (a.completions || 0), 0).toLocaleString()}
            colSpan={4}
            rowSpan={1}
            stagger={2}
          />
        </BentoGrid>

        {notice && (
          <div className="mb-6 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] text-sm">
            {notice}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex gap-3">
            {(['all', 'online', 'local'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`btn-pill text-sm ${
                  filter === type ? 'btn-pill-sage' : 'btn-pill-outline'
                }`}
              >
                {type === 'all' ? 'All Actions' : type === 'online' ? 'Online' : 'Local'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <ViewToggle current={viewMode} onChange={setViewMode} />
            {isOrganizer && (
              <button onClick={() => setShowCreate(true)} className="btn-pill btn-pill-sage flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create Action
              </button>
            )}
          </div>
        </div>

        {/* Views */}
        {viewMode === 'map' && (
          <div className="mb-8">
            <MapView markers={mapMarkers} height="500px" />
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className="mb-8 card-civic">
            <CalendarView events={calendarEvents} height="600px" />
          </div>
        )}

        {viewMode === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredActions.map((action, index) => (
              <motion.div
                key={action._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="card-civic overflow-hidden"
              >
                {action.actionTile && (
                  <Image
                    src={action.actionTile}
                    alt={action.title}
                    width={640}
                    height={320}
                    unoptimized
                    className="w-full h-48 object-cover -mt-6 -mx-6 mb-4"
                    style={{ width: 'calc(100% + 3rem)' }}
                  />
                )}
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                  {action.title}
                </h3>
                <p className="text-[var(--color-muted-foreground)] mb-4 line-clamp-3 text-sm">
                  {action.details}
                </p>

                <div className="flex items-center justify-between mb-4 text-sm">
                  <span className="font-mono-data text-[var(--color-sage)] font-semibold">
                    {action.pointsAssigned} pts
                  </span>
                  <span className="text-[var(--color-muted-foreground)] font-mono-data">
                    {action.completions} done
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {action.isOnline && (
                    <span className="px-2 py-0.5 bg-[var(--color-institutional-light)] text-[var(--color-institutional)] rounded-full text-xs">
                      Online
                    </span>
                  )}
                  {action.isGlobal && (
                    <span className="px-2 py-0.5 bg-[var(--color-sage-light)] text-[var(--color-forest)] rounded-full text-xs">
                      Global
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-[var(--color-accent-light)] text-[var(--color-accent)] rounded-full text-xs">
                    {getBadge(action)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/actions/${action._id}`}
                    className="btn-pill btn-pill-outline text-sm flex-1 text-center"
                  >
                    Details
                  </Link>
                  <button
                    onClick={() => handleComplete(action._id)}
                    className="btn-pill btn-pill-sage text-sm flex-1"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => handleAddToTodo(action)}
                    className="btn-pill btn-pill-outline text-sm"
                  >
                    + Todo
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {filteredActions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--color-muted-foreground)] text-lg">No actions found</p>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateActionModal onClose={() => setShowCreate(false)} onSubmit={handleCreateAction} />
      )}
    </div>
  );
}
