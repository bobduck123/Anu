'use client';

import { useState, useMemo } from 'react';
import { useFeatureFlag } from '@/lib/featureFlags';
import { generateMockPosts, sortPosts, type SortMode } from '@/data/adapters/communityAdapter';
import { DraggableGallery } from '@/ui/patterns/draggable-gallery';
import dynamic from 'next/dynamic';

export const forceDynamic = 'force-dynamic';

// Lazy-load legacy page for flag-off fallback
const CommunityLegacy = dynamic(() => import('./CommunityLegacy'), { ssr: false });

export default function CommunityPage() {
  const galleryEnabled = useFeatureFlag('draggableCommunityGallery');
  const [sortMode, setSortMode] = useState<SortMode>('new');

  const posts = useMemo(() => generateMockPosts(200, 99), []);
  const sorted = useMemo(() => sortPosts(posts, sortMode), [posts, sortMode]);

  // Feature flag: if gallery disabled, render the original community page
  if (!galleryEnabled) {
    return <CommunityLegacy />;
  }

  return (
    <div className="fixed inset-0 z-40 bg-black overflow-hidden" style={{ isolation: 'isolate' }}>
      <DraggableGallery posts={sorted} sortMode={sortMode} onSortChange={setSortMode} />
    </div>
  );
}
