/**
 * Art historical periods for the Time Travel Gallery.
 */

export interface ArtPeriod {
  name: string;
  yearStart: number;
  yearEnd: number;
  backgroundColor: string;
  textColor: string;
  description: string;
}

export const PERIODS: ArtPeriod[] = [
  {
    name: 'Renaissance',
    yearStart: 1440, yearEnd: 1520,
    backgroundColor: '#2d1b0e',
    textColor: '#d4a574',
    description: 'Revival of classical learning and art, centered in Italy.',
  },
  {
    name: 'Mannerism',
    yearStart: 1520, yearEnd: 1600,
    backgroundColor: '#1a2332',
    textColor: '#8ba4c4',
    description: 'Stylistic exaggeration and elegance following the High Renaissance.',
  },
  {
    name: 'Baroque',
    yearStart: 1600, yearEnd: 1730,
    backgroundColor: '#1e0f0f',
    textColor: '#c49474',
    description: 'Dramatic grandeur, movement, and emotional intensity.',
  },
  {
    name: 'Rococo',
    yearStart: 1730, yearEnd: 1780,
    backgroundColor: '#1a1a2e',
    textColor: '#d4a4c4',
    description: 'Light, elegant, ornamental style with pastel colors.',
  },
  {
    name: 'Neoclassical',
    yearStart: 1780, yearEnd: 1830,
    backgroundColor: '#1a1a1a',
    textColor: '#b4b4c4',
    description: 'Return to classical ideals of order, symmetry, and simplicity.',
  },
  {
    name: 'Romantic',
    yearStart: 1830, yearEnd: 1900,
    backgroundColor: '#0f1a2e',
    textColor: '#94b4d4',
    description: 'Emotion, individualism, and glorification of nature.',
  },
  {
    name: 'Impressionist',
    yearStart: 1860, yearEnd: 1940,
    backgroundColor: '#1a2e1a',
    textColor: '#a4d4a4',
    description: 'Light, color, and everyday subjects captured with visible brushstrokes.',
  },
];

export function getPeriodForYear(year: number): ArtPeriod | null {
  // Periods may overlap (Romantic/Impressionist). Return the best match.
  for (let i = PERIODS.length - 1; i >= 0; i--) {
    if (year >= PERIODS[i].yearStart && year < PERIODS[i].yearEnd) {
      return PERIODS[i];
    }
  }
  return null;
}

export function interpolatePeriodBackground(year: number): string {
  const period = getPeriodForYear(year);
  return period?.backgroundColor ?? '#0a0a14';
}

export function interpolatePeriodTextColor(year: number): string {
  const period = getPeriodForYear(year);
  return period?.textColor ?? '#ffffff';
}
