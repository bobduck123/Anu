'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, TodoResponse, NotificationResponse, Challenge, Article } from "@/lib/api";
import { timebankApi, burnoutApi, type TimeEntry } from "@/lib/api/endpoints";
import { useFeatureFlag } from '@/lib/featureFlags';
import { DesktopCanvas } from '@/ui/patterns/profile-desktop';
import { Monitor, LayoutList } from 'lucide-react';

interface UserProfile {
  id: number;
  username: string;
  pseudonym: string;
  role: string;
  points: number;
  level: number;
  points_to_level_up: number;
  node_id: number | null;
}

interface OrganizerStatus {
  hasApplied: boolean;
  isOrganizer: boolean;
  role: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todos, setTodos] = useState<TodoResponse[]>([]);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [organizerStatus, setOrganizerStatus] = useState<OrganizerStatus | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [viewMode, setViewMode] = useState<'classic' | 'desktop'>('classic');
  const desktopEnabled = useFeatureFlag('profileDesktopUi');
  const [isLoading, setIsLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [burnout, setBurnout] = useState<{ score: number; risk: string } | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [featuredBadges, setFeaturedBadges] = useState<string[]>([]);
  const [featuredProgress, setFeaturedProgress] = useState<{ nextLabel: string; current: number; target: number } | null>(null);
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [applicationForm, setApplicationForm] = useState({
    organizationName: '', organizationType: '', experience: '',
    causeFocus: [] as string[],
    contactInfo: { phone: '', website: '', socialMedia: '' },
    references: [] as Array<{ name: string; organization: string; contact: string }>,
    motivation: ''
  });

  useEffect(() => {
    fetchProfileData();
    fetchOrganizerStatus();
  }, []);

  useEffect(() => {
    try {
      setOnboardingComplete(localStorage.getItem('onboarding_complete') === 'true');
    } catch {
      setOnboardingComplete(false);
    }
  }, []);

  useEffect(() => {
    if (profile) loadFeaturedBadges(profile);
  }, [profile]);

  const fetchProfileData = async () => {
    try {
      const userData = await api.users.me();
      setProfile(userData);
    } catch {
      // Fallback to mock data
      setProfile({
        id: 1, username: 'johndoe', pseudonym: 'GreenLeaf',
        role: 'participant', points: 1250, level: 5,
        points_to_level_up: 100, node_id: null
      });
    }

    try {
      const todosData = await api.todos.getAll();
      setTodos(todosData);
    } catch { /* ignore */ }

    try {
      const notifs = await api.notifications.getAll();
      setNotifications(notifs);
    } catch { /* ignore */ }

    try {
      const challengeData = await api.engagement.getChallenges();
      setChallenges(challengeData);
    } catch { /* ignore */ }

    try {
      const timeData = await timebankApi.list();
      setTimeEntries(timeData.entries || []);
    } catch { /* ignore */ }

    try {
      const burnoutData = await burnoutApi.me();
      setBurnout({ score: burnoutData.score, risk: burnoutData.risk });
    } catch { /* ignore */ }
  };

  const loadFeaturedBadges = async (user: UserProfile) => {
    try {
      const [storyData, articlesData] = await Promise.all([
        api.stories.getAll(1, 50),
        api.community.getArticles(),
      ]);
      const stories = storyData.items || [];
      const articleList: Article[] = [
        ...articlesData.news,
        ...articlesData.opinion,
        ...articlesData.creative,
      ];

      const featuredStories = stories.filter(s => s.featured && s.author_id === user.id);
      const featuredArticles = articleList.filter(a => a.featured && (
        (a.authorId && Number(a.authorId) === user.id) || a.authorPseudonym === user.pseudonym
      ));

      const featuredAll = [...featuredStories, ...featuredArticles];
      const totalFeatured = featuredAll.length;
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const featuredThisMonth = featuredAll.filter((item: { created_at?: string; createdAt?: string }) => {
        const timestamp = item.created_at || item.createdAt;
        if (!timestamp) return false;
        return new Date(timestamp) >= monthAgo;
      }).length;

      const badges: string[] = [];
      if (totalFeatured >= 1) badges.push('First Feature');
      if (totalFeatured >= 5) badges.push('Featured 5x');
      if (totalFeatured >= 10) badges.push('Featured 10x');
      if (featuredThisMonth >= 2) badges.push('2 Features This Month');
      if (featuredThisMonth >= 5) badges.push('5 Features This Month');
      setFeaturedBadges(badges);

      let nextLabel = 'First Feature';
      let current = totalFeatured;
      let target = 1;
      if (totalFeatured >= 1 && totalFeatured < 5) {
        nextLabel = 'Featured 5x';
        target = 5;
      } else if (totalFeatured >= 5 && totalFeatured < 10) {
        nextLabel = 'Featured 10x';
        target = 10;
      } else if (totalFeatured >= 10) {
        nextLabel = '5 Features This Month';
        current = featuredThisMonth;
        target = 5;
      }
      setFeaturedProgress({ nextLabel, current, target });
    } catch { /* ignore */ }
  };

  const fetchOrganizerStatus = async () => {
    try {
      const data = await api.organizer.getStatus();
      setOrganizerStatus(data);
    } catch {
      setOrganizerStatus({ hasApplied: false, isOrganizer: false, role: 'participant' });
    } finally {
      setIsLoading(false);
    }
  };

  const submitOrganizerApplication = async () => {
    setIsSubmittingApplication(true);
    try {
      const result = await api.organizer.apply(applicationForm);
      localStorage.setItem('organizer_applied', 'true');
      if (result.autoApproved) {
        alert('Your organizer application has been auto-approved for beta testing!');
      } else {
        alert('Application submitted successfully!');
      }
      setApplicationForm({
        organizationName: '', organizationType: '', experience: '',
        causeFocus: [], contactInfo: { phone: '', website: '', socialMedia: '' },
        references: [], motivation: ''
      });
      fetchOrganizerStatus();
      setActiveTab("organizer");
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to submit application.');
    } finally {
      setIsSubmittingApplication(false);
    }
  };

  const updateCauseFocus = (cause: string, checked: boolean) => {
    setApplicationForm(prev => ({
      ...prev,
      causeFocus: checked ? [...prev.causeFocus, cause] : prev.causeFocus.filter(c => c !== cause)
    }));
  };

  const completedTodos = todos.filter(t => t.is_completed);
  const pendingTodos = todos.filter(t => !t.is_completed);
  const progressPct = profile ? Math.min(100, (profile.points / profile.points_to_level_up) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-institutional)]"></div>
      </div>
    );
  }

  // Desktop view
  if (desktopEnabled && viewMode === 'desktop' && profile) {
    return (
      <div className="relative min-h-screen">
        <div className="fixed top-16 right-4 z-50">
          <button
            onClick={() => setViewMode('classic')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/20 backdrop-blur shadow-lg transition-colors"
            style={{ color: 'var(--text-color, #333)' }}
          >
            <LayoutList className="w-3.5 h-3.5" /> Classic View
          </button>
        </div>
        <DesktopCanvas
          user={{ pseudonym: profile.pseudonym, role: profile.role, level: profile.level, points: profile.points }}
          badges={featuredBadges}
          todos={todos.map(t => ({ id: t.id, title: t.title, is_completed: t.is_completed, points_assigned: t.points_assigned }))}
          challenges={challenges.map(c => ({ id: c.id, title: c.title, progress: c.progress, target: c.target, status: c.status }))}
        />
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'cockpit', label: 'Cockpit' },
    { id: 'commons', label: 'Civic Commons' },
    { id: 'todos', label: `Todos (${pendingTodos.length})` },
    { id: 'completed', label: `Completed (${completedTodos.length})` },
    { id: 'challenges', label: `Challenges (${challenges.length})` },
    { id: 'timebank', label: `Timebank (${timeEntries.length})` },
    { id: 'organizer', label: 'Organizer' },
    { id: 'notifications', label: `Notifications (${notifications.length})` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="card-civic overflow-hidden p-0">
          {/* Header */}
          <div className="p-6 text-white relative" style={{ background: 'linear-gradient(135deg, var(--color-institutional), var(--color-forest))' }}>
            {desktopEnabled && (
              <button
                onClick={() => setViewMode('desktop')}
                className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/15 hover:bg-white/25 transition-colors"
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop View
              </button>
            )}
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold backdrop-blur-sm">
                {profile?.pseudonym?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
                  {profile?.pseudonym || profile?.username}
                </h1>
                <p className="text-white/80 text-sm capitalize">{profile?.role}</p>
                {onboardingComplete && (
                  <span className="inline-flex items-center px-2 py-0.5 mt-1 text-xs font-semibold rounded-full bg-white/20">
                    Journey Complete
                  </span>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm font-mono-data">Level {profile?.level}</span>
                  <span className="text-sm font-mono-data">{profile?.points} pts</span>
                </div>
                <div className="mt-2 w-48">
                  <div className="progress-bar" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    <div className="progress-bar-fill" style={{ width: `${progressPct}%`, backgroundColor: 'var(--color-accent)' }} />
                  </div>
                  <p className="text-xs text-white/60 mt-1">{Math.round(progressPct)}% to next level</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-[var(--color-border)] overflow-x-auto">
            <nav className="flex">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-[var(--color-institutional)] text-[var(--color-institutional)]'
                      : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Profile Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-muted-foreground)] mb-1">Username</label>
                      <p>{profile?.username}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-muted-foreground)] mb-1">Pseudonym</label>
                      <p>{profile?.pseudonym}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-muted-foreground)] mb-1">Role</label>
                      <p className="capitalize">{profile?.role}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-muted-foreground)] mb-1">Level</label>
                      <p className="font-mono-data">{profile?.level}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-serif)' }}>Featured Badges</h3>
                  {featuredBadges.length === 0 ? (
                    <p className="text-[var(--color-muted-foreground)]">No featured badges yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {featuredBadges.map((badge) => {
                        const icon = badge.includes('First') ? '★' : badge.includes('10') ? '✦' : badge.includes('5') ? '✪' : '☆';
                        return (
                          <span key={badge} className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-sage-light)] text-[var(--color-forest)] flex items-center gap-1">
                            <span>{icon}</span>
                            {badge}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {featuredProgress && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)] mb-1">
                        <span>Next badge: {featuredProgress.nextLabel}</span>
                        <span>{featuredProgress.current}/{featuredProgress.target}</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${Math.min(100, (featuredProgress.current / featuredProgress.target) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'cockpit' && (
              <div className="space-y-6">
                <div className="card-civic">
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Organiser Cockpit</h3>
                  <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
                    Your organiser intelligence view: competency, needs signals, matching, and performance snapshots.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/organizer/intelligence" className="btn-pill btn-pill-primary text-sm">Open Cockpit</Link>
                    <Link href="/organizer/competency" className="btn-pill btn-pill-outline text-sm">Competency Graph</Link>
                    <Link href="/organizer/guilds" className="btn-pill btn-pill-outline text-sm">Guilds</Link>
                  </div>
                </div>
                <div className="card-civic">
                  <h4 className="text-md font-semibold mb-2">Status Snapshot</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-[var(--color-muted-foreground)]">Role</p>
                      <p className="font-medium capitalize">{profile?.role}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-muted-foreground)]">Level</p>
                      <p className="font-medium font-mono-data">{profile?.level}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-muted-foreground)]">Points</p>
                      <p className="font-medium font-mono-data">{profile?.points}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'commons' && (
              <div className="space-y-6">
                <div className="card-civic">
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Civic Commons</h3>
                  <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
                    Your community footprint, collaborations, and public-facing contributions.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/community#stories" className="btn-pill btn-pill-outline text-sm">Community Stories</Link>
                    <Link href="/community#microcosms" className="btn-pill btn-pill-outline text-sm">Microcosms</Link>
                    <Link href="/teams" className="btn-pill btn-pill-outline text-sm">Teams</Link>
                  </div>
                </div>
                <div className="card-civic">
                  <h4 className="text-md font-semibold mb-2">Public View</h4>
                  <p className="text-sm text-[var(--color-muted-foreground)] mb-3">
                    Public-facing elements are limited to pseudonym, role, and featured badges.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--color-muted)] flex items-center justify-center text-lg font-bold">
                      {profile?.pseudonym?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-semibold">{profile?.pseudonym || profile?.username}</p>
                      <p className="text-sm text-[var(--color-muted-foreground)] capitalize">{profile?.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'todos' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Todo List</h3>
                {pendingTodos.length === 0 ? (
                  <p className="text-[var(--color-muted-foreground)]">No pending todos. Add actions to your todo list!</p>
                ) : (
                  pendingTodos.map((todo) => (
                    <div key={todo.id} className="card-civic flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{todo.title}</h4>
                        <p className="text-sm text-[var(--color-muted-foreground)] line-clamp-1">{todo.details}</p>
                        <span className="text-xs font-mono-data text-[var(--color-sage)]">{todo.points_assigned} pts</span>
                      </div>
                      <Link href="/actions" className="btn-pill btn-pill-sage text-sm">View Action</Link>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'completed' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Completed Actions</h3>
                {completedTodos.length === 0 ? (
                  <p className="text-[var(--color-muted-foreground)]">No completed actions yet.</p>
                ) : (
                  completedTodos.map((todo) => (
                    <div key={todo.id} className="card-civic flex items-center justify-between opacity-75">
                      <div>
                        <h4 className="font-semibold line-through">{todo.title}</h4>
                        <span className="text-xs font-mono-data text-[var(--color-sage)]">{todo.points_assigned} pts earned</span>
                      </div>
                      <span className="text-[var(--color-sage)] text-sm font-medium">Completed</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'organizer' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Organizer Status</h3>
                  {organizerStatus?.isOrganizer && (
                    <span className="px-3 py-1 bg-[var(--color-sage-light)] text-[var(--color-forest)] rounded-full text-sm font-semibold">
                      Organizer
                    </span>
                  )}
                </div>

                {organizerStatus?.isOrganizer ? (
                  <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-sage-light)' }}>
                    <h4 className="font-semibold text-[var(--color-forest)] mb-2">You are an Organizer!</h4>
                    <p className="text-sm text-[var(--color-forest)] mb-4">You can create actions and events for the community.</p>
                    <div className="space-y-2">
                      <Link href="/actions" className="block w-full btn-pill btn-pill-sage text-center">Create Action</Link>
                      <Link href="/events" className="block w-full btn-pill btn-pill-primary text-center">Create Event</Link>
                      <Link href="/organizer/intelligence" className="block w-full btn-pill btn-pill-outline text-center">Organiser Console</Link>
                    </div>
                  </div>
                ) : organizerStatus?.hasApplied ? (
                  <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-accent-light)' }}>
                    <h4 className="font-semibold text-[var(--color-accent)]">Application Pending</h4>
                    <p className="text-sm text-[var(--color-accent)]">Your organizer application is being reviewed.</p>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); submitOrganizerApplication(); }} className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-institutional-light)' }}>
                      <h4 className="font-semibold text-[var(--color-institutional)] mb-1">Become an Organizer</h4>
                      <p className="text-sm text-[var(--color-institutional)]">Organizers can create actions and events.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Organization Name *</label>
                        <input type="text" required value={applicationForm.organizationName}
                          onChange={e => setApplicationForm(p => ({ ...p, organizationName: e.target.value }))}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Type *</label>
                        <select required value={applicationForm.organizationType}
                          onChange={e => setApplicationForm(p => ({ ...p, organizationType: e.target.value }))}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
                          <option value="">Select</option>
                          <option value="community-group">Community Group</option>
                          <option value="non-profit">Non-Profit</option>
                          <option value="educational">Educational</option>
                          <option value="grassroots">Grassroots</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Experience *</label>
                      <textarea required rows={3} value={applicationForm.experience}
                        onChange={e => setApplicationForm(p => ({ ...p, experience: e.target.value }))}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Cause Focus</label>
                      <div className="flex flex-wrap gap-3">
                        {['Environmental', 'Social Justice', 'Education', 'Community Development', 'Climate Action'].map(cause => (
                          <label key={cause} className="flex items-center gap-1.5 text-sm">
                            <input type="checkbox" checked={applicationForm.causeFocus.includes(cause)}
                              onChange={e => updateCauseFocus(cause, e.target.checked)} />
                            {cause}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Motivation *</label>
                      <textarea required rows={3} value={applicationForm.motivation}
                        onChange={e => setApplicationForm(p => ({ ...p, motivation: e.target.value }))}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" disabled={isSubmittingApplication} className="btn-pill btn-pill-primary disabled:opacity-50">
                        {isSubmittingApplication ? 'Submitting...' : 'Submit Application'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'challenges' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Weekly Challenges</h3>
                {challenges.length === 0 ? (
                  <p className="text-[var(--color-muted-foreground)]">No challenges available yet.</p>
                ) : (
                  challenges.map((challenge) => {
                    const pct = Math.min(100, Math.round((challenge.progress / challenge.target) * 100));
                    return (
                      <div key={challenge.id} className="card-civic">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{challenge.title}</h4>
                            <p className="text-sm text-[var(--color-muted-foreground)]">{challenge.description}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            challenge.status === 'complete'
                              ? 'bg-[var(--color-sage-light)] text-[var(--color-forest)]'
                              : 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                          }`}>
                            {challenge.status === 'complete' ? 'Complete' : 'In progress'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span>{challenge.progress}/{challenge.target} complete</span>
                          <span className="font-mono-data">+{challenge.reward_points} pts</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'timebank' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Timebank</h3>
                <div className="card-civic">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--color-muted-foreground)]">Burnout Risk</p>
                      <p className="text-lg font-semibold">{burnout ? burnout.risk : 'unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[var(--color-muted-foreground)]">Score</p>
                      <p className="text-lg font-mono-data">{burnout ? Math.round(burnout.score) : 0}</p>
                    </div>
                  </div>
                </div>
                {timeEntries.length === 0 ? (
                  <p className="text-[var(--color-muted-foreground)]">No time entries yet. Log hours to build recognition.</p>
                ) : (
                  timeEntries.map((entry) => (
                    <div key={entry.id} className="card-civic flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{entry.activity_type}</h4>
                        <p className="text-sm text-[var(--color-muted-foreground)]">{new Date(entry.occurred_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono-data">{entry.hours} hrs</div>
                        <div className="text-xs text-[var(--color-muted-foreground)]">{entry.verification_status}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Notifications</h3>
                {notifications.length === 0 ? (
                  <p className="text-[var(--color-muted-foreground)]">No notifications yet.</p>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id}
                      className={`p-4 rounded-lg border ${
                        notif.is_read
                          ? 'bg-[var(--color-muted)] border-[var(--color-border)]'
                          : 'bg-[var(--color-institutional-light)] border-[var(--color-institutional)]'
                      }`}>
                      <p className="text-sm">{notif.message}</p>
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        {new Date(notif.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
