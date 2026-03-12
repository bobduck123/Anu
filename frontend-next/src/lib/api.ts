import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();

// Helper function to get auth headers
const getAuthHeaders = (): Record<string, string> => {
  // Only access localStorage on the client side
  if (typeof window === 'undefined') return {};
  try {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

export interface Action {
  _id: string;
  title: string;
  details: string;
  instructions: string;
  actionTile?: string;
  actionType: string;
  isOnline: boolean;
  isGlobal: boolean;
  location?: {
    coordinates: [number, number];
  };
  address?: string;
  city?: string;
  country?: string;
  startDate: string;
  endDate: string;
  milestones: {
    first?: string;
    second?: string;
    final?: string;
  };
  pointsAssigned: number;
  recurrence: string;
  ownerId: string;
  completions: number;
  trendLabel?: string;
  trendScore?: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  address?: string;
  city?: string;
  country?: string;
  longitude?: number;
  latitude?: number;
  isOnline: boolean;
  isGlobal: boolean;
  date: string;
  time: string;
  venueId: string;
  attendees: number;
  goal: number;
  pointsAssigned: number;
  reminderWeek?: string;
  reminderDay?: string;
  reminderHours?: string;
  ownerId: string;
  trendLabel?: string;
  trendScore?: number;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  authorPseudonym: string;
  createdAt: string;
  microcosmId?: string;
  likes: number;
  comments: number;
  featured?: boolean;
  authorId?: string;
}

export interface Comment {
  id: string;
  content: string;
  timestamp: string;
  authorPseudonym?: string;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: { [option: string]: number };
}

export interface Microcosm {
  id: string;
  name: string;
  description: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  impact: string;
  imageUrl?: string;
  inStock: boolean;
  sellerId: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  product: Product;
}

export interface CheckoutSession {
  id?: string;
  url?: string;
}

export interface OrganizerApplication {
  organizationName: string;
  organizationType: string;
  experience: string;
  causeFocus: string[];
  contactInfo: {
    phone?: string;
    website?: string;
    socialMedia?: string;
  };
  references: Array<{
    name: string;
    organization: string;
    contact: string;
  }>;
  motivation: string;
}

export interface OrganizerStatus {
  hasApplied: boolean;
  isOrganizer: boolean;
  role: string;
  team_count?: number;
  events_hosted?: number;
  application?: {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: string;
    reviewedAt?: string;
    reviewNotes?: string;
    organizationName: string;
    organizationType: string;
  };
}

export interface Venue {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  is_online: boolean;
  is_global: boolean;
  user_id: number;
}

export interface UserProfile {
  id: number;
  username: string;
  pseudonym: string;
  role: string;
  points: number;
  level: number;
  points_to_level_up: number;
  node_id: number | null;
}

export interface MemberResponse {
  id: number;
  pseudonym: string;
  role: string;
  level: number;
  points: number;
  node_id: number | null;
}

export interface MessageResponse {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  timestamp: string;
}

export interface TodoResponse {
  id: number;
  action_id: number;
  is_completed: boolean;
  title: string;
  details: string;
  instructions: string;
  action_tile?: string;
  action_type: string;
  is_online: boolean;
  is_global: boolean;
  points_assigned: number;
}

export interface NotificationResponse {
  id: number;
  user_id: number;
  message: string;
  is_read: boolean;
  timestamp: string;
}

export interface LedgerEntry {
  id: number;
  entry_type: string;
  amount_cents: number;
  description: string;
  pool_id?: number;
  pool_label?: string;
  user_id?: number;
  reference_id?: string;
  reference_type?: string;
  created_at: string;
  created_by?: number;
}

export interface LedgerResponse {
  entries: LedgerEntry[];
  total: number;
  page: number;
  pages: number;
}

export interface ImpactSummary {
  actions: number;
  events: number;
  articles: number;
  members: number;
  completions: number;
  points: number;
  actions_completed?: number;
  event_attendance?: number;
  volunteer_hours?: number;
  relief_paid_cents?: number;
  savings_cents?: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward_points: number;
  status: 'complete' | 'in_progress';
}

export interface RecommendationResult<T> {
  type: 'actions' | 'events';
  items: T[];
}

export interface DiscoverFeed {
  upcoming_events: Event[];
  top_actions: Action[];
  active_microcosms: { id: number; name: string; description?: string }[];
  featured_constellations?: { id: number; name: string; description?: string; domain?: string }[];
  highlighted_stories: { id: number; title: string; content?: string; created_at?: string }[];
  highlighted_articles: { id: number; title: string; content?: string; created_at?: string }[];
}

export interface StoryPost {
  id: number;
  title: string;
  content: string;
  media_url?: string;
  featured?: boolean;
  author_id: number;
  author_pseudonym: string;
  created_at: string;
  reactions: Record<string, number>;
}

export interface RecognitionPayload {
  top_members: { id: number; pseudonym: string; points: number; role: string }[];
  organizers: { id: number; pseudonym: string; events_hosted: number }[];
  active_nodes: { id: number; name: string; member_count: number }[];
}

export interface CollaborativeChallenge {
  id: number;
  title: string;
  description: string;
  metric_type: string;
  target: number;
  progress: number;
  reward_points: number;
  status: 'complete' | 'in_progress';
}

export interface CollaborativePayload {
  scope: 'node' | 'microcosm';
  scope_id: number;
  scope_name?: string;
  challenges: CollaborativeChallenge[];
}

export interface PoolMetrics {
  total_pools: number;
  active_pools: number;
  total_target_cents: number;
  total_balance_cents: number;
}

export interface ActionProof {
  id: number;
  action_id: number;
  user_id: number;
  before_url?: string;
  after_url?: string;
  proof_url?: string;
  verified: boolean;
  created_at?: string;
}

export interface ActionImpactMetric {
  id: number;
  action_id: number;
  label: string;
  value: number;
  unit?: string;
  created_at?: string;
}

export interface DiscoveryPack {
  id: number;
  name: string;
  description?: string;
  city?: string;
  country?: string;
  center_lat?: number;
  center_lng?: number;
  reward_points: number;
  item_count: number;
  created_at?: string;
}

export interface DiscoveryPackItem {
  item_type: 'action' | 'event';
  item: Action | Event;
}

export interface DiscoveryPackDetail {
  pack: DiscoveryPack;
  items: DiscoveryPackItem[];
}

export interface CreditSummary {
  balance: number;
  earned: number;
  spent: number;
}

export interface CreditTx {
  id: number;
  tx_type: 'earn' | 'spend';
  amount: number;
  description?: string;
  reference_id?: string;
  created_at?: string;
}

export interface LearningTrack {
  id: number;
  pillar: string;
  title: string;
  description?: string;
  jurisdiction_default?: string;
  version: number;
}

export interface LearningModule {
  id: number;
  title: string;
  description?: string;
  sequence: number;
  completion_threshold: number;
  retake_limit: number;
  expiry_months?: number | null;
  version: number;
}

export interface Lesson {
  id: number;
  module_id: number;
  title: string;
  delivery_type: string;
  content_ref?: string;
  sequence: number;
  version: number;
}

export interface Assessment {
  id: number;
  module_id: number;
  title: string;
  pass_score: number;
  retake_limit: number;
  version: number;
}

export interface CertificationRecord {
  id: number;
  certificate_uid: string;
  module_id: number;
  issued_at?: string;
  expires_at?: string | null;
  status: string;
  public_visible: boolean;
}

export interface CompetencyProfile {
  user_id: number;
  competency_matrix: Record<string, number>;
}

export interface RiskTier {
  id: number;
  name: string;
  description?: string;
  level: number;
  min_cert_level: number;
  compliance_required: boolean;
}

export interface CapitalSnapshot {
  pool_id: number;
  bucket: string;
  period_start: string;
  period_end: string;
  inflow_cents: number;
  outflow_cents: number;
  net_flow_cents: number;
  balance_cents: number;
  allocation_ratio: number;
}

export interface CapitalStressFlag {
  flag_type: string;
  severity: string;
  message?: string;
  created_at?: string;
}

export interface CapitalResilience {
  index_value: number;
  formula_version: number;
  components: Record<string, number>;
  created_at?: string;
}

export interface TransparencyPayload {
  node: { slug: string; name: string };
  pools: Array<{ slug: string; balance: number | null }>;
  allocation_breakdown: Array<{ slug: string; ratio: number }>;
  certification_count?: number | null;
  incident_summary?: number | null;
}

export interface CollectiveStreakPayload {
  scope: 'node' | 'microcosm' | 'team';
  scope_id: number;
  scope_name?: string;
  current_streak: number;
  best_streak: number;
  last_week_start?: string | null;
  reward_points_granted: number;
  weekly_stats: Record<string, number | boolean>;
  reward_milestones: { next: number | null; completed: number[] };
}

export interface TeamSummary {
  id: number;
  name: string;
  description?: string;
  microcosm_id?: number | null;
  microcosm_name?: string | null;
  created_by: number;
  created_at?: string;
  member_count: number;
  is_member: boolean;
}

export interface TeamMember {
  id: number;
  pseudonym: string;
  role: string;
  joined_at?: string;
}

export interface TeamChallenge {
  id: number;
  title: string;
  description: string;
  metric_type: string;
  target: number;
  progress: number;
  reward_points: number;
  status: 'complete' | 'in_progress';
}

export interface TeamAction {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  points: number;
  created_by: number;
  created_at?: string;
  completed_count: number;
}

type ActionResponse = {
  id: string | number;
  title: string;
  details: string;
  instructions: string;
  action_tile?: string;
  action_type: string;
  is_online: boolean;
  is_global: boolean;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  country?: string;
  start_date: string;
  end_date: string;
  first_milestone?: string;
  second_milestone?: string;
  final_milestone?: string;
  points_assigned: number;
  recurrence: string;
  user_id: string | number;
  completions: number;
  trend_label?: string;
  trend_score?: number;
};

type ArticlesResponse = {
  opinion?: ArticleResponse[];
  news?: ArticleResponse[];
  creative?: ArticleResponse[];
};

type ArticleResponse = {
  id: string | number;
  title: string;
  content: string;
  category: string;
  author_pseudonym?: string;
  created_at?: string;
  microcosm_id?: string | number;
  author_id?: string | number;
  likes?: number;
  comments?: number;
  featured?: boolean;
};

type CommentResponse = {
  id: string | number;
  content: string;
  timestamp: string;
  author_pseudonym?: string;
};

type MicrocosmResponse = {
  id: string | number;
  name: string;
  description: string;
};

type EventResponse = {
  id: string | number;
  title: string;
  description: string;
  address?: string;
  city?: string;
  country?: string;
  longitude?: number;
  latitude?: number;
  is_online: boolean;
  is_global: boolean;
  date: string;
  time: string;
  venue_id: string | number;
  attendees: number;
  goal: number;
  points_assigned: number;
  reminder_week?: string;
  reminder_day?: string;
  reminder_hours?: string;
  user_id: string | number;
  trend_label?: string;
  trend_score?: number;
};

const normalizeAction = (action: ActionResponse): Action => ({
  _id: String(action.id),
  title: action.title,
  details: action.details,
  instructions: action.instructions,
  actionTile: action.action_tile,
  actionType: action.action_type,
  isOnline: action.is_online,
  isGlobal: action.is_global,
  location: action.latitude != null && action.longitude != null
    ? { coordinates: [action.longitude, action.latitude] as [number, number] }
    : undefined,
  address: action.address,
  city: action.city,
  country: action.country,
  startDate: action.start_date,
  endDate: action.end_date,
  milestones: {
    first: action.first_milestone,
    second: action.second_milestone,
    final: action.final_milestone,
  },
  pointsAssigned: action.points_assigned,
  recurrence: action.recurrence,
  ownerId: String(action.user_id),
  completions: action.completions,
  trendLabel: action.trend_label,
  trendScore: action.trend_score,
});

const normalizeEvent = (event: EventResponse): Event => ({
  id: String(event.id),
  title: event.title,
  description: event.description,
  address: event.address,
  city: event.city,
  country: event.country,
  longitude: event.longitude,
  latitude: event.latitude,
  isOnline: event.is_online,
  isGlobal: event.is_global,
  date: event.date,
  time: event.time,
  venueId: String(event.venue_id),
  attendees: event.attendees,
  goal: event.goal,
  pointsAssigned: event.points_assigned,
  reminderWeek: event.reminder_week,
  reminderDay: event.reminder_day,
  reminderHours: event.reminder_hours,
  ownerId: String(event.user_id),
  trendLabel: event.trend_label,
  trendScore: event.trend_score,
});

export const api = {
  engagement: {
    getImpactSummary: async (): Promise<ImpactSummary> => {
      const res = await fetch(`${API_BASE}/api/engagement/impact-summary`);
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Impact summary API not available, using fallback');
          return {
            actions: 12,
            events: 5,
            articles: 7,
            members: 48,
            completions: 22,
            points: 1250,
            actions_completed: 22,
            event_attendance: 120,
            volunteer_hours: 64,
            relief_paid_cents: 18500,
            savings_cents: 42000,
          };
        }
        throw new Error('Failed to fetch impact summary');
      }
      const data = await res.json();
      return data.data || data;
    },
    getChallenges: async (): Promise<Challenge[]> => {
      const res = await fetch(`${API_BASE}/api/engagement/challenges`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Challenges API not available, using fallback');
          return [
            {
              id: 'complete_actions_3',
              title: 'Complete 3 Actions',
              description: 'Finish three actions to boost your impact streak.',
              target: 3,
              progress: 1,
              reward_points: 25,
              status: 'in_progress',
            },
            {
              id: 'host_event_1',
              title: 'Host an Event',
              description: 'Create a community event.',
              target: 1,
              progress: 0,
              reward_points: 40,
              status: 'in_progress',
            },
          ];
        }
        throw new Error('Failed to fetch challenges');
      }
      const data = await res.json();
      return data.data?.challenges || data.challenges || data;
    },
    getRecommendations: async (params?: { type?: 'actions' | 'events'; limit?: number; lat?: number; lng?: number }): Promise<RecommendationResult<Action | Event>> => {
      const query = new URLSearchParams();
      if (params?.type) query.set('type', params.type);
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.lat != null) query.set('lat', String(params.lat));
      if (params?.lng != null) query.set('lng', String(params.lng));
      const res = await fetch(`${API_BASE}/api/engagement/recommendations?${query.toString()}`);
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Recommendations API not available, using fallback');
          return {
            type: params?.type || 'actions',
            items: [],
          };
        }
        throw new Error('Failed to fetch recommendations');
      }
      const data = await res.json();
      const payload = data.data || data;
      if (payload.type === 'events') {
        return {
          type: 'events',
          items: (payload.items || []).map((e: EventResponse) => normalizeEvent(e)),
        };
      }
      return {
        type: 'actions',
        items: (payload.items || []).map((a: ActionResponse) => normalizeAction(a)),
      };
    },
    getDiscoverFeed: async (): Promise<DiscoverFeed> => {
      const res = await fetch(`${API_BASE}/api/engagement/discover-feed`);
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Discover feed API not available, using fallback');
          return {
            upcoming_events: [],
            top_actions: [],
            active_microcosms: [],
            featured_constellations: [],
            highlighted_stories: [],
            highlighted_articles: [],
          };
        }
        throw new Error('Failed to fetch discover feed');
      }
      const data = await res.json();
      const payload = data.data || data;
      return {
        upcoming_events: (payload.upcoming_events || []).map((e: EventResponse) => normalizeEvent(e)),
        top_actions: (payload.top_actions || []).map((a: ActionResponse) => normalizeAction(a)),
        active_microcosms: payload.active_microcosms || [],
        featured_constellations: payload.featured_constellations || [],
        highlighted_stories: payload.highlighted_stories || [],
        highlighted_articles: payload.highlighted_articles || [],
      };
    },
    getTrending: async (params?: { type?: 'actions' | 'events'; limit?: number }): Promise<RecommendationResult<Action | Event>> => {
      const query = new URLSearchParams();
      if (params?.type) query.set('type', params.type);
      if (params?.limit) query.set('limit', String(params.limit));
      const res = await fetch(`${API_BASE}/api/engagement/trending?${query.toString()}`);
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Trending API not available, using fallback');
          return { type: params?.type || 'actions', items: [] };
        }
        throw new Error('Failed to fetch trending');
      }
      const data = await res.json();
      const payload = data.data || data;
      if (payload.type === 'events') {
        return { type: 'events', items: (payload.items || []).map((e: EventResponse) => normalizeEvent(e)) };
      }
      return { type: 'actions', items: (payload.items || []).map((a: ActionResponse) => normalizeAction(a)) };
    },
    getRecognition: async (): Promise<RecognitionPayload> => {
      const res = await fetch(`${API_BASE}/api/engagement/recognition`);
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Recognition API not available, using fallback');
          return {
            top_members: [],
            organizers: [],
            active_nodes: [],
          };
        }
        throw new Error('Failed to fetch recognition');
      }
      const data = await res.json();
      return data.data || data;
    },
    getCollaborative: async (scope: 'node' | 'microcosm' = 'node', scopeId?: number): Promise<CollaborativePayload> => {
      const query = new URLSearchParams();
      query.set('scope', scope);
      if (scopeId != null) query.set('scope_id', String(scopeId));
      const res = await fetch(`${API_BASE}/api/engagement/collaborative?${query.toString()}`);
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Collaborative API not available, using fallback');
          return { scope, scope_id: scopeId || 0, challenges: [] };
        }
        throw new Error('Failed to fetch collaborative challenges');
      }
      const data = await res.json();
      return data.data || data;
    },
    getPoolMetrics: async (): Promise<PoolMetrics> => {
      const res = await fetch(`${API_BASE}/api/engagement/pool-metrics`);
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Pool metrics API not available, using fallback');
          return { total_pools: 0, active_pools: 0, total_target_cents: 0, total_balance_cents: 0 };
        }
        throw new Error('Failed to fetch pool metrics');
      }
      const data = await res.json();
      return data.data || data;
    },
    getCollectiveStreaks: async (scope: 'node' | 'microcosm' | 'team' = 'node', scopeId?: number): Promise<CollectiveStreakPayload | { streaks: CollectiveStreakPayload[] }> => {
      const query = new URLSearchParams();
      query.set('scope', scope);
      if (scopeId != null) query.set('scope_id', String(scopeId));
      const res = await fetch(`${API_BASE}/api/engagement/streaks?${query.toString()}`);
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Collective streaks API not available, using fallback');
          if (scope === 'microcosm' && scopeId == null) {
            return { streaks: [] };
          }
          return {
            scope,
            scope_id: scopeId || 0,
            scope_name: scope,
            current_streak: 1,
            best_streak: 1,
            last_week_start: null,
            reward_points_granted: 0,
            weekly_stats: {},
            reward_milestones: { next: 2, completed: [] },
          };
        }
        throw new Error('Failed to fetch collective streaks');
      }
      const data = await res.json();
      return data.data || data;
    },
  },
  stories: {
    getAll: async (page = 1, limit = 20): Promise<{ items: StoryPost[]; pagination: { page: number; limit: number; total: number; pages: number } }> => {
      const res = await fetch(`${API_BASE}/api/stories?page=${page}&limit=${limit}`);
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Stories API not available, using fallback');
          return { items: [], pagination: { page: 1, limit, total: 0, pages: 0 } };
        }
        throw new Error('Failed to fetch stories');
      }
      const data = await res.json();
      return data.data || data;
    },
    create: async (payload: { title: string; content: string; media_url?: string }): Promise<StoryPost> => {
      const res = await fetch(`${API_BASE}/api/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Stories API not available, using mock post');
          return {
            id: Date.now(),
            title: payload.title,
            content: payload.content,
            media_url: payload.media_url,
            author_id: 0,
            author_pseudonym: 'Anonymous',
            created_at: new Date().toISOString(),
            reactions: {},
          };
        }
        throw new Error('Failed to create story');
      }
      const data = await res.json();
      return data.data || data;
    },
    react: async (postId: number, reaction: 'clap' | 'heart' | 'spark'): Promise<{ post_id: number; reactions: Record<string, number> }> => {
      const res = await fetch(`${API_BASE}/api/stories/${postId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ reaction }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Stories reaction API not available, using mock');
          return { post_id: postId, reactions: {} };
        }
        throw new Error('Failed to react');
      }
      const data = await res.json();
      return data.data || data;
    },
    getTimeline: async (period: 'weekly' | 'monthly' = 'weekly', limit = 12): Promise<{ period: string; points: Array<{ label: string; start: string; end: string; count: number; cumulative: number; milestone?: number | null }>; milestones: Array<{ threshold: number; label: string; achieved_at: string }>; total: number }> => {
      const res = await fetch(`${API_BASE}/api/stories/timeline?period=${period}&limit=${limit}`);
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Stories timeline API not available, using fallback');
          return { period, points: [], milestones: [], total: 0 };
        }
        throw new Error('Failed to fetch stories timeline');
      }
      const data = await res.json();
      return data.data || data;
    },
    delete: async (postId: number): Promise<void> => {
      const res = await fetch(`${API_BASE}/api/stories/${postId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Delete story failed or unavailable');
          return;
        }
        throw new Error('Failed to delete story');
      }
    },
    feature: async (postId: number, featured: boolean): Promise<StoryPost> => {
      const res = await fetch(`${API_BASE}/api/stories/${postId}/feature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ featured }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Feature story failed or unavailable');
          return {
            id: postId,
            title: '',
            content: '',
            author_id: 0,
            author_pseudonym: 'Anonymous',
            created_at: new Date().toISOString(),
            reactions: {},
          };
        }
        throw new Error('Failed to feature story');
      }
      const data = await res.json();
      return data.data || data;
    },
  },
  teams: {
    list: async (microcosmId?: number): Promise<TeamSummary[]> => {
      const query = microcosmId ? `?microcosm_id=${microcosmId}` : '';
      const res = await fetch(`${API_BASE}/api/teams${query}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Teams API not available, returning empty list');
          return [];
        }
        throw new Error('Failed to fetch teams');
      }
      const data = await res.json();
      const payload = data.data || data;
      return payload.teams || payload;
    },
    create: async (payload: { name: string; description?: string; microcosm_id?: number | null }): Promise<TeamSummary> => {
      const res = await fetch(`${API_BASE}/api/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Create team failed, using mock');
          return {
            id: Date.now(),
            name: payload.name,
            description: payload.description,
            microcosm_id: payload.microcosm_id ?? null,
            microcosm_name: null,
            created_by: 0,
            member_count: 1,
            is_member: true,
          };
        }
        throw new Error('Failed to create team');
      }
      const data = await res.json();
      const payloadData = data.data || data;
      return payloadData;
    },
    join: async (teamId: number): Promise<boolean> => {
      const res = await fetch(`${API_BASE}/api/teams/${teamId}/join`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Join team failed, returning false');
          return false;
        }
        throw new Error('Failed to join team');
      }
      return true;
    },
    members: async (teamId: number): Promise<TeamMember[]> => {
      const res = await fetch(`${API_BASE}/api/teams/${teamId}/members`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Team members API not available, returning empty list');
          return [];
        }
        throw new Error('Failed to fetch team members');
      }
      const data = await res.json();
      const payload = data.data || data;
      return payload.members || payload;
    },
    challenges: async (teamId: number): Promise<TeamChallenge[]> => {
      const res = await fetch(`${API_BASE}/api/teams/${teamId}/challenges`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Team challenges API not available, returning empty list');
          return [];
        }
        throw new Error('Failed to fetch team challenges');
      }
      const data = await res.json();
      const payload = data.data || data;
      return payload.challenges || payload;
    },
    actions: async (teamId: number): Promise<TeamAction[]> => {
      const res = await fetch(`${API_BASE}/api/teams/${teamId}/actions`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Team actions API not available, returning empty list');
          return [];
        }
        throw new Error('Failed to fetch team actions');
      }
      const data = await res.json();
      const payload = data.data || data;
      return payload.actions || payload;
    },
    createAction: async (teamId: number, payload: { title: string; description?: string; due_date?: string; points?: number }): Promise<TeamAction> => {
      const res = await fetch(`${API_BASE}/api/teams/${teamId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Create team action failed, using mock');
          return {
            id: Date.now(),
            title: payload.title,
            description: payload.description,
            due_date: payload.due_date,
            points: payload.points || 0,
            created_by: 0,
            completed_count: 0,
          };
        }
        throw new Error('Failed to create team action');
      }
      const data = await res.json();
      const payloadData = data.data || data;
      return payloadData;
    },
    completeAction: async (teamId: number, actionId: number): Promise<boolean> => {
      const res = await fetch(`${API_BASE}/api/teams/${teamId}/actions/${actionId}/complete`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Complete team action failed, returning false');
          return false;
        }
        throw new Error('Failed to complete team action');
      }
      return true;
    },
  },
  credits: {
    balance: async (): Promise<CreditSummary> => {
      const res = await fetch(`${API_BASE}/api/credits/balance`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Credits balance API not available, using fallback');
          return { balance: 0, earned: 0, spent: 0 };
        }
        throw new Error('Failed to fetch balance');
      }
      const data = await res.json();
      return data.data || data;
    },
    history: async (limit = 50): Promise<CreditTx[]> => {
      const res = await fetch(`${API_BASE}/api/credits/history?limit=${limit}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Credits history API not available, using fallback');
          return [];
        }
        throw new Error('Failed to fetch history');
      }
      const data = await res.json();
      const payload = data.data || data;
      return payload.transactions || payload;
    },
  },
  education: {
    listTracks: async (): Promise<LearningTrack[]> => {
      const res = await fetch(`${API_BASE}/api/education/tracks`);
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Education tracks API not available, using fallback');
          return [];
        }
        throw new Error('Failed to fetch tracks');
      }
      const data = await res.json();
      const payload = data.data || data;
      return payload.tracks || payload;
    },
    getTrack: async (trackId: number): Promise<{ track: LearningTrack; modules: LearningModule[] }> => {
      const res = await fetch(`${API_BASE}/api/education/tracks/${trackId}`);
      if (!res.ok) throw new Error('Failed to fetch track');
      const data = await res.json();
      return data.data || data;
    },
    getModule: async (moduleId: number): Promise<{ module: LearningModule; lessons: Lesson[]; assessment?: Assessment | null }> => {
      const res = await fetch(`${API_BASE}/api/education/modules/${moduleId}`);
      if (!res.ok) throw new Error('Failed to fetch module');
      const data = await res.json();
      return data.data || data;
    },
    getLesson: async (lessonId: number): Promise<Lesson> => {
      const res = await fetch(`${API_BASE}/api/education/lessons/${lessonId}`);
      if (!res.ok) throw new Error('Failed to fetch lesson');
      const data = await res.json();
      return data.data || data;
    },
    getAssessment: async (assessmentId: number): Promise<Assessment> => {
      const res = await fetch(`${API_BASE}/api/education/assessments/${assessmentId}`);
      if (!res.ok) throw new Error('Failed to fetch assessment');
      const data = await res.json();
      return data.data || data;
    },
    getCertifications: async (): Promise<CertificationRecord[]> => {
      const res = await fetch(`${API_BASE}/api/education/certifications`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Certifications API not available, using fallback');
          return [];
        }
        throw new Error('Failed to fetch certifications');
      }
      const data = await res.json();
      const payload = data.data || data;
      return payload.certifications || payload;
    },
    getCompetencyProfile: async (): Promise<CompetencyProfile> => {
      const res = await fetch(`${API_BASE}/api/education/competency-profile`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch competency profile');
      const data = await res.json();
      const payload = data.data || data;
      return payload.profile || payload;
    },
    getRiskTiers: async (): Promise<RiskTier[]> => {
      const res = await fetch(`${API_BASE}/api/education/risk-tiers`);
      if (!res.ok) throw new Error('Failed to fetch risk tiers');
      const data = await res.json();
      const payload = data.data || data;
      return payload.risk_tiers || payload;
    },
    issueCertificate: async (moduleId: number, publicVisible = false): Promise<{ certificate_uid: string; module_id: number; issued_at?: string; status: string }> => {
      const res = await fetch(`${API_BASE}/api/education/certifications/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ module_id: moduleId, public_visible: publicVisible }),
      });
      if (!res.ok) throw new Error('Failed to issue certificate');
      const data = await res.json();
      return data.data || data;
    },
    verifyCertificate: async (certificateUid: string): Promise<{ certificate_uid: string; module_id: number; issued_at?: string; expires_at?: string | null; status: string }> => {
      const res = await fetch(`${API_BASE}/api/education/certifications/verify/${certificateUid}`);
      if (!res.ok) throw new Error('Failed to verify certificate');
      const data = await res.json();
      return data.data || data;
    },
  },
  capital: {
    getHeatmap: async (): Promise<{ snapshots: CapitalSnapshot[]; flags: CapitalStressFlag[] }> => {
      const res = await fetch(`${API_BASE}/api/capital/heatmap`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch capital heatmap');
      const data = await res.json();
      return data.data || data;
    },
    getResilience: async (): Promise<CapitalResilience> => {
      const res = await fetch(`${API_BASE}/api/capital/resilience`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch resilience index');
      const data = await res.json();
      return data.data || data;
    },
    simulate: async (
      payload: { revenue_drop_pct: number; relief_surge_pct: number; ops_cost_increase_pct: number },
    ): Promise<Record<string, unknown>> => {
      const res = await fetch(`${API_BASE}/api/capital/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to simulate treasury');
      const data = await res.json();
      return data.data || data;
    },
  },
  transparency: {
    getPublic: async (node = 'test-node'): Promise<TransparencyPayload> => {
      const res = await fetch(`${API_BASE}/api/transparency/public?node=${node}`);
      if (!res.ok) throw new Error('Failed to fetch transparency');
      const data = await res.json();
      return data.data || data;
    },
  },
  packs: {
    list: async (): Promise<DiscoveryPack[]> => {
      const res = await fetch(`${API_BASE}/api/packs`);
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Packs API not available, returning empty list');
          return [];
        }
        throw new Error('Failed to fetch packs');
      }
      const data = await res.json();
      const payload = data.data || data;
      return payload.packs || payload;
    },
    get: async (packId: number): Promise<DiscoveryPackDetail> => {
      const res = await fetch(`${API_BASE}/api/packs/${packId}`);
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Pack detail API not available, using fallback');
          return { pack: {} as DiscoveryPack, items: [] };
        }
        throw new Error('Failed to fetch pack');
      }
      const data = await res.json();
      return data.data || data;
    },
    complete: async (packId: number): Promise<{ completed: boolean; reward_points: number }> => {
      const res = await fetch(`${API_BASE}/api/packs/${packId}/complete`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        console.warn('Pack completion failed, using fallback');
        return { completed: true, reward_points: 0 };
      }
      const data = await res.json();
      return data.data || data;
    },
  },
  actions: {
    getAll: async (): Promise<Action[]> => {
      const res = await fetch(`${API_BASE}/api/actions`);
      if (!res.ok) throw new Error('Failed to fetch actions');
      const data = await res.json() as ActionResponse[] | { data?: ActionResponse[]; actions?: ActionResponse[] };
      const items = Array.isArray(data) ? data : (data.data || data.actions || []);
      return items.map(normalizeAction);
    },
    getById: async (actionId: string): Promise<Action> => {
      const res = await fetch(`${API_BASE}/api/actions/${actionId}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch action');
      const data = await res.json() as ActionResponse;
      return normalizeAction(data);
    },
    complete: async (actionId: string): Promise<{ success: boolean; newCompletions: number }> => {
      const res = await fetch(`${API_BASE}/complete_action/${actionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
      if (!res.ok) {
        console.warn('Complete action failed or unavailable, simulating success for alpha testing');
        return { success: true, newCompletions: 0 };
      }
      const data = await res.json();
      return data.data || data;
    },
    delete: async (actionId: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/api/actions/${actionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Delete action failed or unavailable');
          return;
        }
        throw new Error('Failed to delete action');
      }
    },
    getProofs: async (actionId: string): Promise<ActionProof[]> => {
      const res = await fetch(`${API_BASE}/api/actions/${actionId}/proofs`);
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Proofs API not available, returning empty list');
          return [];
        }
        throw new Error('Failed to fetch proofs');
      }
      const data = await res.json();
      if (Array.isArray(data)) return data;
      return data.data || data.proofs || [];
    },
    addProof: async (actionId: string, payload: { before_url?: string; after_url?: string; proof_url?: string }): Promise<ActionProof> => {
      const res = await fetch(`${API_BASE}/api/actions/${actionId}/proofs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Add proof failed, using mock');
          return {
            id: Date.now(),
            action_id: Number(actionId),
            user_id: 0,
            before_url: payload.before_url,
            after_url: payload.after_url,
            proof_url: payload.proof_url,
            verified: true,
          };
        }
        throw new Error('Failed to add proof');
      }
      return res.json();
    },
    getMetrics: async (actionId: string): Promise<ActionImpactMetric[]> => {
      const res = await fetch(`${API_BASE}/api/actions/${actionId}/metrics`);
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Metrics API not available, returning empty list');
          return [];
        }
        throw new Error('Failed to fetch metrics');
      }
      const data = await res.json();
      if (Array.isArray(data)) return data;
      return data.data || data.metrics || [];
    },
    addMetric: async (actionId: string, payload: { label: string; value: number; unit?: string }): Promise<ActionImpactMetric> => {
      const res = await fetch(`${API_BASE}/api/actions/${actionId}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Add metric failed, using mock');
          return {
            id: Date.now(),
            action_id: Number(actionId),
            label: payload.label,
            value: payload.value,
            unit: payload.unit,
          };
        }
        throw new Error('Failed to add metric');
      }
      return res.json();
    },
  },
  community: {
    getArticles: async (): Promise<{ opinion: Article[]; news: Article[]; creative: Article[] }> => {
      const res = await fetch(`${API_BASE}/api/articles`);
      if (!res.ok) throw new Error('Failed to fetch articles');
      const data = await res.json() as ArticlesResponse;
      const normalizeArticle = (article: ArticleResponse): Article => ({
        id: String(article.id),
        title: article.title,
        content: article.content,
        category: article.category,
        authorPseudonym: article.author_pseudonym || 'Anonymous',
        createdAt: article.created_at || new Date().toISOString(),
        microcosmId: article.microcosm_id ? String(article.microcosm_id) : undefined,
        likes: article.likes ?? 0,
        comments: article.comments ?? 0,
        featured: article.featured ?? false,
        authorId: article.author_id != null ? String(article.author_id) : undefined,
      });
      return {
        opinion: (data.opinion || []).map(normalizeArticle),
        news: (data.news || []).map(normalizeArticle),
        creative: (data.creative || []).map(normalizeArticle),
      };
    },
    createArticle: async (article: { title: string; content: string; category: string; microcosmId?: string }): Promise<Article> => {
      const res = await fetch(`${API_BASE}/api/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          title: article.title,
          content: article.content,
          category: article.category.charAt(0).toUpperCase() + article.category.slice(1),
          microcosm_id: article.microcosmId,
        }),
      });

      if (!res.ok) {
        // For beta testing, if API is not available or auth is missing, simulate success
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Community API not available, simulating success for beta testing');
          return {
            id: `mock_${Date.now()}`,
            title: article.title,
            content: article.content,
            category: article.category,
            authorPseudonym: 'Anonymous',
            createdAt: new Date().toISOString(),
            microcosmId: article.microcosmId,
            likes: 0,
            comments: 0
          } as Article;
        }
        throw new Error('Failed to create article');
      }

      const data = await res.json();
        return {
          id: String(data.id),
          title: data.title,
          content: data.content,
          category: data.category,
          authorPseudonym: data.author_pseudonym || 'Anonymous',
          createdAt: data.created_at || new Date().toISOString(),
          microcosmId: data.microcosm_id ? String(data.microcosm_id) : undefined,
          likes: 0,
          comments: 0,
          featured: data.featured ?? false,
          authorId: data.author_id != null ? String(data.author_id) : undefined,
        };
      },
    getComments: async (articleId: string): Promise<Comment[]> => {
      const res = await fetch(`${API_BASE}/api/articles/${articleId}/comments`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      const data = await res.json() as CommentResponse[];
      return data.map((comment) => ({
        id: String(comment.id),
        content: comment.content,
        timestamp: comment.timestamp,
        authorPseudonym: comment.author_pseudonym,
      }));
    },
    addComment: async (articleId: string, content: string): Promise<Comment> => {
      const res = await fetch(`${API_BASE}/api/articles/${articleId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        // For beta testing, if API is not available or auth is missing, simulate success
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Comment API not available, simulating success for beta testing');
          return {
            id: `mock_${Date.now()}`,
            content,
            timestamp: new Date().toISOString()
          } as Comment;
        }
        throw new Error('Failed to add comment');
      }

      const data = await res.json();
      return {
        id: String(data.id),
        content: data.content,
        timestamp: data.timestamp,
        authorPseudonym: data.author_pseudonym,
      };
    },
    deleteArticle: async (articleId: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/api/articles/${articleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Delete article failed or unavailable');
          return;
        }
        throw new Error('Failed to delete article');
      }
    },
    featureArticle: async (articleId: string, featured: boolean): Promise<Article> => {
      const res = await fetch(`${API_BASE}/api/articles/${articleId}/feature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ featured }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Feature article failed or unavailable');
          return {
            id: articleId,
            title: '',
            content: '',
            category: 'news',
            authorPseudonym: 'Anonymous',
            createdAt: new Date().toISOString(),
            likes: 0,
            comments: 0,
          } as Article;
        }
        throw new Error('Failed to feature article');
      }
      const data = await res.json();
      const payload = data.data || data;
      return {
        id: String(payload.id),
        title: payload.title,
        content: payload.content,
        category: payload.category,
        authorPseudonym: payload.author_pseudonym || 'Anonymous',
        createdAt: payload.created_at || new Date().toISOString(),
        microcosmId: payload.microcosm_id ? String(payload.microcosm_id) : undefined,
        likes: payload.likes ?? 0,
        comments: payload.comments ?? 0,
      };
    },
    getPolls: async (): Promise<Poll[]> => {
      const res = await fetch(`${API_BASE}/api/community/polls`);
      if (!res.ok) throw new Error('Failed to fetch polls');
      return res.json();
    },
    votePoll: async (pollId: string, option: string): Promise<Poll> => {
      const res = await fetch(`${API_BASE}/api/community/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ option }),
      });

      if (!res.ok) {
        // For beta testing, if API is not available or auth is missing, simulate success
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Poll API not available, simulating success for beta testing');
          return {
            id: pollId,
            question: 'Mock Poll',
            options: [option],
            votes: { [option]: 1 }
          } as Poll;
        }
        throw new Error('Failed to vote');
      }

      return res.json();
    },
    getMicrocosms: async (): Promise<Microcosm[]> => {
      const res = await fetch(`${API_BASE}/api/microcosms`, {
        headers: {
          ...getAuthHeaders(),
        },
      });
      if (!res.ok) throw new Error('Failed to fetch microcosms');
      const data = await res.json() as MicrocosmResponse[];
      return data.map((microcosm) => ({
        id: String(microcosm.id),
        name: microcosm.name,
        description: microcosm.description,
      }));
    },
  },
  marketplace: {
    getProducts: async (): Promise<Product[]> => {
      const res = await fetch(`${API_BASE}/api/marketplace/products`);
      if (!res.ok) {
        if (res.status === 404 || res.status >= 500) {
          console.warn('Marketplace API not available, returning empty list for beta testing');
          return [];
        }
        throw new Error('Failed to fetch products');
      }
      return res.json();
    },
    createProduct: async (product: {
      name: string;
      description: string;
      price: number;
      category: string;
      impact: string;
      imageUrl?: string;
      inStock: boolean;
    }): Promise<Product> => {
      const res = await fetch(`${API_BASE}/api/marketplace/add-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(product),
      });

      if (!res.ok) {
        // For beta testing, if API is not available, simulate success
        if (res.status === 404 || res.status >= 500) {
          console.warn('Marketplace API not available, simulating success for beta testing');
          return {
            id: `mock_${Date.now()}`,
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            impact: product.impact,
            imageUrl: product.imageUrl || '/window.svg',
            inStock: product.inStock,
            sellerId: 'mock_user'
          } as Product;
        }
        throw new Error('Failed to create product');
      }

      return res.json();
    },
    createCheckoutSession: async (items: CartItem[]): Promise<CheckoutSession> => {
      const res = await fetch(`${API_BASE}/api/marketplace/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error('Failed to create checkout session');
      return res.json();
    },
  },
  organizer: {
    apply: async (application: OrganizerApplication): Promise<{ message: string; applicationId: string; autoApproved?: boolean }> => {
      try {
        const res = await fetch(`${API_BASE}/apply-organizer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(application),
        });

        if (!res.ok) {
          // For beta testing, if API is not available, simulate auto-approval
          if (res.status === 404 || res.status >= 500) {
            console.warn('Organizer API not available, simulating auto-approval for beta testing');
            return {
              message: '🎉 Congratulations! Your organizer application has been auto-approved for beta testing.',
              applicationId: `mock_${Date.now()}`,
              autoApproved: true
            };
          }

          const error = await res.json();
          throw new Error(error.message || 'Failed to submit application');
        }

        return res.json();
      } catch {
        // Network error - simulate auto-approval for beta testing
        console.warn('Organizer API network error, simulating auto-approval for beta testing');
        return {
          message: '🎉 Congratulations! Your organizer application has been auto-approved for beta testing.',
          applicationId: `mock_${Date.now()}`,
          autoApproved: true
        };
      }
    },
    getStatus: async (): Promise<OrganizerStatus> => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/organizer-application-status`, {
          method: 'GET',
          headers: getAuthHeaders(),
        });

        if (!res.ok) {
          if (res.status === 404) {
            const alt = await fetch(`${API_BASE}/auth/organizer-application-status`, {
              method: 'GET',
              headers: getAuthHeaders(),
            });
            if (alt.ok) return alt.json();
          }
          // For beta testing, return organizer status if API is not available
          if (res.status === 404 || res.status >= 500) {
            console.warn('Organizer status API not available, returning organizer status for beta testing');
            // Check if user has applied before (stored in localStorage)
            const hasApplied = localStorage.getItem('organizer_applied') === 'true';
            return {
              hasApplied,
              isOrganizer: hasApplied, // Auto-approve for beta
              role: hasApplied ? 'organizer' : 'participant'
            };
          }
          throw new Error('Failed to fetch organizer status');
        }

        return res.json();
      } catch {
        // Network error - return organizer status for beta testing
        console.warn('Organizer status API network error, returning organizer status for beta testing');
        const hasApplied = localStorage.getItem('organizer_applied') === 'true';
        return {
          hasApplied,
          isOrganizer: hasApplied, // Auto-approve for beta
          role: hasApplied ? 'organizer' : 'participant'
        };
      }
    },
  },
  events: {
    getAll: async (params?: { city?: string; date?: string }): Promise<Event[]> => {
      const query = new URLSearchParams(params);
      const res = await fetch(`${API_BASE}/api/events?${query}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json() as EventResponse[] | { data: EventResponse[] };
      const items = Array.isArray(data) ? data : (data.data || []);
      return items.map((event) => normalizeEvent(event));
    },
    getById: async (eventId: string): Promise<Event> => {
      const res = await fetch(`${API_BASE}/api/events/${eventId}`);
      if (!res.ok) throw new Error('Failed to fetch event');
      const data = await res.json() as EventResponse;
      return normalizeEvent(data);
    },
    attend: async (eventId: string): Promise<Event> => {
      const res = await fetch(`${API_BASE}/api/events/${eventId}/attend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error('Failed to attend event');
      const event = await res.json() as EventResponse;
      return normalizeEvent(event);
    },
    create: async (event: {
      title: string; description: string; address: string; city: string; country: string;
      latitude: number; longitude: number; date: string; time: string; venue_id: number;
      is_online: boolean; is_global: boolean; goal: number;
      reminder_week?: string; reminder_day?: string; reminder_hours?: string;
    }): Promise<Event> => {
      const res = await fetch(`${API_BASE}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(event),
      });
      if (res.status === 409) {
        const body = await res.json().catch(() => null);
        if (body?.acknowledgement_required) {
          const retry = await fetch(`${API_BASE}/api/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ ...event, collision_acknowledged: true }),
          });
          if (!retry.ok) throw new Error('Failed to create event');
          const retryData = await retry.json() as EventResponse;
          return normalizeEvent(retryData);
        }
      }
      if (!res.ok) throw new Error('Failed to create event');
      const data = await res.json() as EventResponse;
      return normalizeEvent(data);
    },
    delete: async (eventId: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/api/events/${eventId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Delete event failed or unavailable');
          return;
        }
        throw new Error('Failed to delete event');
      }
    },
  },
  venues: {
    getAll: async (): Promise<Venue[]> => {
      const res = await fetch(`${API_BASE}/api/venues`);
      if (!res.ok) throw new Error('Failed to fetch venues');
      return res.json();
    },
    create: async (venue: {
      name: string; address: string; city: string; country: string;
      latitude: number; longitude: number; is_online: boolean; is_global: boolean;
    }): Promise<Venue> => {
      const res = await fetch(`${API_BASE}/api/venues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(venue),
      });
      if (!res.ok) throw new Error('Failed to create venue');
      return res.json();
    },
    delete: async (id: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/api/venues/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete venue');
    },
  },
  users: {
    me: async (): Promise<UserProfile> => {
      const res = await fetch(`${API_BASE}/api/users/me`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
  },
  members: {
    getAll: async (): Promise<MemberResponse[]> => {
      const res = await fetch(`${API_BASE}/api/members`);
      if (!res.ok) throw new Error('Failed to fetch members');
      const data = await res.json();
      if (Array.isArray(data)) return data;
      return data.data || data.members || [];
    },
  },
  messages: {
    getAll: async (): Promise<MessageResponse[]> => {
      const res = await fetch(`${API_BASE}/api/messages`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Messages API not available, returning empty list for beta testing');
          return [];
        }
        throw new Error('Failed to fetch messages');
      }
      return res.json();
    },
    send: async (receiverId: number, content: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ receiver_id: receiverId, content }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Messages API not available, skipping send for beta testing');
          return;
        }
        throw new Error('Failed to send message');
      }
    },
  },
  todos: {
    getAll: async (): Promise<TodoResponse[]> => {
      const res = await fetch(`${API_BASE}/api/todos`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Todos API not available, returning empty list for beta testing');
          return [];
        }
        throw new Error('Failed to fetch todos');
      }
      const data = await res.json();
      if (Array.isArray(data)) return data;
      return data.data || data.todos || [];
    },
    addAction: async (actionId: string, title: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/api/add_to_todo/${actionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        console.warn('Todos API not available, skipping add for beta testing');
        return;
      }
    },
  },
  notifications: {
    getAll: async (): Promise<NotificationResponse[]> => {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status >= 500) {
          console.warn('Notifications API not available, returning empty list for beta testing');
          return [];
        }
        throw new Error('Failed to fetch notifications');
      }
      return res.json();
    },
  },
  ledger: {
    getEntries: async (page = 1, limit = 50): Promise<LedgerResponse> => {
      const res = await fetch(`${API_BASE}/api/ledger?page=${page}&limit=${limit}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        console.warn('Ledger API not available, returning empty list for beta testing');
        return { entries: [], page, pages: 1, total: 0 };
      }
      const data = await res.json();
      const payload = data.data || data;
      const pagination = payload.pagination || {};
      return {
        entries: payload.entries || [],
        total: pagination.total ?? payload.total ?? 0,
        page: pagination.page ?? payload.page ?? page,
        pages: pagination.pages ?? payload.pages ?? 1,
      };
    },
  },
};
