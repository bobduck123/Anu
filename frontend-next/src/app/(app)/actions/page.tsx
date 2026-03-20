'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import dynamicImport from 'next/dynamic';
import { Plus } from 'lucide-react';
import ViewToggle, { ViewMode } from '@/components/shared/ViewToggle';
import { api, Action } from '@/lib/api';
import { getCoreApiBase } from '@/lib/runtime';
import { BentoGrid, BentoHero, BentoStat, BentoStyles } from '@/ui/patterns/chromatic-bento';
import styles from './ActionsFloating.module.css';

export const dynamic = 'force-dynamic';

const MapView = dynamicImport(() => import('@/components/shared/MapView'), { ssr: false });
const CalendarView = dynamicImport(() => import('@/components/shared/CalendarView'), { ssr: false });
const CreateActionModal = dynamicImport(() => import('@/components/shared/CreateActionModal'), { ssr: false });

type ActionPanel = 'overview' | 'workspace' | 'board';

const PANEL_ORDER: ActionPanel[] = ['overview', 'workspace', 'board'];

export default function ActionsPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [filteredActions, setFilteredActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'online' | 'local'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [panel, setPanel] = useState<ActionPanel>('overview');
  const [activePanelIndex, setActivePanelIndex] = useState(0);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);

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

  const loadActions = useCallback(async () => {
    try {
      const data = await api.actions.getAll();
      setActions(data);
    } catch (error) {
      console.error('Failed to load actions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActions();
    try {
      const applied = localStorage.getItem('organizer_applied') === 'true';
      setIsOrganizer(applied);
    } catch {
      // ignore storage errors
    }
  }, [loadActions]);

  useEffect(() => {
    let filtered = actions;
    if (filter === 'online') {
      filtered = actions.filter((action) => action.isOnline);
    } else if (filter === 'local') {
      filtered = actions.filter((action) => !action.isOnline && !action.isGlobal);
    }
    setFilteredActions(filtered);
  }, [actions, filter]);

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
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to create action');
    await loadActions();
  };

  const snapToPanel = useCallback((nextPanel: ActionPanel) => {
    setPanel(nextPanel);
    const index = PANEL_ORDER.indexOf(nextPanel);
    if (index < 0) return;

    setActivePanelIndex(index);

    const viewport = viewportRef.current;
    const section = sectionRefs.current[index];
    if (!viewport || !section) return;

    viewport.scrollTo({ top: section.offsetTop, behavior: 'smooth' });
  }, []);

  const handleViewportScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const focusY = viewport.scrollTop + viewport.clientHeight / 2;
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    sectionRefs.current.forEach((section, index) => {
      if (!section) return;
      const sectionCenter = section.offsetTop + section.clientHeight / 2;
      const distance = Math.abs(sectionCenter - focusY);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    });

    if (nearest !== activePanelIndex) {
      setActivePanelIndex(nearest);
      setPanel(PANEL_ORDER[nearest] ?? 'overview');
    }
  }, [activePanelIndex]);

  const mapMarkers = filteredActions
    .filter((action) => action.location?.coordinates)
    .map((action) => ({
      id: action._id,
      lat: action.location!.coordinates[1],
      lng: action.location!.coordinates[0],
      title: action.title,
      popup: `<strong>${action.title}</strong><br/>${action.pointsAssigned} points<br/>${action.completions} completions`,
      color: 'sage' as const,
    }));

  const calendarEvents = filteredActions.map((action) => ({
    id: action._id,
    title: `${action.title} (${action.pointsAssigned}pts)`,
    start: new Date(action.startDate),
    end: new Date(action.endDate),
    color: 'var(--color-sage)',
  }));

  const totalPoints = filteredActions.reduce((sum, action) => sum + (action.pointsAssigned || 0), 0);
  const totalCompletions = filteredActions.reduce((sum, action) => sum + (action.completions || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--color-sage)]" />
      </div>
    );
  }

  const renderActionCard = (action: Action, index: number, animated = false) => {
    const cardContent = (
      <div className={styles.actionCard}>
        {action.actionTile && (
          <Image
            src={action.actionTile}
            alt={action.title}
            width={640}
            height={320}
            unoptimized
            className="mb-4 h-44 w-full rounded-xl object-cover"
          />
        )}

        <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-serif)' }}>
          {action.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm text-white/78">{action.details}</p>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="font-mono-data font-semibold text-[var(--color-beacon)]">{action.pointsAssigned} pts</span>
          <span className="font-mono-data text-white/65">{action.completions} done</span>
        </div>

        <div className={styles.actionMeta}>
          {action.isOnline && <span>Online</span>}
          {action.isGlobal && <span>Global</span>}
          <span>{getBadge(action)}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/actions/${action._id}`} className="btn-pill btn-pill-outline text-sm">
            Details
          </Link>
          <button type="button" onClick={() => handleComplete(action._id)} className="btn-pill btn-pill-sage text-sm">
            Complete
          </button>
          <button type="button" onClick={() => handleAddToTodo(action)} className="btn-pill btn-pill-outline text-sm">
            + Todo
          </button>
        </div>
      </div>
    );

    if (!animated) return <div key={action._id}>{cardContent}</div>;

    return (
      <motion.div
        key={action._id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: index * 0.04 }}
      >
        {cardContent}
      </motion.div>
    );
  };

  return (
    <div className={styles.pageRoot}>
      <section className={styles.surface} aria-label="Actions coordination surface">
        <header className={styles.header}>
          <div>
            <h1 className={styles.heading}>Community Actions</h1>
            <p className={styles.subhead}>
              Coordinate campaigns, see where momentum is happening, and move from planning to completion through one floating snap tile.
            </p>
            <div className={styles.metrics}>
              <span>{filteredActions.length} actions live</span>
              <span>{totalPoints.toLocaleString()} points</span>
              <span>{totalCompletions.toLocaleString()} completions</span>
              <span>{filter} filter</span>
            </div>
          </div>
        </header>

        <div className={styles.shell}>
          <nav className={styles.panelRail} aria-label="Action surface sections">
            {PANEL_ORDER.map((nextPanel) => {
              const active = panel === nextPanel;
              return (
                <button
                  key={nextPanel}
                  type="button"
                  onClick={() => snapToPanel(nextPanel)}
                  className={`${styles.panelButton} ${active ? styles.panelButtonActive : ''}`}
                >
                  {nextPanel}
                </button>
              );
            })}

            <div className={styles.indicatorRow} aria-hidden="true">
              {PANEL_ORDER.map((name, index) => (
                <span
                  key={name}
                  className={`${styles.indicatorDot} ${index === activePanelIndex ? styles.indicatorActive : ''}`}
                />
              ))}
            </div>
          </nav>

          <div ref={viewportRef} className={styles.snapViewport} onScroll={handleViewportScroll}>
            <section
              ref={(node) => {
                sectionRefs.current[0] = node;
              }}
              className={styles.snapSection}
              aria-label="Overview"
            >
              <div className={styles.sectionPanel}>
                <p className={styles.sectionHeading}>Overview</p>

                {notice && <div className={styles.notice}>{notice}</div>}

                <BentoStyles />
                <BentoGrid columns={12} rowHeight={80} gap={12} className="mb-5">
                  <BentoHero
                    title="Action pulse"
                    subtitle="Environmental and community initiatives"
                    metric={String(filteredActions.length)}
                    metricLabel="active actions"
                    colSpan={8}
                    rowSpan={2}
                  />
                  <BentoStat label="Total Points" value={totalPoints.toLocaleString()} colSpan={4} rowSpan={1} stagger={1} />
                  <BentoStat label="Completions" value={totalCompletions.toLocaleString()} colSpan={4} rowSpan={1} stagger={2} />
                </BentoGrid>

                <div className={styles.filtersRow}>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'online', 'local'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFilter(type)}
                        className={`btn-pill text-sm ${filter === type ? 'btn-pill-sage' : 'btn-pill-outline'}`}
                      >
                        {type === 'all' ? 'All Actions' : type === 'online' ? 'Online' : 'Local'}
                      </button>
                    ))}
                  </div>

                  <div className={styles.viewWrap}>
                    <ViewToggle current={viewMode} onChange={setViewMode} />
                    {isOrganizer && (
                      <button
                        type="button"
                        onClick={() => setShowCreate(true)}
                        className="btn-pill btn-pill-sage flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" /> Create Action
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section
              ref={(node) => {
                sectionRefs.current[1] = node;
              }}
              className={styles.snapSection}
              aria-label="Workspace"
            >
              <div className={styles.sectionPanel}>
                <p className={styles.sectionHeading}>Workspace ({viewMode})</p>

                {viewMode === 'map' && <MapView markers={mapMarkers} height="500px" />}

                {viewMode === 'calendar' && (
                  <div className="card-civic">
                    <CalendarView events={calendarEvents} height="560px" />
                  </div>
                )}

                {viewMode === 'list' && (
                  <div className={styles.boardGrid}>
                    {filteredActions.slice(0, 6).map((action, index) => renderActionCard(action, index, true))}
                  </div>
                )}
              </div>
            </section>

            <section
              ref={(node) => {
                sectionRefs.current[2] = node;
              }}
              className={styles.snapSection}
              aria-label="Action board"
            >
              <div className={styles.sectionPanel}>
                <p className={styles.sectionHeading}>Action board</p>

                {filteredActions.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-lg text-white/72">No actions found</p>
                  </div>
                ) : (
                  <div className={styles.boardGrid}>
                    {filteredActions.map((action, index) => renderActionCard(action, index, true))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>

      {showCreate && <CreateActionModal onClose={() => setShowCreate(false)} onSubmit={handleCreateAction} />}
    </div>
  );
}
