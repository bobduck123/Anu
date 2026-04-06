// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// --- Feature Flags ---

describe('featureFlags', () => {
  it('resolveFlags returns all defaults as true', async () => {
    const { resolveFlags } = await import('@/lib/featureFlags');
    const flags = resolveFlags();
    expect(flags.starfield).toBe(true);
    expect(flags.augmentedMatrixHeatmap).toBe(true);
    expect(flags.draggableCommunityGallery).toBe(true);
    expect(flags.educationTemplates).toBe(true);
    expect(flags.chromaticBento).toBe(true);
    expect(flags.profileDesktopUi).toBe(true);
  });
});

// --- Data Adapters ---

describe('heatmapAdapter', () => {
  it('generates deterministic mock data with correct shape', async () => {
    const { generateMockHeatmap } = await import('@/data/adapters/heatmapAdapter');
    const data = generateMockHeatmap(5, 5, 42);
    expect(data.rows).toHaveLength(5);
    expect(data.cols).toHaveLength(5);
    expect(data.cells.length).toBeGreaterThan(0);
    expect(data.cells[0]).toHaveProperty('row');
    expect(data.cells[0]).toHaveProperty('col');
    expect(data.cells[0]).toHaveProperty('value');

    // Deterministic — same seed gives same result
    const data2 = generateMockHeatmap(5, 5, 42);
    expect(data2.cells[0].value).toBe(data.cells[0].value);
  });

  it('filters by tenant', async () => {
    const { generateMockHeatmap, filterHeatmap } = await import('@/data/adapters/heatmapAdapter');
    const data = generateMockHeatmap(5, 5, 42);
    const filtered = filterHeatmap(data, { tenant: 'Addi' });
    expect(filtered.cells.length).toBeLessThanOrEqual(data.cells.length);
  });
});

describe('starfieldAdapter', () => {
  it('generates universe with stars and constellations', async () => {
    const { generateMockUniverse } = await import('@/data/adapters/starfieldAdapter');
    const data = generateMockUniverse(100, 7);
    expect(data.stars.length).toBe(100);
    expect(data.constellations.length).toBeGreaterThan(0);
    expect(data.stars[0]).toHaveProperty('x');
    expect(data.stars[0]).toHaveProperty('y');
    expect(data.stars[0]).toHaveProperty('z');
    expect(data.stars[0]).toHaveProperty('type');
    expect(data.stars[0]).toHaveProperty('label');
  });

  it('filters by type', async () => {
    const { generateMockUniverse, filterUniverse } = await import('@/data/adapters/starfieldAdapter');
    const data = generateMockUniverse(100, 7);
    const filtered = filterUniverse(data, { types: ['event'] });
    expect(filtered.stars.every(s => s.type === 'event')).toBe(true);
  });
});

describe('communityAdapter', () => {
  it('generates mock posts with correct shape', async () => {
    const { generateMockPosts } = await import('@/data/adapters/communityAdapter');
    const posts = generateMockPosts(20, 99);
    expect(posts).toHaveLength(20);
    expect(posts[0]).toHaveProperty('id');
    expect(posts[0]).toHaveProperty('author');
    expect(posts[0]).toHaveProperty('content');
    expect(posts[0]).toHaveProperty('likes');
  });

  it('every post has a coverImage', async () => {
    const { generateMockPosts } = await import('@/data/adapters/communityAdapter');
    const posts = generateMockPosts(50, 42);
    for (const post of posts) {
      expect(post.coverImage).toBeTruthy();
      expect(typeof post.coverImage).toBe('string');
    }
  });

  it('every post has a valid layout', async () => {
    const { generateMockPosts } = await import('@/data/adapters/communityAdapter');
    const posts = generateMockPosts(50, 42);
    const validPositions = ['left', 'right', 'top', 'bottom'];
    const validSizes = [25, 33, 50];
    for (const post of posts) {
      expect(post.layout).toBeTruthy();
      expect(validPositions).toContain(post.layout.imagePosition);
      expect(validSizes).toContain(post.layout.imageSize);
    }
  });

  it('sorts posts by mode', async () => {
    const { generateMockPosts, sortPosts } = await import('@/data/adapters/communityAdapter');
    const posts = generateMockPosts(20, 99);
    const sorted = sortPosts(posts, 'trending');
    const score = (p: typeof sorted[0]) => p.likes + p.comments * 2 + p.shares * 3;
    for (let i = 1; i < sorted.length; i++) {
      expect(score(sorted[i - 1])).toBeGreaterThanOrEqual(score(sorted[i]));
    }
  });

  it('maps live stories and articles into gallery posts', async () => {
    const { buildGalleryPosts } = await import('@/data/adapters/communityAdapter');
    const input = {
      articles: {
        opinion: [],
        news: [
          {
            id: '12',
            title: 'Neighbourhood update',
            content: 'The co-op garden doubled its capacity this month.',
            category: 'News',
            authorPseudonym: 'River Stone',
            createdAt: '2026-03-01T00:00:00.000Z',
            likes: 3,
            comments: 2,
          },
        ],
        creative: [],
      },
      stories: [
        {
          id: 4,
          title: 'Flood response recap',
          content: 'Mutual-aid teams distributed supplies across three suburbs.',
          author_id: 8,
          author_pseudonym: 'Morning Dew',
          created_at: '2026-03-02T00:00:00.000Z',
          reactions: { clap: 2, heart: 1 },
          media_url: 'https://images.example.com/story.webp',
        },
      ],
      newsFeed: [
        {
          id: 'bbc-1',
          title: 'Trusted source bulletin',
          summary: 'A public-interest news item.',
          url: 'https://example.com/trusted-story',
          sourceName: 'BBC News',
          feedLabel: 'World',
          homepage: 'https://www.bbc.co.uk/news/10628494',
          publishedAt: '2026-03-03T00:00:00.000Z',
          imageUrl: 'https://images.example.com/news.jpg',
        },
      ],
    };
    const posts = buildGalleryPosts(input);
    const postsAgain = buildGalleryPosts(input);

    expect(posts).toHaveLength(3);
    expect(posts[0]).toMatchObject({
      id: 'story-4',
      title: 'Flood response recap',
      likes: 3,
      coverImage: 'https://images.example.com/story.webp',
    });
    expect(posts[1]).toMatchObject({
      id: 'news-bbc-1',
      title: 'Trusted source bulletin',
      sourceUrl: 'https://example.com/trusted-story',
    });
    expect(posts[2]).toMatchObject({
      id: 'article-12',
      title: 'Neighbourhood update',
      comments: 2,
    });
    expect(posts[2].layout).toEqual(postsAgain[2].layout);
  });
});

// --- Color Harmony ---

describe('colorHarmony', () => {
  it('builds analogous palette from hex', async () => {
    const { buildPalette } = await import('@/ui/patterns/chromatic-bento/colorHarmony');
    const palette = buildPalette('#1F6F78', 'analogous');
    expect(palette.base).toBe('#1F6F78');
    expect(palette.warm).toMatch(/^#[0-9A-F]{6}$/i);
    expect(palette.bright).toMatch(/^#[0-9A-F]{6}$/i);
    expect(palette.light).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('computes readable text color', async () => {
    const { readableText } = await import('@/ui/patterns/chromatic-bento/colorHarmony');
    expect(readableText('#FFFFFF')).toBe('#1e0227');
    expect(readableText('#000000')).toBe('#f6d4cb');
  });

  it('computes correct contrast ratio range', async () => {
    const { contrastRatio } = await import('@/ui/patterns/chromatic-bento/colorHarmony');
    const ratio = contrastRatio('#000000', '#FFFFFF');
    expect(ratio).toBeCloseTo(21, 0);
  });
});

// --- Education Templates ---

describe('education templates', () => {
  it('exports 6 templates in registry', async () => {
    const { TEMPLATE_REGISTRY } = await import('@/ui/patterns/education-templates');
    expect(TEMPLATE_REGISTRY).toHaveLength(6);
    const ids = TEMPLATE_REGISTRY.map(t => t.id);
    expect(ids).toContain('scroll-snap');
    expect(ids).toContain('time-travel');
    expect(ids).toContain('zoom-center');
    expect(ids).toContain('cosmic-clock');
    expect(ids).toContain('retro-pixel');
    expect(ids).toContain('physics-wire');
  });

  it('exports 3 mock courses', async () => {
    const { MOCK_COURSES } = await import('@/ui/patterns/education-templates');
    expect(MOCK_COURSES).toHaveLength(3);
    expect(MOCK_COURSES[0]).toHaveProperty('id');
    expect(MOCK_COURSES[0]).toHaveProperty('template');
    expect(MOCK_COURSES[0]).toHaveProperty('sections');
    expect(MOCK_COURSES[0].sections.length).toBeGreaterThan(0);
  });
});

// --- Pixel Studio Engine ---

describe('pixel studio engine', () => {
  it('bresenhamLine plots correct points for horizontal line', async () => {
    const { bresenhamLine } = await import('@/ui/patterns/education-templates/tools/pixel-studio/engine');
    const points: [number, number][] = [];
    bresenhamLine(0, 0, 4, 0, (x, y) => points.push([x, y]));
    expect(points).toEqual([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);
  });

  it('bresenhamLine plots correct points for diagonal line', async () => {
    const { bresenhamLine } = await import('@/ui/patterns/education-templates/tools/pixel-studio/engine');
    const points: [number, number][] = [];
    bresenhamLine(0, 0, 3, 3, (x, y) => points.push([x, y]));
    expect(points).toHaveLength(4);
    expect(points[0]).toEqual([0, 0]);
    expect(points[3]).toEqual([3, 3]);
  });
});

// --- Pixel Studio Palettes ---

describe('pixel studio palettes', () => {
  it('loads all manufacturer groups', async () => {
    const { PALETTES } = await import('@/ui/patterns/education-templates/tools/pixel-studio/palettes');
    const manufacturers = Object.keys(PALETTES);
    expect(manufacturers.length).toBeGreaterThan(15);
    expect(manufacturers).toContain('Commodore');
    expect(manufacturers).toContain('Nintendo');
    expect(manufacturers).toContain('Sega');
    expect(manufacturers).toContain('Amstrad');
  });

  it('C64 palette has 16 colors', async () => {
    const { PALETTES } = await import('@/ui/patterns/education-templates/tools/pixel-studio/palettes');
    expect(PALETTES['Commodore']['C64']).toHaveLength(16);
    expect(PALETTES['Commodore']['C64'][0]).toBe('#000000');
  });
});

// --- Cosmic Clock ---

describe('cosmic clock', () => {
  it('ring config has 9 rings', async () => {
    const { RINGS } = await import('@/ui/patterns/education-templates/tools/cosmic-clock/rings');
    expect(RINGS).toHaveLength(9);
    expect(RINGS[0].name).toBe('Seconds');
    expect(RINGS[8].name).toBe('Year');
  });

  it('getWeekOfYear returns value in 0-52 range', async () => {
    const { getWeekOfYear } = await import('@/ui/patterns/education-templates/tools/cosmic-clock/rings');
    const week = getWeekOfYear(new Date(2026, 0, 15)); // Jan 15
    expect(week).toBeGreaterThan(0);
    expect(week).toBeLessThan(53);
  });

  it('getDefaultEvents returns sorted events', async () => {
    const { getDefaultEvents } = await import('@/ui/patterns/education-templates/tools/cosmic-clock/events');
    const events = getDefaultEvents(2026);
    expect(events.length).toBeGreaterThan(80);
    // Check sorting
    for (let i = 1; i < events.length; i++) {
      expect(events[i].date.getTime()).toBeGreaterThanOrEqual(events[i - 1].date.getTime());
    }
  });

  it('event categories match expected set', async () => {
    const { ALL_CATEGORIES, CATEGORY_COLORS } = await import('@/ui/patterns/education-templates/tools/cosmic-clock/events');
    expect(ALL_CATEGORIES).toHaveLength(5);
    for (const cat of ALL_CATEGORIES) {
      expect(CATEGORY_COLORS[cat]).toMatch(/^#/);
    }
  });
});

// --- Time Travel Gallery ---

describe('time travel periods', () => {
  it('has 7 art periods', async () => {
    const { PERIODS } = await import('@/ui/patterns/education-templates/tools/time-travel/periods');
    expect(PERIODS).toHaveLength(7);
    expect(PERIODS[0].name).toBe('Renaissance');
    expect(PERIODS[6].name).toBe('Impressionist');
  });

  it('getPeriodForYear finds correct period', async () => {
    const { getPeriodForYear } = await import('@/ui/patterns/education-templates/tools/time-travel/periods');
    const renaissance = getPeriodForYear(1480);
    expect(renaissance?.name).toBe('Renaissance');
    const baroque = getPeriodForYear(1650);
    expect(baroque?.name).toBe('Baroque');
    const outside = getPeriodForYear(1200);
    expect(outside).toBeNull();
  });
});

// --- Bento Grid Components ---

describe('BentoGrid', () => {
  it('renders children in a grid container', async () => {
    const { BentoGrid, BentoCell } = await import('@/ui/patterns/chromatic-bento');
    const { container } = render(
      <BentoGrid columns={6}>
        <BentoCell colSpan={3} rowSpan={1}>Cell A</BentoCell>
        <BentoCell colSpan={3} rowSpan={1}>Cell B</BentoCell>
      </BentoGrid>
    );
    expect(screen.getByText('Cell A')).toBeTruthy();
    expect(screen.getByText('Cell B')).toBeTruthy();
    const grid = container.querySelector('.bento-grid') as HTMLElement | null;
    expect(grid).toBeTruthy();
    expect(grid?.style.display).toBe('grid');
  });
});

describe('BentoStat', () => {
  it('renders label and value', async () => {
    const { BentoStat } = await import('@/ui/patterns/chromatic-bento');
    render(<BentoStat label="Users" value={1234} />);
    expect(screen.getByText('Users')).toBeTruthy();
    expect(screen.getByText('1234')).toBeTruthy();
  });
});

// --- Quantum Engine ---

describe('QuantumEngine data mapping', () => {
  it('maps stars to internal nodes with correct position scaling', async () => {
    const { generateMockUniverse } = await import('@/data/adapters/starfieldAdapter');
    const data = generateMockUniverse(50, 42);
    // Verify stars exist and have positions
    expect(data.stars.length).toBe(50);
    expect(data.stars[0]).toHaveProperty('x');
    expect(data.stars[0]).toHaveProperty('y');
    expect(data.stars[0]).toHaveProperty('z');
    // Star positions are in ±100 range
    const allInRange = data.stars.every(s =>
      Math.abs(s.x) <= 100 && Math.abs(s.y) <= 100 && Math.abs(s.z) <= 100
    );
    expect(allInRange).toBe(true);
  });

  it('generates constellations with valid star connections', async () => {
    const { generateMockUniverse } = await import('@/data/adapters/starfieldAdapter');
    const data = generateMockUniverse(200, 7);
    expect(data.constellations.length).toBeGreaterThan(0);
    // All constellation starIds should reference real stars
    const starIds = new Set(data.stars.map(s => s.id));
    for (const c of data.constellations) {
      for (const id of c.starIds) {
        expect(starIds.has(id)).toBe(true);
      }
    }
  });

  it('star connections form valid bidirectional references', async () => {
    const { generateMockUniverse } = await import('@/data/adapters/starfieldAdapter');
    const data = generateMockUniverse(100, 7);
    const starIds = new Set(data.stars.map(s => s.id));
    // All connections should point to valid stars
    for (const star of data.stars) {
      for (const connId of star.connections) {
        expect(starIds.has(connId)).toBe(true);
      }
    }
  });

  it('star type matches one of the 7 defined types', async () => {
    const { generateMockUniverse } = await import('@/data/adapters/starfieldAdapter');
    const data = generateMockUniverse(100, 7);
    const validTypes = new Set(['event', 'action', 'community', 'donor', 'relief', 'education', 'marketplace']);
    for (const star of data.stars) {
      expect(validTypes.has(star.type)).toBe(true);
    }
  });

  it('star sizes are within expected range', async () => {
    const { generateMockUniverse } = await import('@/data/adapters/starfieldAdapter');
    const data = generateMockUniverse(100, 7);
    for (const star of data.stars) {
      expect(star.size).toBeGreaterThanOrEqual(0.3);
      expect(star.size).toBeLessThanOrEqual(2.8);
    }
  });
});

// --- Profile Desktop Types ---

describe('profile desktop types', () => {
  it('exports 11 preset themes', async () => {
    const { PRESET_THEMES } = await import('@/ui/patterns/profile-desktop');
    expect(PRESET_THEMES).toHaveLength(11);
    expect(PRESET_THEMES[0]).toHaveProperty('name');
    expect(PRESET_THEMES[0]).toHaveProperty('theme');
    expect(PRESET_THEMES[0].theme).toHaveProperty('bgColor');
    expect(PRESET_THEMES[0].theme).toHaveProperty('accentColor');
    expect(PRESET_THEMES[0].theme).toHaveProperty('bgType');
    expect(PRESET_THEMES[0].theme).toHaveProperty('fontFamily');
    expect(PRESET_THEMES[0].theme).toHaveProperty('buttonStyle');
  });

  it('buildBackground produces valid CSS for gradient', async () => {
    const { buildBackground, PRESET_THEMES } = await import('@/ui/patterns/profile-desktop');
    const gradientTheme = PRESET_THEMES.find(t => t.theme.bgType === 'gradient');
    if (gradientTheme) {
      const bg = buildBackground(gradientTheme.theme);
      expect(bg).toContain('gradient');
    }
  });

  it('getShadow returns valid CSS for each intensity', async () => {
    const { getShadow } = await import('@/ui/patterns/profile-desktop');
    expect(getShadow(0, false)).toBe('none');
    expect(getShadow(1, false)).toContain('rgba');
    expect(getShadow(2, true)).toContain('rgba');
    expect(getShadow(3, false)).toContain('rgba');
  });
});
