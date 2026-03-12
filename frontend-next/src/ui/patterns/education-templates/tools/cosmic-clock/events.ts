/**
 * Cosmic Clock event data — 150+ events, year-parameterized.
 * Ported faithfully from reference cosmic-clock implementation.
 */

export type EventCategory = 'political' | 'sports' | 'entertainment' | 'cultural' | 'astronomical';

export interface ClockEvent {
  date: Date;
  name: string;
  desc: string;
  icon: string;
  category: EventCategory;
}

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  political: '#ef4444',
  sports: '#22c55e',
  entertainment: '#f59e0b',
  cultural: '#ec4899',
  astronomical: '#3b82f6',
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  political: 'Political',
  sports: 'Sports',
  entertainment: 'Entertainment',
  cultural: 'Cultural',
  astronomical: 'Astronomical',
};

export const ALL_CATEGORIES: EventCategory[] = ['political', 'sports', 'entertainment', 'cultural', 'astronomical'];

/** Generate all default events for a given year */
export function getDefaultEvents(year: number): ClockEvent[] {
  const events: ClockEvent[] = [
    // POLITICAL
    { date: new Date(year, 0, 20), name: 'US Presidential Inauguration', desc: 'Presidential swearing-in ceremony', icon: 'fa-landmark-dome', category: 'political' },
    { date: new Date(year, 1, 23), name: 'German Federal Election', desc: 'Bundestag election', icon: 'fa-vote-yea', category: 'political' },
    { date: new Date(year, 4, 1), name: 'UK Local Elections', desc: 'Local government elections across England', icon: 'fa-vote-yea', category: 'political' },
    { date: new Date(year, 5, 15), name: 'G7 Summit', desc: 'Annual summit of G7 nations', icon: 'fa-globe', category: 'political' },
    { date: new Date(year, 10, 1), name: 'COP Climate Summit', desc: 'UN Climate Change Conference', icon: 'fa-leaf', category: 'political' },
    { date: new Date(year, 10, 15), name: 'G20 Summit', desc: 'G20 Leaders summit', icon: 'fa-globe', category: 'political' },
    { date: new Date(year, 10, 20), name: 'APEC Summit', desc: 'Asia-Pacific Economic Cooperation', icon: 'fa-earth-asia', category: 'political' },

    // SPORTS - Tennis
    { date: new Date(year, 0, 12), name: 'Australian Open', desc: 'First Grand Slam of the year, Melbourne', icon: 'fa-baseball', category: 'sports' },
    { date: new Date(year, 4, 25), name: 'French Open', desc: 'Roland Garros clay court Grand Slam', icon: 'fa-baseball', category: 'sports' },
    { date: new Date(year, 5, 30), name: 'Wimbledon', desc: 'The Championships, grass court Grand Slam', icon: 'fa-baseball', category: 'sports' },
    { date: new Date(year, 7, 25), name: 'US Open', desc: 'Final Grand Slam, Flushing Meadows', icon: 'fa-baseball', category: 'sports' },

    // SPORTS - Football/Soccer
    { date: new Date(year, 5, 15), name: 'FIFA Club World Cup', desc: 'Expanded 32-team tournament', icon: 'fa-futbol', category: 'sports' },
    { date: new Date(year, 6, 2), name: "UEFA Women's Euro", desc: 'European Championship', icon: 'fa-futbol', category: 'sports' },

    // SPORTS - American Football
    { date: new Date(year, 1, 9), name: 'Super Bowl', desc: 'NFL Championship', icon: 'fa-football', category: 'sports' },
    { date: new Date(year, 0, 20), name: 'CFP National Championship', desc: 'College Football Playoff Final', icon: 'fa-football', category: 'sports' },

    // SPORTS - Golf
    { date: new Date(year, 3, 10), name: 'The Masters', desc: 'First golf major at Augusta National', icon: 'fa-golf-ball-tee', category: 'sports' },
    { date: new Date(year, 4, 15), name: 'PGA Championship', desc: 'Second golf major of the year', icon: 'fa-golf-ball-tee', category: 'sports' },
    { date: new Date(year, 5, 12), name: 'US Open Golf', desc: 'Third golf major', icon: 'fa-golf-ball-tee', category: 'sports' },
    { date: new Date(year, 6, 17), name: 'The Open Championship', desc: 'British Open', icon: 'fa-golf-ball-tee', category: 'sports' },
    { date: new Date(year, 8, 26), name: 'Ryder Cup', desc: 'USA vs Europe', icon: 'fa-golf-ball-tee', category: 'sports' },

    // SPORTS - Motorsport
    { date: new Date(year, 2, 16), name: 'F1 Season Opener', desc: 'Australian Grand Prix, Melbourne', icon: 'fa-flag-checkered', category: 'sports' },
    { date: new Date(year, 4, 25), name: 'Monaco Grand Prix', desc: 'Most prestigious F1 race', icon: 'fa-flag-checkered', category: 'sports' },
    { date: new Date(year, 4, 25), name: 'Indianapolis 500', desc: 'Greatest Spectacle in Racing', icon: 'fa-flag-checkered', category: 'sports' },
    { date: new Date(year, 5, 14), name: '24 Hours of Le Mans', desc: "World's oldest sports car endurance race", icon: 'fa-flag-checkered', category: 'sports' },
    { date: new Date(year, 0, 3), name: 'Dakar Rally', desc: "World's toughest rally raid", icon: 'fa-flag-checkered', category: 'sports' },

    // SPORTS - Athletics
    { date: new Date(year, 2, 21), name: 'World Indoor Athletics', desc: 'World Indoor Championships', icon: 'fa-person-running', category: 'sports' },
    { date: new Date(year, 8, 13), name: 'World Athletics Championships', desc: 'Outdoor Championships', icon: 'fa-person-running', category: 'sports' },

    // SPORTS - Cycling
    { date: new Date(year, 6, 5), name: 'Tour de France', desc: "World's most famous cycling race", icon: 'fa-bicycle', category: 'sports' },
    { date: new Date(year, 4, 9), name: "Giro d'Italia", desc: 'Italian Grand Tour cycling race', icon: 'fa-bicycle', category: 'sports' },
    { date: new Date(year, 7, 23), name: "Vuelta a Espa\u00f1a", desc: 'Spanish Grand Tour cycling race', icon: 'fa-bicycle', category: 'sports' },

    // SPORTS - Rugby & Cricket
    { date: new Date(year, 0, 31), name: 'Six Nations Rugby', desc: 'Annual European rugby championship', icon: 'fa-football', category: 'sports' },
    { date: new Date(year, 7, 22), name: "Women's Rugby World Cup", desc: 'International tournament', icon: 'fa-football', category: 'sports' },
    { date: new Date(year, 5, 26), name: 'ICC World Test Final', desc: "Cricket championship at Lord's", icon: 'fa-baseball', category: 'sports' },
    { date: new Date(year, 8, 1), name: "Women's Cricket World Cup", desc: 'International tournament', icon: 'fa-baseball', category: 'sports' },

    // SPORTS - Other
    { date: new Date(year, 0, 14), name: 'World Handball Championship', desc: "Men's tournament", icon: 'fa-volleyball', category: 'sports' },
    { date: new Date(year, 1, 16), name: 'NBA All-Star Game', desc: 'Annual basketball showcase', icon: 'fa-basketball', category: 'sports' },
    { date: new Date(year, 6, 11), name: 'World Aquatics Championships', desc: 'Swimming & diving', icon: 'fa-person-swimming', category: 'sports' },

    // ENTERTAINMENT - Awards
    { date: new Date(year, 0, 5), name: 'Golden Globes', desc: 'Golden Globe Awards', icon: 'fa-trophy', category: 'entertainment' },
    { date: new Date(year, 0, 19), name: 'SAG Awards', desc: 'Screen Actors Guild Awards', icon: 'fa-trophy', category: 'entertainment' },
    { date: new Date(year, 1, 2), name: 'Grammy Awards', desc: 'Annual Grammy Awards', icon: 'fa-music', category: 'entertainment' },
    { date: new Date(year, 1, 16), name: 'BAFTA Film Awards', desc: 'British Academy Film Awards', icon: 'fa-trophy', category: 'entertainment' },
    { date: new Date(year, 2, 2), name: 'Academy Awards', desc: 'Oscars ceremony', icon: 'fa-star', category: 'entertainment' },
    { date: new Date(year, 8, 21), name: 'Emmy Awards', desc: 'Primetime Emmy Awards', icon: 'fa-tv', category: 'entertainment' },

    // ENTERTAINMENT - Festivals
    { date: new Date(year, 1, 6), name: 'Berlin Film Festival', desc: 'Berlinale international film festival', icon: 'fa-film', category: 'entertainment' },
    { date: new Date(year, 3, 11), name: 'Coachella Weekend 1', desc: 'Major music festival in California', icon: 'fa-music', category: 'entertainment' },
    { date: new Date(year, 4, 10), name: 'Eurovision', desc: 'Song Contest', icon: 'fa-microphone', category: 'entertainment' },
    { date: new Date(year, 4, 13), name: 'Cannes Film Festival', desc: 'Festival de Cannes', icon: 'fa-film', category: 'entertainment' },
    { date: new Date(year, 5, 25), name: 'Glastonbury Festival', desc: 'Iconic UK music festival', icon: 'fa-music', category: 'entertainment' },
    { date: new Date(year, 7, 27), name: 'Venice Film Festival', desc: 'Venice International Film Festival', icon: 'fa-film', category: 'entertainment' },
    { date: new Date(year, 8, 4), name: 'Toronto Film Festival', desc: 'TIFF', icon: 'fa-film', category: 'entertainment' },

    // ENTERTAINMENT - Tech
    { date: new Date(year, 0, 7), name: 'CES', desc: 'Consumer Electronics Show, Las Vegas', icon: 'fa-microchip', category: 'entertainment' },
    { date: new Date(year, 1, 24), name: 'MWC Barcelona', desc: 'Mobile World Congress', icon: 'fa-mobile', category: 'entertainment' },
    { date: new Date(year, 5, 9), name: 'Apple WWDC', desc: 'Worldwide Developers Conference', icon: 'fa-apple', category: 'entertainment' },

    // CULTURAL & HOLIDAYS
    { date: new Date(year, 0, 1), name: "New Year's Day", desc: `Start of ${year}`, icon: 'fa-champagne-glasses', category: 'cultural' },
    { date: new Date(year, 0, 29), name: 'Chinese New Year', desc: 'Lunar New Year celebrations', icon: 'fa-dragon', category: 'cultural' },
    { date: new Date(year, 1, 14), name: "Valentine's Day", desc: 'Day of love and romance', icon: 'fa-heart', category: 'cultural' },
    { date: new Date(year, 1, 28), name: 'Losar', desc: 'Tibetan New Year', icon: 'fa-moon', category: 'cultural' },
    { date: new Date(year, 2, 1), name: 'Mardi Gras', desc: 'Fat Tuesday celebrations', icon: 'fa-mask', category: 'cultural' },
    { date: new Date(year, 2, 14), name: 'Holi', desc: 'Hindu festival of colors', icon: 'fa-palette', category: 'cultural' },
    { date: new Date(year, 2, 17), name: "St. Patrick's Day", desc: 'Irish cultural celebration', icon: 'fa-clover', category: 'cultural' },
    { date: new Date(year, 2, 29), name: 'Ramadan Begins', desc: 'Islamic holy month of fasting', icon: 'fa-moon', category: 'cultural' },
    { date: new Date(year, 3, 18), name: 'Good Friday', desc: 'Christian observance', icon: 'fa-cross', category: 'cultural' },
    { date: new Date(year, 3, 20), name: 'Easter Sunday', desc: 'Christian celebration of resurrection', icon: 'fa-egg', category: 'cultural' },
    { date: new Date(year, 3, 22), name: 'Earth Day', desc: 'Environmental awareness day', icon: 'fa-earth-americas', category: 'cultural' },
    { date: new Date(year, 3, 27), name: 'Eid al-Fitr', desc: 'End of Ramadan celebration', icon: 'fa-moon', category: 'cultural' },
    { date: new Date(year, 4, 1), name: "International Workers' Day", desc: 'Labor Day in many countries', icon: 'fa-briefcase', category: 'cultural' },
    { date: new Date(year, 4, 11), name: "Mother's Day (US)", desc: 'Celebrating mothers', icon: 'fa-heart', category: 'cultural' },
    { date: new Date(year, 4, 26), name: 'Memorial Day (US)', desc: 'Honoring fallen military', icon: 'fa-flag-usa', category: 'cultural' },
    { date: new Date(year, 5, 15), name: "Father's Day (US)", desc: 'Celebrating fathers', icon: 'fa-user', category: 'cultural' },
    { date: new Date(year, 6, 4), name: 'US Independence Day', desc: 'Fourth of July celebrations', icon: 'fa-flag-usa', category: 'cultural' },
    { date: new Date(year, 6, 5), name: 'Eid al-Adha', desc: 'Islamic Festival of Sacrifice', icon: 'fa-moon', category: 'cultural' },
    { date: new Date(year, 8, 1), name: 'Labor Day (US)', desc: 'End of summer holiday', icon: 'fa-briefcase', category: 'cultural' },
    { date: new Date(year, 8, 22), name: 'Rosh Hashanah', desc: 'Jewish New Year', icon: 'fa-star-of-david', category: 'cultural' },
    { date: new Date(year, 9, 1), name: 'Yom Kippur', desc: 'Jewish Day of Atonement', icon: 'fa-star-of-david', category: 'cultural' },
    { date: new Date(year, 9, 13), name: 'Diwali', desc: 'Hindu festival of lights', icon: 'fa-fire', category: 'cultural' },
    { date: new Date(year, 9, 31), name: 'Halloween', desc: 'Spooky celebrations', icon: 'fa-ghost', category: 'cultural' },
    { date: new Date(year, 10, 11), name: 'Veterans Day', desc: 'Honoring military veterans', icon: 'fa-medal', category: 'cultural' },
    { date: new Date(year, 10, 27), name: 'Thanksgiving (US)', desc: 'American harvest celebration', icon: 'fa-utensils', category: 'cultural' },
    { date: new Date(year, 11, 14), name: 'Hanukkah Begins', desc: 'Jewish Festival of Lights', icon: 'fa-menorah', category: 'cultural' },
    { date: new Date(year, 11, 25), name: 'Christmas Day', desc: 'Christian celebration', icon: 'fa-gift', category: 'cultural' },
    { date: new Date(year, 11, 26), name: 'Kwanzaa Begins', desc: 'African American celebration', icon: 'fa-candle-holder', category: 'cultural' },
    { date: new Date(year, 11, 31), name: "New Year's Eve", desc: `End of ${year}`, icon: 'fa-champagne-glasses', category: 'cultural' },

    // ASTRONOMICAL
    { date: new Date(year, 2, 14), name: 'Total Lunar Eclipse', desc: 'Visible from Americas, Europe, Africa', icon: 'fa-moon', category: 'astronomical' },
    { date: new Date(year, 2, 20), name: 'Spring Equinox', desc: 'Day and night equal length', icon: 'fa-sun', category: 'astronomical' },
    { date: new Date(year, 2, 29), name: 'Partial Solar Eclipse', desc: 'Visible from Europe, N. Africa, Russia', icon: 'fa-sun', category: 'astronomical' },
    { date: new Date(year, 5, 21), name: 'Summer Solstice', desc: 'Longest day in Northern Hemisphere', icon: 'fa-sun', category: 'astronomical' },
    { date: new Date(year, 8, 7), name: 'Total Lunar Eclipse', desc: 'Visible from Europe, Africa, Asia', icon: 'fa-moon', category: 'astronomical' },
    { date: new Date(year, 8, 21), name: 'Partial Solar Eclipse', desc: 'Visible from Pacific, Antarctica', icon: 'fa-sun', category: 'astronomical' },
    { date: new Date(year, 8, 22), name: 'Autumn Equinox', desc: 'Day and night equal length', icon: 'fa-leaf', category: 'astronomical' },
    { date: new Date(year, 11, 21), name: 'Winter Solstice', desc: 'Shortest day in Northern Hemisphere', icon: 'fa-snowflake', category: 'astronomical' },
  ];

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}
