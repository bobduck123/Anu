'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthGateCard from '@/components/auth/AuthGateCard';
import { api, TodoResponse, NotificationResponse, Challenge, Article } from '@/lib/api';
import { burnoutApi, timebankApi, type TimeEntry } from '@/lib/api/endpoints';
import { useFeatureFlag } from '@/lib/featureFlags';
import { DesktopCanvas } from '@/ui/patterns/profile-desktop';
import {
  Award,
  Bell,
  CheckCircle2,
  Compass,
  LayoutList,
  Monitor,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  AnuChamberCard,
  AnuChip,
  AnuControlButton,
  AnuControlLink,
  AnuHeroMetric,
  AnuPageHero,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';

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

type ChamberTab = 'overview' | 'tasks' | 'commons' | 'organizer' | 'inbox';

const chamberInputClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-400';

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <AnuControlButton
      onClick={onClick}
      tone={active ? 'active' : 'default'}
      className="min-w-[8rem] justify-center text-sm"
    >
      {label}
    </AnuControlButton>
  );
}

function ProfileField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm text-slate-100">{value ?? 'n/a'}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todos, setTodos] = useState<TodoResponse[]>([]);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [organizerStatus, setOrganizerStatus] = useState<OrganizerStatus | null>(null);
  const [activeTab, setActiveTab] = useState<ChamberTab>('overview');
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
    organizationName: '',
    organizationType: '',
    experience: '',
    causeFocus: [] as string[],
    contactInfo: { phone: '', website: '', socialMedia: '' },
    references: [] as Array<{ name: string; organization: string; contact: string }>,
    motivation: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    void Promise.all([fetchProfileData(), fetchOrganizerStatus()]).finally(() => setIsLoading(false));
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    try {
      setOnboardingComplete(localStorage.getItem('onboarding_complete') === 'true');
    } catch {
      setOnboardingComplete(false);
    }
  }, []);

  useEffect(() => {
    if (profile) {
      void loadFeaturedBadges(profile);
    }
  }, [profile]);

  const fetchProfileData = async () => {
    const fallbackProfile = user
      ? {
          id: Number(user.id) || 0,
          username: user.username,
          pseudonym: user.pseudonym || user.username,
          role: user.role,
          points: user.points || 0,
          level: user.level || 1,
          points_to_level_up: 100,
          node_id: user.nodeId ? Number(user.nodeId) : null,
        }
      : null;

    try {
      setProfile(await api.users.me());
    } catch {
      setProfile(fallbackProfile);
    }
    try {
      setTodos(await api.todos.getAll());
    } catch {}
    try {
      setNotifications(await api.notifications.getAll());
    } catch {}
    try {
      setChallenges(await api.engagement.getChallenges());
    } catch {}
    try {
      const timeData = await timebankApi.list();
      setTimeEntries(timeData.entries || []);
    } catch {}
    try {
      const burnoutData = await burnoutApi.me();
      setBurnout({ score: burnoutData.score, risk: burnoutData.risk });
    } catch {}
  };

  const loadFeaturedBadges = async (currentUser: UserProfile) => {
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
      const featuredStories = stories.filter((story) => story.featured && story.author_id === currentUser.id);
      const featuredArticles = articleList.filter(
        (article) =>
          article.featured &&
          ((article.authorId && Number(article.authorId) === currentUser.id) ||
            article.authorPseudonym === currentUser.pseudonym),
      );
      const featuredAll = [...featuredStories, ...featuredArticles];
      const totalFeatured = featuredAll.length;
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const featuredThisMonth = featuredAll.filter((item: { created_at?: string; createdAt?: string }) => {
        const timestamp = item.created_at || item.createdAt;
        return timestamp ? new Date(timestamp) >= monthAgo : false;
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
    } catch {}
  };

  const fetchOrganizerStatus = async () => {
    try {
      setOrganizerStatus(await api.organizer.getStatus());
    } catch {
      setOrganizerStatus({ hasApplied: false, isOrganizer: false, role: 'participant' });
    }
  };

  const submitOrganizerApplication = async () => {
    setIsSubmittingApplication(true);
    try {
      const result = await api.organizer.apply(applicationForm);
      localStorage.setItem('organizer_applied', 'true');
      alert(result.autoApproved ? 'Your organizer application has been auto-approved for beta testing.' : 'Application submitted successfully.');
      setApplicationForm({
        organizationName: '',
        organizationType: '',
        experience: '',
        causeFocus: [],
        contactInfo: { phone: '', website: '', socialMedia: '' },
        references: [],
        motivation: '',
      });
      void fetchOrganizerStatus();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to submit application.');
    } finally {
      setIsSubmittingApplication(false);
    }
  };

  const updateCauseFocus = (cause: string, checked: boolean) => {
    setApplicationForm((prev) => ({
      ...prev,
      causeFocus: checked ? [...prev.causeFocus, cause] : prev.causeFocus.filter((entry) => entry !== cause),
    }));
  };

  const pendingTodos = useMemo(() => todos.filter((todo) => !todo.is_completed), [todos]);
  const completedTodos = useMemo(() => todos.filter((todo) => todo.is_completed), [todos]);
  const unreadNotifications = useMemo(() => notifications.filter((notification) => !notification.is_read), [notifications]);
  const progressPct = profile ? Math.min(100, (profile.points / profile.points_to_level_up) * 100) : 0;
  const totalTimeHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const publicName = profile?.pseudonym || profile?.username || '?';

  const tabs = [
    { id: 'overview' as ChamberTab, label: 'Overview' },
    { id: 'tasks' as ChamberTab, label: `Tasks (${pendingTodos.length})` },
    { id: 'commons' as ChamberTab, label: 'Commons' },
    { id: 'organizer' as ChamberTab, label: 'Organizer' },
    { id: 'inbox' as ChamberTab, label: `Inbox (${unreadNotifications.length})` },
  ];

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--color-institutional)]" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <AuthGateCard
        eyebrow="Profile Cockpit"
        title="Sign in to open your profile cockpit"
        description="Your profile, organizer status, civic todos, notifications, and member progress are private to your account."
        secondaryHref="/manara"
        secondaryLabel="Open Manara"
      />
    );
  }

  if (desktopEnabled && viewMode === 'desktop' && profile) {
    return (
      <div className="relative min-h-screen">
        <div className="fixed inset-x-0 top-20 z-50 px-4">
          <div className="mx-auto max-w-5xl">
            <AnuSurfacePanel tone="quiet" className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <AnuChip tone="accent" icon={Monitor}>Experimental desktop</AnuChip>
                  <AnuChip tone="muted">Classic cockpit remains primary</AnuChip>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300/82">
                  The desktop workspace stays available as an alternate chamber, but the classic cockpit is the canonical profile surface.
                </p>
              </div>
              <AnuControlButton onClick={() => setViewMode('classic')} tone="active" iconLeft={LayoutList}>
                Return to classic cockpit
              </AnuControlButton>
            </AnuSurfacePanel>
          </div>
        </div>
        <DesktopCanvas
          user={{ pseudonym: profile.pseudonym, role: profile.role, level: profile.level, points: profile.points }}
          badges={featuredBadges}
          todos={todos.map((todo) => ({ id: todo.id, title: todo.title, is_completed: todo.is_completed, points_assigned: todo.points_assigned }))}
          challenges={challenges.map((challenge) => ({ id: String(challenge.id), title: challenge.title, progress: challenge.progress, target: challenge.target, status: challenge.status }))}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <AnuPageHero
          eyebrow="Profile cockpit"
          title={profile?.pseudonym || profile?.username}
          description="Private task, organizer, and notification surfaces live here. The cockpit is meant to feel local, accountable, and coherent."
          actions={
            <>
              <AnuControlLink href="/manara" tone="default" iconRight={Compass}>Open Manara</AnuControlLink>
              {desktopEnabled ? (
                <AnuControlButton onClick={() => setViewMode('desktop')} tone="active" iconLeft={Monitor}>
                  Open experimental desktop
                </AnuControlButton>
              ) : null}
            </>
          }
          aside={
            <AnuSurfacePanel tone="quiet" className="h-full">
              <div className="flex flex-wrap gap-2">
                <AnuChip tone="signal">Private chamber</AnuChip>
                {onboardingComplete ? <AnuChip tone="muted" icon={Sparkles}>Journey complete</AnuChip> : null}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300/84">
                Tasks, organizer status, and inbox surfaces should be faster to scan than the older fragmented tab stack.
              </p>
            </AnuSurfacePanel>
          }
        >
          <div className="grid gap-4 md:grid-cols-4">
            <AnuHeroMetric label="Level" value={String(profile?.level || 0)} detail={`${Math.round(progressPct)}% to next level`} />
            <AnuHeroMetric label="Points" value={String(profile?.points || 0)} detail="Personal contribution points currently recognized." />
            <AnuHeroMetric label="Pending tasks" value={String(pendingTodos.length)} detail={`${completedTodos.length} completed actions archived.`} />
            <AnuHeroMetric label="Unread inbox" value={String(unreadNotifications.length)} detail={`${notifications.length} total notifications in your chamber.`} />
          </div>
        </AnuPageHero>

        <div className="mt-8 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <TabButton key={tab.id} active={activeTab === tab.id} label={tab.label} onClick={() => setActiveTab(tab.id)} />
          ))}
        </div>

        <div className="mt-8 space-y-6">
          {activeTab === 'overview' ? (
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <AnuChamberCard eyebrow="Identity" title="Member profile" action={<AnuChip tone="muted">{profile?.role}</AnuChip>}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ProfileField label="Username" value={profile?.username} />
                  <ProfileField label="Pseudonym" value={profile?.pseudonym} />
                  <ProfileField label="Node" value={profile?.node_id} />
                  <ProfileField label="Time logged" value={`${totalTimeHours.toFixed(1)} hrs`} />
                </div>
              </AnuChamberCard>
              <AnuChamberCard eyebrow="Recognition" title="Featured badge ledger" tone={featuredBadges.length ? 'affirmed' : 'default'}>
                {featuredBadges.length ? (
                  <div className="flex flex-wrap gap-2">
                    {featuredBadges.map((badge) => (
                      <AnuChip key={badge} tone="signal" icon={Award}>{badge}</AnuChip>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-slate-300/82">No featured badges yet.</p>
                )}
                {featuredProgress ? (
                  <p className="mt-4 text-sm text-slate-300/82">
                    Next badge {featuredProgress.nextLabel}: {featuredProgress.current}/{featuredProgress.target}
                  </p>
                ) : null}
              </AnuChamberCard>
            </div>
          ) : null}

          {activeTab === 'tasks' ? (
            <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <AnuChamberCard eyebrow="Action queue" title="Pending civic tasks" tone={pendingTodos.length ? 'default' : 'affirmed'}>
                {pendingTodos.length ? (
                  <div className="space-y-3">
                    {pendingTodos.map((todo) => (
                      <div key={todo.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-semibold text-white">{todo.title}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-300/82">{todo.details}</p>
                          </div>
                          <AnuChip tone="muted">{todo.points_assigned} pts</AnuChip>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-slate-300/82">No pending tasks. The chamber is clear.</p>
                )}
              </AnuChamberCard>
              <div className="space-y-6">
                <AnuChamberCard eyebrow="Completed" title="Finished work" tone="affirmed">
                  {completedTodos.length ? (
                    <div className="space-y-3">
                      {completedTodos.map((todo) => (
                        <div key={todo.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-white line-through decoration-white/30">{todo.title}</p>
                              <p className="mt-1 text-xs text-slate-400">{todo.points_assigned} pts earned</p>
                            </div>
                            <CheckCircle2 className="h-5 w-5 text-[#6dc2a4]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-slate-300/82">No completed actions yet.</p>
                  )}
                </AnuChamberCard>
                <AnuChamberCard eyebrow="State" title="Challenges and wellbeing" tone={burnout?.risk && burnout.risk !== 'low' ? 'alert' : 'default'}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ProfileField label="Challenges" value={challenges.length} />
                    <ProfileField label="Burnout risk" value={burnout?.risk || 'Unknown'} />
                  </div>
                </AnuChamberCard>
              </div>
            </div>
          ) : null}

          {activeTab === 'commons' ? (
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <AnuChamberCard eyebrow="Public surface" title="How the commons sees you">
                <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.08] text-xl font-semibold text-white">
                    {publicName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{publicName}</p>
                    <p className="text-sm capitalize text-slate-400">{profile?.role}</p>
                  </div>
                </div>
              </AnuChamberCard>
              <AnuChamberCard eyebrow="Commons links" title="Move outward">
                <div className="grid gap-3 sm:grid-cols-2">
                  <AnuControlLink href="/community" tone="default" iconRight={Compass}>Open community</AnuControlLink>
                  <AnuControlLink href="/community/microcosms/join" tone="default" iconRight={Users}>Join a microcosm</AnuControlLink>
                  <AnuControlLink href="/teams" tone="default" iconRight={Users}>Open teams</AnuControlLink>
                  <AnuControlLink href="/manara" tone="default" iconRight={Compass}>Return to Manara</AnuControlLink>
                </div>
              </AnuChamberCard>
            </div>
          ) : null}

          {activeTab === 'organizer' ? (
            organizerStatus?.isOrganizer ? (
              <AnuChamberCard eyebrow="Organizer status" title="Organizer chamber unlocked" tone="affirmed" action={<AnuChip tone="signal">Organizer</AnuChip>}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <AnuControlLink href="/actions" tone="active">Create action</AnuControlLink>
                  <AnuControlLink href="/events" tone="default">Create event</AnuControlLink>
                  <AnuControlLink href="/organizer/intelligence" tone="default">Organizer console</AnuControlLink>
                  <AnuControlLink href="/organizer/guilds" tone="default">Guilds</AnuControlLink>
                </div>
              </AnuChamberCard>
            ) : organizerStatus?.hasApplied ? (
              <AnuChamberCard eyebrow="Organizer status" title="Application pending" tone="alert">
                <p className="text-sm leading-6 text-slate-300/82">Your organizer application is under review.</p>
              </AnuChamberCard>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[0.84fr_1.16fr]">
                <AnuChamberCard eyebrow="Organizer pathway" title="Become an organizer">
                  <p className="text-sm leading-6 text-slate-300/82">Use this chamber to establish intent, experience, and cause focus before moderation review.</p>
                </AnuChamberCard>
                <AnuChamberCard eyebrow="Application" title="Organizer application">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitOrganizerApplication();
                    }}
                    className="space-y-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        type="text"
                        required
                        value={applicationForm.organizationName}
                        onChange={(event) => setApplicationForm((prev) => ({ ...prev, organizationName: event.target.value }))}
                        placeholder="Organization name"
                        className={chamberInputClass}
                      />
                      <select
                        required
                        value={applicationForm.organizationType}
                        onChange={(event) => setApplicationForm((prev) => ({ ...prev, organizationType: event.target.value }))}
                        className={chamberInputClass}
                      >
                        <option value="">Select type</option>
                        <option value="community-group">Community Group</option>
                        <option value="non-profit">Non-Profit</option>
                        <option value="educational">Educational</option>
                        <option value="grassroots">Grassroots</option>
                      </select>
                    </div>
                    <textarea
                      required
                      rows={3}
                      value={applicationForm.experience}
                      onChange={(event) => setApplicationForm((prev) => ({ ...prev, experience: event.target.value }))}
                      placeholder="Experience"
                      className={chamberInputClass}
                    />
                    <div className="flex flex-wrap gap-3">
                      {['Environmental', 'Social Justice', 'Education', 'Community Development', 'Climate Action'].map((cause) => (
                        <label key={cause} className="flex items-center gap-2 text-sm text-slate-300/82">
                          <input
                            type="checkbox"
                            checked={applicationForm.causeFocus.includes(cause)}
                            onChange={(event) => updateCauseFocus(cause, event.target.checked)}
                          />
                          {cause}
                        </label>
                      ))}
                    </div>
                    <textarea
                      required
                      rows={3}
                      value={applicationForm.motivation}
                      onChange={(event) => setApplicationForm((prev) => ({ ...prev, motivation: event.target.value }))}
                      placeholder="Motivation"
                      className={chamberInputClass}
                    />
                    <div className="flex justify-end">
                      <AnuControlButton type="submit" tone="active" disabled={isSubmittingApplication}>
                        {isSubmittingApplication ? 'Submitting...' : 'Submit application'}
                      </AnuControlButton>
                    </div>
                  </form>
                </AnuChamberCard>
              </div>
            )
          ) : null}

          {activeTab === 'inbox' ? (
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <AnuChamberCard
                eyebrow="Notifications"
                title="Inbox stack"
                tone={unreadNotifications.length ? 'alert' : 'default'}
                action={<AnuChip tone={unreadNotifications.length ? 'accent' : 'muted'}>{unreadNotifications.length} unread</AnuChip>}
              >
                {notifications.length ? (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div key={notification.id} className={`rounded-xl border p-4 ${notification.is_read ? 'border-white/10 bg-white/[0.04]' : 'border-[rgba(216,169,95,0.24)] bg-[rgba(216,169,95,0.08)]'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm leading-6 text-slate-100">{notification.message}</p>
                          {!notification.is_read ? <Bell className="h-4 w-4 text-[#f1d3a1]" /> : null}
                        </div>
                        <p className="mt-3 text-[11px] text-slate-400">{new Date(notification.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-slate-300/82">No notifications yet.</p>
                )}
              </AnuChamberCard>
              <AnuChamberCard eyebrow="Protocol" title="Message and alert doctrine">
                <p className="text-sm leading-6 text-slate-300/82">
                  Future thread previews and message lists should inherit chamber clarity: semantic grouping first, novelty last.
                </p>
              </AnuChamberCard>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
