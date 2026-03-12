"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, TeamSummary, TeamMember, TeamChallenge, TeamAction, CollectiveStreakPayload, Microcosm } from '@/lib/api';
import { Users, Sparkles, PlusCircle } from 'lucide-react';

function isCollectiveStreakPayload(value: unknown): value is CollectiveStreakPayload {
  return typeof value === 'object' && value !== null && 'scope' in value && 'current_streak' in value;
}

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

  useEffect(() => {
    Promise.all([api.teams.list(), api.community.getMicrocosms()])
      .then(([teamData, microcosmData]) => {
        setTeams(teamData);
        setMicrocosms(microcosmData);
        const paramId = searchParams?.get('microcosm_id');
        setSelectedMicrocosmId((prev) => {
          if (paramId) return Number(paramId);
          if (prev == null && microcosmData.length > 0) return Number(microcosmData[0].id);
          return prev;
        });
        if (teamData.length > 0) setSelectedTeamId(teamData[0].id);
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  useEffect(() => {
    if (selectedMicrocosmId == null) return;
    api.teams.list(selectedMicrocosmId)
      .then((data) => {
        setTeams(data);
        if (data.length > 0) setSelectedTeamId(data[0].id);
        else setSelectedTeamId(null);
      })
      .finally(() => setLoading(false));
  }, [selectedMicrocosmId]);

  useEffect(() => {
    if (!selectedTeamId) return;
    Promise.all([
      api.teams.members(selectedTeamId),
      api.teams.challenges(selectedTeamId),
      api.teams.actions(selectedTeamId),
      api.engagement.getCollectiveStreaks('team', selectedTeamId),
    ]).then(([memberData, challengeData, actionData, streakData]) => {
      setMembers(memberData);
      setChallenges(challengeData);
      setActions(actionData);
      if (isCollectiveStreakPayload(streakData)) {
        setTeamStreak(streakData);
      }
    });
  }, [selectedTeamId]);

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) return;
    if (microcosms.length > 0 && selectedMicrocosmId == null) {
      alert('Select a microcosm for this team.');
      return;
    }
    const created = await api.teams.create({
      ...newTeam,
      microcosm_id: selectedMicrocosmId ?? undefined,
    });
    setTeams((prev) => [created, ...prev]);
    setSelectedTeamId(created.id);
    setNewTeam({ name: '', description: '' });
  };

  const handleJoin = async (teamId: number) => {
    const joined = await api.teams.join(teamId);
    if (joined) {
      setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, is_member: true, member_count: t.member_count + 1 } : t)));
      setSelectedTeamId(teamId);
    }
  };

  const handleCreateAction = async () => {
    if (!selectedTeamId || !newAction.title.trim()) return;
    const created = await api.teams.createAction(selectedTeamId, {
      title: newAction.title,
      description: newAction.description,
      points: Number(newAction.points) || 0,
    });
    setActions((prev) => [created, ...prev]);
    setNewAction({ title: '', description: '', points: 0 });
  };

  const handleCompleteAction = async (actionId: number) => {
    if (!selectedTeamId) return;
    const ok = await api.teams.completeAction(selectedTeamId, actionId);
    if (ok) {
      setActions((prev) => prev.map((a) => (a.id === actionId ? { ...a, completed_count: a.completed_count + 1 } : a)));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Teams</h1>
          <p className="text-[var(--color-muted-foreground)]">Form small crews and ship collective wins.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="card-civic">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Create Team
              </h2>
              <div className="space-y-3">
                <select
                  value={selectedMicrocosmId ?? ''}
                  onChange={(e) => setSelectedMicrocosmId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
                >
                  {microcosms.length === 0 && <option value="">No microcosms yet</option>}
                  {microcosms.map((microcosm) => (
                    <option key={microcosm.id} value={microcosm.id}>
                      {microcosm.name}
                    </option>
                  ))}
                </select>
                <input
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="Team name"
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
                />
                <textarea
                  rows={3}
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  placeholder="Short description"
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
                />
                <button onClick={handleCreateTeam} className="btn-pill btn-pill-primary w-full">
                  Create Team
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {loading && <p className="text-sm text-[var(--color-muted-foreground)]">Loading teams...</p>}
              {teams.map((team) => (
                <div key={team.id} className={`card-civic ${team.id === selectedTeamId ? 'border-[var(--color-institutional)]' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{team.name}</h3>
                    <span className="text-xs text-[var(--color-muted-foreground)]">{team.member_count} members</span>
                  </div>
                  {team.microcosm_name && (
                    <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Microcosm: {team.microcosm_name}</p>
                  )}
                  <p className="text-xs text-[var(--color-muted-foreground)] mb-3">{team.description}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedTeamId(team.id)} className="btn-pill btn-pill-outline text-xs">View</button>
                    {!team.is_member && (
                      <button onClick={() => handleJoin(team.id)} className="btn-pill btn-pill-sage text-xs">Join</button>
                    )}
                  </div>
                </div>
              ))}
              {teams.length === 0 && !loading && (
                <p className="text-sm text-[var(--color-muted-foreground)]">No teams yet. Create the first one.</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {!selectedTeamId && (
              <div className="card-civic text-center py-10">
                <p className="text-[var(--color-muted-foreground)]">Select a team to see details.</p>
              </div>
            )}

            {selectedTeamId && (
              <>
                <div className="card-civic">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Team Momentum
                  </h2>
                  {teamStreak ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{teamStreak.scope_name}</p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {teamStreak.weekly_stats?.is_active ? 'Active this week' : 'Needs activity'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold font-mono-data text-[var(--color-forest)]">{teamStreak.current_streak}</p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">week streak</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-muted-foreground)]">No team streak data yet.</p>
                  )}
                </div>

                <div className="card-civic">
                  <h3 className="text-lg font-semibold mb-4">Team Challenges</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {challenges.map((challenge) => {
                      const pct = Math.min(100, Math.round((challenge.progress / challenge.target) * 100));
                      return (
                        <div key={challenge.id} className="p-4 rounded-lg border border-[var(--color-border)]">
                          <p className="font-medium mb-1">{challenge.title}</p>
                          <p className="text-xs text-[var(--color-muted-foreground)] mb-3">{challenge.description}</p>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span>{challenge.progress}/{challenge.target}</span>
                            <span className="font-mono-data text-[var(--color-institutional)]">+{challenge.reward_points} pts</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {challenges.length === 0 && (
                      <p className="text-sm text-[var(--color-muted-foreground)]">No challenges yet.</p>
                    )}
                  </div>
                </div>

                <div className="card-civic">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" /> Team Actions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {actions.map((action) => (
                      <div key={action.id} className="p-4 rounded-lg border border-[var(--color-border)]">
                        <p className="font-medium mb-1">{action.title}</p>
                        <p className="text-xs text-[var(--color-muted-foreground)] mb-3">{action.description}</p>
                        <div className="flex items-center justify-between text-xs mb-3">
                          <span className="font-mono-data">{action.points} pts</span>
                          <span>{action.completed_count} completions</span>
                        </div>
                        <button onClick={() => handleCompleteAction(action.id)} className="btn-pill btn-pill-outline text-xs">
                          Mark Complete
                        </button>
                      </div>
                    ))}
                    {actions.length === 0 && (
                      <p className="text-sm text-[var(--color-muted-foreground)]">No team actions yet.</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <input
                      value={newAction.title}
                      onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
                      placeholder="Action title"
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
                    />
                    <textarea
                      rows={3}
                      value={newAction.description}
                      onChange={(e) => setNewAction({ ...newAction, description: e.target.value })}
                      placeholder="Action details"
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      value={newAction.points}
                      onChange={(e) => setNewAction({ ...newAction, points: Number(e.target.value) })}
                      placeholder="Points"
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
                    />
                    <button onClick={handleCreateAction} className="btn-pill btn-pill-sage w-full">
                      Create Team Action
                    </button>
                  </div>
                </div>

                <div className="card-civic">
                  <h3 className="text-lg font-semibold mb-4">Members</h3>
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between text-sm">
                        <span>{member.pseudonym}</span>
                        <span className="text-xs text-[var(--color-muted-foreground)]">{member.role}</span>
                      </div>
                    ))}
                    {members.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No members yet.</p>}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
