'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamicImport from 'next/dynamic';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Compass,
  Globe2,
  HeartHandshake,
  List,
  Map,
  Package2,
  Plus,
  RefreshCw,
  TentTree,
  Waypoints,
} from 'lucide-react';
import { api, Action } from '@/lib/api';
import { getCoreApiBase } from '@/lib/runtime';
import {
  AnuActionLink,
  AnuChip,
  AnuControlButton,
  AnuFilterBar,
  AnuFilterGroup,
  AnuFilterInput,
  AnuInstrumentationCard,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';
import { EarthFieldShell } from '@/ui-system/realms/earth/EarthFieldShell';
import { EarthNavPill } from '@/ui-system/realms/earth/EarthNavPill';
import { EarthObjectMarker, type EarthObjectKind } from '@/ui-system/realms/earth/EarthObjectMarker';
import { EarthRisingPanel } from '@/ui-system/realms/earth/EarthRisingPanel';

export const dynamic = 'force-dynamic';

const MapView = dynamicImport(() => import('@/components/shared/MapView'), { ssr: false });
const CalendarView = dynamicImport(() => import('@/components/shared/CalendarView'), { ssr: false });
const CreateActionModal = dynamicImport(() => import('@/components/shared/CreateActionModal'), { ssr: false });
const EarthTerrainBackdrop = dynamicImport(
  () => import('@/ui-system/realms/earth/EarthTerrainBackdrop').then((module) => module.EarthTerrainBackdrop),
  { ssr: false },
);

type ActionViewMode = 'field' | 'list' | 'map' | 'calendar';

const API_BASE = getCoreApiBase();

const ACTION_FIELD_POSITIONS = [
  { top: '24%', left: '18%' },
  { top: '20%', left: '54%' },
  { top: '34%', left: '80%' },
  { top: '55%', left: '24%' },
  { top: '58%', left: '58%' },
  { top: '74%', left: '82%' },
  { top: '78%', left: '14%' },
  { top: '42%', left: '42%' },
] as const;

function formatDateRange(action: Action) {
  const start = new Date(action.startDate);
  const end = new Date(action.endDate);
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
}

function getActionKind(action: Action): EarthObjectKind {
  return action.isOnline || action.isGlobal ? 'parcel' : 'camp';
}

function getBadge(action: Action) {
  if (action.trendLabel) return action.trendLabel;

  const end = action.endDate ? new Date(action.endDate) : null;
  if (end) {
    const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) return 'Closing soon';
  }

  const start = action.startDate ? new Date(action.startDate) : null;
  if (start) {
    const daysSince = Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 7) return 'New';
  }

  return 'Trending';
}

export default function ActionsPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'online' | 'local'>('all');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ActionViewMode>('field');
  const [showCreate, setShowCreate] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const loadActions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.actions.getAll();
      setActions(data);
    } catch (error) {
      console.error('Failed to load actions:', error);
      setNotice('Could not load live actions. Operational backups remain available.');
      setActions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActions();
    try {
      setIsOrganizer(localStorage.getItem('organizer_applied') === 'true');
    } catch {
      setIsOrganizer(false);
    }
  }, [loadActions]);

  const filteredActions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return actions.filter((action) => {
      if (filter === 'online' && !action.isOnline) {
        return false;
      }

      if (filter === 'local' && (action.isOnline || action.isGlobal)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        action.title,
        action.details,
        action.instructions,
        action.actionType,
        action.city,
        action.country,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [actions, filter, query]);

  useEffect(() => {
    if (filteredActions.length === 0) {
      setSelectedActionId(null);
      return;
    }

    const stillVisible = filteredActions.some((action) => action._id === selectedActionId);
    if (!stillVisible) {
      setSelectedActionId(filteredActions[0]?._id ?? null);
    }
  }, [filteredActions, selectedActionId]);

  const selectedAction = useMemo(
    () => filteredActions.find((action) => action._id === selectedActionId) ?? null,
    [filteredActions, selectedActionId],
  );

  const handleComplete = useCallback(
    async (actionId: string) => {
      try {
        await api.actions.complete(actionId);
        await loadActions();
        setNotice('Action completed. The field record now reflects the new completion.');
      } catch (error) {
        console.error('Failed to complete action:', error);
        setNotice('Could not complete the action right now.');
      }
    },
    [loadActions],
  );

  const handleAddToTodo = useCallback(async (action: Action) => {
    try {
      await api.todos.addAction(action._id, action.title);
      setNotice('Added to your to-do lane.');
    } catch (error) {
      console.error('Failed to add to to-do:', error);
      setNotice('Could not add this action to your to-do lane.');
    }
  }, []);

  const handleCreateAction = useCallback(
    async (formData: FormData) => {
      const rawToken = localStorage.getItem('auth_token');
      const token = rawToken?.trim();
      const isJwt = Boolean(token && token.split('.').length === 3);
      const response = await fetch(`${API_BASE}/api/actions`, {
        method: 'POST',
        headers: isJwt && token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to create action');
      }

      await loadActions();
      setNotice('Action created successfully.');
    },
    [loadActions],
  );

  const totalPoints = useMemo(
    () => filteredActions.reduce((sum, action) => sum + (action.pointsAssigned || 0), 0),
    [filteredActions],
  );
  const totalCompletions = useMemo(
    () => filteredActions.reduce((sum, action) => sum + (action.completions || 0), 0),
    [filteredActions],
  );

  const mapMarkers = useMemo(
    () =>
      filteredActions
        .filter((action) => action.location?.coordinates)
        .map((action) => ({
          id: action._id,
          lat: action.location!.coordinates[1],
          lng: action.location!.coordinates[0],
          title: action.title,
          popup: `<strong>${action.title}</strong><br/>${action.pointsAssigned} points<br/>${action.completions} completions`,
          color: getActionKind(action) === 'camp' ? ('forest' as const) : ('accent' as const),
        })),
    [filteredActions],
  );

  const terrainMarkers = useMemo(
    () => mapMarkers.map((marker) => ({ lat: marker.lat, lng: marker.lng })),
    [mapMarkers],
  );

  const calendarEvents = useMemo(
    () =>
      filteredActions.map((action) => ({
        id: action._id,
        title: `${action.title} (${action.pointsAssigned} pts)`,
        start: new Date(action.startDate),
        end: new Date(action.endDate),
        color: getActionKind(action) === 'camp' ? 'var(--color-sage)' : 'var(--color-accent)',
      })),
    [filteredActions],
  );

  const fieldMarkers = (
    <div className="relative h-full w-full">
      {terrainMarkers.length > 0 ? <EarthTerrainBackdrop markers={terrainMarkers} /> : null}
      {filteredActions.length > 0 ? (
        filteredActions.slice(0, ACTION_FIELD_POSITIONS.length).map((action, index) => (
          <EarthObjectMarker
            key={action._id}
            kind={getActionKind(action)}
            title={action.title}
            summary={action.details}
            meta={formatDateRange(action)}
            badges={[
              `${action.pointsAssigned} pts`,
              `${action.completions} completions`,
              getBadge(action),
              action.isOnline ? 'online' : action.isGlobal ? 'global' : 'local',
            ]}
            active={selectedActionId === action._id}
            style={ACTION_FIELD_POSITIONS[index]}
            onSelect={() => {
              setSelectedActionId(action._id);
              setViewMode('field');
            }}
          />
        ))
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <div className="max-w-xl rounded-[2rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] px-6 py-8 backdrop-blur-md">
            <p className="text-lg text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              No grounded actions match this pass.
            </p>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.78)]">
              Adjust the route filters or search terms to surface a different camp or parcel on the field.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const risingPanel = selectedAction ? (
    <EarthRisingPanel
      eyebrow={getActionKind(selectedAction) === 'camp' ? 'Grounded camp' : 'Routed parcel'}
      title={selectedAction.title}
      summary={
        <div className="space-y-3">
          <p>{selectedAction.details}</p>
          {selectedAction.instructions ? <p>{selectedAction.instructions}</p> : null}
        </div>
      }
      badges={
        <>
          <AnuChip tone="accent" icon={Package2}>
            {selectedAction.pointsAssigned} pts
          </AnuChip>
          <AnuChip tone="muted" icon={CheckCircle2}>
            {selectedAction.completions} completions
          </AnuChip>
          <AnuChip tone="muted" icon={selectedAction.isOnline ? Globe2 : Compass}>
            {selectedAction.isOnline ? 'Online' : selectedAction.isGlobal ? 'Global' : 'Local'}
          </AnuChip>
        </>
      }
      primary={
        <div className="grid gap-4 md:grid-cols-2">
          <AnuInstrumentationCard
            label="Action window"
            value={formatDateRange(selectedAction)}
            detail={`Recurrence: ${selectedAction.recurrence || 'none'}`}
            tone="signal"
          />
          <AnuInstrumentationCard
            label="Momentum"
            value={getBadge(selectedAction)}
            detail={`${selectedAction.completions} completions recorded so far.`}
            tone={selectedAction.completions > 0 ? 'steady' : 'warning'}
          />
        </div>
      }
      secondary={
        <AnuSurfacePanel tone="quiet" className="px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.64)]">Field notes</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
            <p>Type: {selectedAction.actionType || 'Community action'}</p>
            <p>
              Milestones:{' '}
              {[selectedAction.milestones?.first, selectedAction.milestones?.second, selectedAction.milestones?.final]
                .filter(Boolean)
                .join(' / ') || 'No milestones published'}
            </p>
            <p>
              Place:{' '}
              {selectedAction.isOnline
                ? 'Online route'
                : [selectedAction.city, selectedAction.country].filter(Boolean).join(', ') || 'Field coordinates unpublished'}
            </p>
          </div>
        </AnuSurfacePanel>
      }
      footer={
        <div className="flex flex-wrap gap-3">
          <Link href={`/actions/${selectedAction._id}`} className="anu-earth-top-link">
            Open full action record
          </Link>
          <AnuControlButton tone="active" iconLeft={CheckCircle2} onClick={() => void handleComplete(selectedAction._id)}>
            Complete action
          </AnuControlButton>
          <AnuControlButton tone="default" iconLeft={Plus} onClick={() => void handleAddToTodo(selectedAction)}>
            Add to to-do
          </AnuControlButton>
        </div>
      }
    />
  ) : null;

  const utilityView =
    viewMode === 'map' ? (
      <AnuSurfacePanel tone="soft" className="px-5 py-5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.64)]">Map backup</p>
        <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
          Geographic backup remains available when the field view is not the best operational tool.
        </p>
        <div className="mt-5">
          <MapView markers={mapMarkers} height="500px" />
        </div>
      </AnuSurfacePanel>
    ) : viewMode === 'calendar' ? (
      <AnuSurfacePanel tone="soft" className="px-5 py-5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.64)]">Calendar backup</p>
        <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
          Time-based planning remains available when sequencing and availability matter more than terrain.
        </p>
        <div className="mt-5">
          <CalendarView events={calendarEvents} height="560px" />
        </div>
      </AnuSurfacePanel>
    ) : viewMode === 'list' ? (
      <AnuSurfacePanel tone="soft" className="px-5 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.64)]">List backup</p>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
              Utility list mode remains available for straightforward scanning and task completion.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AnuChip tone="muted">{filteredActions.length} visible</AnuChip>
            <AnuChip tone="muted">{totalCompletions} completions</AnuChip>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {filteredActions.length > 0 ? (
            filteredActions.map((action) => (
              <AnuSurfacePanel key={action._id} tone="quiet" className="px-4 py-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">{getActionKind(action)}</p>
                      <h3 className="mt-2 text-2xl text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                        {action.title}
                      </h3>
                    </div>
                    <AnuChip tone="accent">{getBadge(action)}</AnuChip>
                  </div>
                  <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">{action.details}</p>
                  <div className="flex flex-wrap gap-2">
                    <AnuChip tone="muted">{formatDateRange(action)}</AnuChip>
                    <AnuChip tone="muted">{action.pointsAssigned} pts</AnuChip>
                    <AnuChip tone="muted">{action.completions} completions</AnuChip>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <AnuActionLink href={`/actions/${action._id}`} tone="secondary">
                      Details
                    </AnuActionLink>
                    <AnuControlButton tone="active" onClick={() => void handleComplete(action._id)}>
                      Complete
                    </AnuControlButton>
                    <AnuControlButton tone="default" onClick={() => void handleAddToTodo(action)}>
                      Add to to-do
                    </AnuControlButton>
                  </div>
                </div>
              </AnuSurfacePanel>
            ))
          ) : (
            <div className="rounded-[2rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] px-5 py-6 text-sm text-[color:rgba(246,212,203,0.78)] xl:col-span-2">
              No actions match the current filters.
            </div>
          )}
        </div>
      </AnuSurfacePanel>
    ) : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--color-sage)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-20 pt-24 md:px-8">
      <div className="mx-auto w-full max-w-[96rem]">
        <EarthFieldShell
          eyebrow="Earth proof / actions"
          title="The Commons"
          description="Local work gathers in camps, distributed work appears as parcels, and route detail rises from the terrain instead of collapsing into dashboard cards."
          actions={
            <div className="anu-earth-top-links">
              <Link href="/events" className="anu-earth-top-link">
                Move to gatherings
              </Link>
              <Link href="/relief" className="anu-earth-top-link">
                Open relief
              </Link>
              <Link href="/impact" className="anu-earth-top-link">
                Trace outcomes
              </Link>
            </div>
          }
          metrics={
            <div className="anu-earth-hud-lines">
              <div className="anu-earth-hud-line">
                <span className="anu-earth-hud-key">Visible</span>
                <span className="anu-earth-hud-rule" />
                <span className="anu-earth-hud-value">{filteredActions.length} camps/parcels</span>
              </div>
              <div className="anu-earth-hud-line">
                <span className="anu-earth-hud-key">Points</span>
                <span className="anu-earth-hud-rule" />
                <span className="anu-earth-hud-value">{totalPoints.toLocaleString()} field points</span>
              </div>
              <div className="anu-earth-hud-line">
                <span className="anu-earth-hud-key">Follow-through</span>
                <span className="anu-earth-hud-rule" />
                <span className="anu-earth-hud-value">{totalCompletions.toLocaleString()} completions logged</span>
              </div>
            </div>
          }
          controls={
            <div className="space-y-4">
              {notice ? (
                <AnuSurfacePanel tone="quiet" className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-[#f6d4cb]" />
                    <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">{notice}</p>
                  </div>
                </AnuSurfacePanel>
              ) : null}

              <AnuFilterBar>
                <AnuFilterGroup>
                  <AnuFilterInput
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search titles, places, instructions, or action types"
                    aria-label="Search actions"
                  />
                  <AnuControlButton tone="default" iconLeft={RefreshCw} onClick={() => void loadActions()}>
                    Refresh field
                  </AnuControlButton>
                  {isOrganizer ? (
                    <AnuControlButton tone="active" iconLeft={Plus} onClick={() => setShowCreate(true)}>
                      Create action
                    </AnuControlButton>
                  ) : null}
                </AnuFilterGroup>

                <AnuFilterGroup className="justify-end">
                  <AnuControlButton tone={filter === 'all' ? 'active' : 'default'} onClick={() => setFilter('all')}>
                    All
                  </AnuControlButton>
                  <AnuControlButton tone={filter === 'online' ? 'active' : 'default'} onClick={() => setFilter('online')}>
                    Online
                  </AnuControlButton>
                  <AnuControlButton tone={filter === 'local' ? 'active' : 'default'} onClick={() => setFilter('local')}>
                    Local
                  </AnuControlButton>
                </AnuFilterGroup>

                <AnuFilterGroup className="justify-end">
                  <AnuControlButton tone={viewMode === 'field' ? 'active' : 'default'} iconLeft={Compass} onClick={() => setViewMode('field')}>
                    Field
                  </AnuControlButton>
                  <AnuControlButton tone={viewMode === 'list' ? 'active' : 'default'} iconLeft={List} onClick={() => setViewMode('list')}>
                    List
                  </AnuControlButton>
                  <AnuControlButton tone={viewMode === 'map' ? 'active' : 'default'} iconLeft={Map} onClick={() => setViewMode('map')}>
                    Map
                  </AnuControlButton>
                  <AnuControlButton tone={viewMode === 'calendar' ? 'active' : 'default'} iconLeft={CalendarDays} onClick={() => setViewMode('calendar')}>
                    Calendar
                  </AnuControlButton>
                </AnuFilterGroup>
              </AnuFilterBar>
            </div>
          }
          field={fieldMarkers}
          risingPanel={risingPanel}
          nav={
            <EarthNavPill
              items={[
                { href: '/actions', label: 'Actions', active: true, icon: TentTree },
                { href: '/events', label: 'Events', icon: CalendarDays },
                { href: '/relief', label: 'Relief', icon: HeartHandshake },
                { href: '/impact', label: 'Impact', icon: Waypoints },
              ]}
            />
          }
          utility={utilityView}
        />
      </div>

      {showCreate ? <CreateActionModal onClose={() => setShowCreate(false)} onSubmit={handleCreateAction} /> : null}
    </div>
  );
}
