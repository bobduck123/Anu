"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  api,
  CollectiveStreakPayload,
  Microcosm,
  TeamAction,
  TeamChallenge,
  TeamMember,
  TeamSummary,
} from '@/lib/api';
import { ErrorState } from '@/ui-system/states/ErrorState';
import {
  AnuChamberCard,
  AnuChamberMetricsRail,
  AnuChip,
  AnuControlButton,
  AnuHeroMetric,
  AnuInstrumentationCard,
  AnuPageHero,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';
import { PlusCircle, Sparkles, Users } from 'lucide-react';

function isCollectiveStreakPayload(value: unknown): value is CollectiveStreakPayload {
  return typeof value === 'object' && value !== null && 'scope' in value && 'current_streak' in value;
}

const chamberInputClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-400';

export default function TeamsView() {
  const searchParams = useSearchParams();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [microcosms, setMicrocosms] = useState<Microcosm[]>([]);
  const [selectedMicrocosmId, setSelectedMicrocosmId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [challenges, setChallenges] = useState<TeamChallenge[]>([]);
  const [actions, setActions] = useState<TeamAction[]>([]);
  const [teamStreak, setTeamStreak] = useState<CollectiveStreakPayload | null>(null);
  const [newTeam, setNewTeam] = useState({ name: '', description: '' });
  const [newAction, setNewAction] = useState({ title: '', description: '', points: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [teamData, microcosmData] = await Promise.all([
          api.teams.list(),
          api.community.getMicrocosms(),
        ]);
        setTeams(teamData);
        setMicrocosms(microcosmData);
        const paramId = searchParams?.get('microcosm_id');
        setSelectedMicrocosmId((prev) => {
          if (paramId) return Number(paramId);
          if (prev == null && microcosmData.length > 0) return Number(microcosmData[0].id);
          return prev;
        });
        if (teamData.length > 0) setSelectedTeamId(teamData[0].id);
      } catch {
        setLoadError('Team chambers are unavailable right now. Try again in a moment.');
      } finally {
        setLoading(false);
      }
    };

    void loadInitial();
  }, [searchParams]);

  useEffect(() => {
    if (selectedMicrocosmId == null) return;
    const loadScopedTeams = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await api.teams.list(selectedMicrocosmId);
        setTeams(data);
        setSelectedTeamId(data.length > 0 ? data[0].id : null);
      } catch {
        setLoadError('The selected microcosm could not load its teams.');
      } finally {
        setLoading(false);
      }
    };

    void loadScopedTeams();
  }, [selectedMicrocosmId]);

  useEffect(() => {
    if (!selectedTeamId) {
      setMembers([]);
      setChallenges([]);
      setActions([]);
      setTeamStreak(null);
      setDetailError(null);
      return;
    }

    const loadTeamDetail = async () => {
      setDetailError(null);
      try {
        const [memberData, challengeData, actionData, streakData] = await Promise.all([
          api.teams.members(selectedTeamId),
          api.teams.challenges(selectedTeamId),
          api.teams.actions(selectedTeamId),
          api.engagement.getCollectiveStreaks('team', selectedTeamId),
        ]);
        setMembers(memberData);
        setChallenges(challengeData);
        setActions(actionData);
        if (isCollectiveStreakPayload(streakData)) {
          setTeamStreak(streakData);
        } else {
          setTeamStreak(null);
        }
      } catch {
        setMembers([]);
        setChallenges([]);
        setActions([]);
        setTeamStreak(null);
        setDetailError('Team momentum and action details are temporarily unavailable.');
      }
    };

    void loadTeamDetail();
  }, [selectedTeamId]);

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) return;
    if (microcosms.length > 0 && selectedMicrocosmId == null) {
      setActionNotice('Select a microcosm before creating a team chamber.');
      return;
    }
    try {
      const created = await api.teams.create({
        ...newTeam,
        microcosm_id: selectedMicrocosmId ?? undefined,
      });
      setTeams((prev) => [created, ...prev]);
      setSelectedTeamId(created.id);
      setNewTeam({ name: '', description: '' });
      setActionNotice('Team chamber created.');
    } catch {
      setActionNotice('Could not create the team chamber right now.');
    }
  };

  const handleJoin = async (teamId: number) => {
    try {
      const joined = await api.teams.join(teamId);
      if (joined) {
        setTeams((prev) =>
          prev.map((team) =>
            team.id === teamId
              ? { ...team, is_member: true, member_count: team.member_count + 1 }
              : team,
          ),
        );
        setSelectedTeamId(teamId);
        setActionNotice('Joined team chamber.');
      }
    } catch {
      setActionNotice('Could not join this team chamber.');
    }
  };

  const handleCreateAction = async () => {
    if (!selectedTeamId || !newAction.title.trim()) return;
    try {
      const created = await api.teams.createAction(selectedTeamId, {
        title: newAction.title,
        description: newAction.description,
        points: Number(newAction.points) || 0,
      });
      setActions((prev) => [created, ...prev]);
      setNewAction({ title: '', description: '', points: 0 });
      setActionNotice('Shared action added.');
    } catch {
      setActionNotice('Could not add the team action right now.');
    }
  };

  const handleCompleteAction = async (actionId: number) => {
    if (!selectedTeamId) return;
    try {
      const ok = await api.teams.completeAction(selectedTeamId, actionId);
      if (ok) {
        setActions((prev) =>
          prev.map((action) =>
            action.id === actionId
              ? { ...action, completed_count: action.completed_count + 1 }
              : action,
          ),
        );
        setActionNotice('Action marked complete.');
      }
    } catch {
      setActionNotice('Could not mark that action complete.');
    }
  };

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) || null,
    [selectedTeamId, teams],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <AnuPageHero
          eyebrow="Team chambers"
          title="Teams"
          description="Teams are small collective chambers inside a wider microcosm. This surface should clarify membership, shared momentum, and the next local action without collapsing into a generic project board."
          aside={
            <AnuSurfacePanel tone="quiet" className="h-full">
              <div className="flex flex-wrap gap-2">
                <AnuChip tone="signal">Local crew</AnuChip>
                <AnuChip tone="muted">{microcosms.length} microcosms available</AnuChip>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300/84">
                Team panels should feel like semi-autonomous chambers tied to a specific local place.
              </p>
            </AnuSurfacePanel>
          }
        >
          <AnuChamberMetricsRail columns="three">
            <AnuHeroMetric label="Teams" value={String(teams.length)} detail="Current chamber count in the selected microcosm scope." />
            <AnuHeroMetric label="Members" value={selectedTeam ? String(selectedTeam.member_count) : '0'} detail="Visible count for the selected team chamber." />
            <AnuHeroMetric label="Challenges" value={String(challenges.length)} detail="Shared challenge tracks currently attached to the selected team." />
          </AnuChamberMetricsRail>
        </AnuPageHero>

        {loadError || actionNotice ? (
          <div className="mt-6 space-y-3">
            {loadError ? (
              <ErrorState
                title="Team chambers unavailable"
                message={loadError}
                onRetry={() => window.location.reload()}
                className="rounded-[28px] border border-[rgba(216,169,95,0.22)] bg-[rgba(18,20,37,0.7)] px-6"
              />
            ) : null}
            {actionNotice ? (
              <div className="rounded-2xl border border-[rgba(216,169,95,0.22)] bg-[rgba(216,169,95,0.08)] px-4 py-3 text-sm text-[#f4dbc2]">
                {actionNotice}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-6">
            <AnuChamberCard eyebrow="Entry" title="Create a team chamber">
              <div className="space-y-3">
                <select
                  value={selectedMicrocosmId ?? ''}
                  onChange={(event) =>
                    setSelectedMicrocosmId(event.target.value ? Number(event.target.value) : null)
                  }
                  className={chamberInputClass}
                >
                  {microcosms.length === 0 ? <option value="">No microcosms yet</option> : null}
                  {microcosms.map((microcosm) => (
                    <option key={microcosm.id} value={microcosm.id}>
                      {microcosm.name}
                    </option>
                  ))}
                </select>
                <input
                  value={newTeam.name}
                  onChange={(event) => setNewTeam({ ...newTeam, name: event.target.value })}
                  placeholder="Team name"
                  className={chamberInputClass}
                />
                <textarea
                  rows={3}
                  value={newTeam.description}
                  onChange={(event) =>
                    setNewTeam({ ...newTeam, description: event.target.value })
                  }
                  placeholder="Short description"
                  className={chamberInputClass}
                />
                <AnuControlButton onClick={() => void handleCreateTeam()} tone="active" className="w-full justify-center">
                  Create team
                </AnuControlButton>
              </div>
            </AnuChamberCard>

            <AnuChamberCard eyebrow="Available chambers" title="Browse teams">
              {loading ? (
                <p className="text-sm leading-6 text-slate-300/82">Loading teams...</p>
              ) : teams.length ? (
                <div className="space-y-3">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className={`rounded-xl border p-4 ${
                        team.id === selectedTeamId
                          ? 'border-[rgba(141,116,221,0.36)] bg-[rgba(141,116,221,0.1)]'
                          : 'border-white/10 bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{team.name}</p>
                          {team.microcosm_name ? (
                            <p className="mt-1 text-xs text-slate-400">
                              Microcosm: {team.microcosm_name}
                            </p>
                          ) : null}
                          <p className="mt-2 text-sm text-slate-300/82">
                            {team.description || 'No description yet.'}
                          </p>
                        </div>
                        <AnuChip tone="muted">{team.member_count} members</AnuChip>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <AnuControlButton onClick={() => setSelectedTeamId(team.id)} tone={team.id === selectedTeamId ? 'active' : 'default'}>
                          View
                        </AnuControlButton>
                        {!team.is_member ? (
                          <AnuControlButton onClick={() => void handleJoin(team.id)} tone="default">
                            Join
                          </AnuControlButton>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-300/82">No teams yet. Create the first one.</p>
              )}
            </AnuChamberCard>
          </div>

          <div className="space-y-6">
            {!selectedTeam ? (
              <AnuChamberCard eyebrow="Selection" title="Choose a team chamber">
                <p className="text-sm leading-6 text-slate-300/82">Select a team to see momentum, actions, and members.</p>
              </AnuChamberCard>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <AnuInstrumentationCard
                    label="Momentum"
                    value={teamStreak ? teamStreak.current_streak : 0}
                    detail={teamStreak?.weekly_stats?.is_active ? 'Active this week' : 'Needs activity'}
                    icon={Sparkles}
                    tone={teamStreak?.weekly_stats?.is_active ? 'signal' : 'steady'}
                  />
                  <AnuInstrumentationCard
                    label="Actions"
                    value={actions.length}
                    detail="Shared action count currently attached to this chamber."
                    icon={PlusCircle}
                  />
                  <AnuInstrumentationCard
                    label="Members"
                    value={members.length}
                    detail="Participants currently visible inside the chamber."
                    icon={Users}
                  />
                </div>

                <AnuChamberCard
                  eyebrow="Selected team"
                  title={selectedTeam.name}
                  description={selectedTeam.description || 'No description yet.'}
                  action={<AnuChip tone={selectedTeam.is_member ? 'signal' : 'muted'}>{selectedTeam.is_member ? 'Member' : 'Observer'}</AnuChip>}
                >
                  {detailError ? (
                    <div className="mb-5 rounded-2xl border border-[rgba(216,169,95,0.22)] bg-[rgba(216,169,95,0.08)] px-4 py-3 text-sm text-[#f4dbc2]">
                      {detailError}
                    </div>
                  ) : null}
                  <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                    <div className="space-y-3">
                      <p className="text-sm uppercase tracking-[0.16em] text-slate-400">Challenges</p>
                      {challenges.length ? (
                        challenges.map((challenge) => {
                          const pct = Math.min(100, Math.round((challenge.progress / challenge.target) * 100));
                          return (
                            <div key={challenge.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-white">{challenge.title}</p>
                                  <p className="mt-1 text-sm text-slate-300/82">
                                    {challenge.description}
                                  </p>
                                </div>
                                <AnuChip tone={challenge.status === 'complete' ? 'signal' : 'accent'}>
                                  {challenge.status}
                                </AnuChip>
                              </div>
                              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                                <span>{challenge.progress}/{challenge.target}</span>
                                <span>+{challenge.reward_points} pts</span>
                              </div>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${pct}%`, background: 'rgba(141,116,221,0.92)' }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm leading-6 text-slate-300/82">No challenges yet.</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm uppercase tracking-[0.16em] text-slate-400">Members</p>
                      {members.length ? (
                        members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                            <span className="text-sm text-white">{member.pseudonym}</span>
                            <span className="text-xs capitalize text-slate-400">{member.role}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm leading-6 text-slate-300/82">No members yet.</p>
                      )}
                    </div>
                  </div>
                </AnuChamberCard>

                <AnuChamberCard eyebrow="Shared action board" title="Team actions">
                  {actions.length ? (
                    <div className="space-y-3">
                      {actions.map((action) => (
                        <div key={action.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-white">{action.title}</p>
                              <p className="mt-1 text-sm text-slate-300/82">
                                {action.description || 'No description yet.'}
                              </p>
                            </div>
                            <AnuChip tone="muted">{action.points} pts</AnuChip>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                            <span>{action.completed_count} completions</span>
                            <AnuControlButton onClick={() => void handleCompleteAction(action.id)} tone="default">
                              Mark complete
                            </AnuControlButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-slate-300/82">No team actions yet.</p>
                  )}

                  <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <input
                      value={newAction.title}
                      onChange={(event) => setNewAction({ ...newAction, title: event.target.value })}
                      placeholder="Action title"
                      className={chamberInputClass}
                    />
                    <input
                      type="number"
                      value={newAction.points}
                      onChange={(event) =>
                        setNewAction({ ...newAction, points: Number(event.target.value) })
                      }
                      placeholder="Points"
                      className={chamberInputClass}
                    />
                    <AnuControlButton onClick={() => void handleCreateAction()} tone="active">
                      Add action
                    </AnuControlButton>
                  </div>
                  <textarea
                    rows={3}
                    value={newAction.description}
                    onChange={(event) =>
                      setNewAction({ ...newAction, description: event.target.value })
                    }
                    placeholder="Action details"
                    className={`${chamberInputClass} mt-3`}
                  />
                </AnuChamberCard>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
