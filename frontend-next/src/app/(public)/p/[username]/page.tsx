import Link from 'next/link';
import { getCoreApiBase } from '@/lib/runtime';

interface PublicProfile {
  username: string;
  pseudonym: string;
  role: string;
  level: number;
  points: number;
  featured_articles: number;
  featured_stories: number;
  featured_this_month: number;
}

async function getProfile(username: string): Promise<PublicProfile | null> {
  const base = getCoreApiBase({ server: true });
  const res = await fetch(`${base}/api/public/profile/${encodeURIComponent(username)}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const profile = await getProfile(params.username);
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
        <div className="card-civic max-w-lg w-full text-center">
          <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Profile not found</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mb-4">This profile may be private or does not exist.</p>
          <Link href="/" className="btn-pill btn-pill-primary text-sm">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="card-civic">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[var(--color-muted)] flex items-center justify-center text-lg font-bold">
              {profile.pseudonym?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                {profile.pseudonym || profile.username}
              </h1>
              <p className="text-sm text-[var(--color-muted-foreground)] capitalize">{profile.role}</p>
              <div className="flex items-center gap-3 text-sm mt-2">
                <span className="font-mono-data">Level {profile.level}</span>
                <span className="font-mono-data">{profile.points} pts</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card-civic">
          <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-serif)' }}>Public Impact Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-[var(--color-muted-foreground)]">Featured Articles</p>
              <p className="font-mono-data text-lg">{profile.featured_articles}</p>
            </div>
            <div>
              <p className="text-[var(--color-muted-foreground)]">Featured Stories</p>
              <p className="font-mono-data text-lg">{profile.featured_stories}</p>
            </div>
            <div>
              <p className="text-[var(--color-muted-foreground)]">Featured This Month</p>
              <p className="font-mono-data text-lg">{profile.featured_this_month}</p>
            </div>
          </div>
        </div>

        <div className="card-civic text-sm text-[var(--color-muted-foreground)]">
          Public profiles show only pseudonym, role, levels, and featured counts. No personal data is displayed.
        </div>
      </div>
    </div>
  );
}
