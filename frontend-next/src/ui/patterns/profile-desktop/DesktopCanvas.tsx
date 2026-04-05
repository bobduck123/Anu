'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PlusCircle, User, Link2, FileText, Users, Zap, Award,
  StickyNote, ListChecks, Flame, Clock, Paintbrush, ScrollText, Image as ImageIcon,
  Palette, Minus,
} from 'lucide-react';
import { DesktopIcon } from './DesktopIcon';
import { DesktopWindow } from './DesktopWindow';
import { CustomizationPanel } from './CustomizationPanel';
import { PixelStudioWidget } from './widgets/PixelStudioWidget';
import { ScrollSnapWidget } from './widgets/ScrollSnapWidget';
import { TimeTravelWidget } from './widgets/TimeTravelWidget';
import type { DesktopState, DesktopIconData, WindowState, WindowType, DesktopTheme } from './types';
import { PRESET_THEMES, buildBackground, getFontSize } from './types';

// --- Inline widget components ---

function AboutWidget({ user }: { user: { pseudonym: string; role: string; level: number; points: number } }) {
  return (
    <div className="p-4 flex flex-col items-center text-center gap-3">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7c413c] to-[#7c413c] flex items-center justify-center text-2xl font-bold text-[var(--color-foreground)] shadow-lg">
        {user.pseudonym.charAt(0).toUpperCase()}
      </div>
      <h3 className="text-lg font-semibold">{user.pseudonym}</h3>
      <span className="text-sm opacity-60 capitalize">{user.role}</span>
      <div className="flex gap-4 text-xs">
        <span>Level {user.level}</span>
        <span>{user.points} pts</span>
      </div>
    </div>
  );
}

function BadgesWidget({ badges }: { badges: string[] }) {
  return (
    <div className="p-4 space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wider opacity-60 mb-3">Badges</h4>
      {badges.length === 0 ? (
        <p className="text-sm opacity-50">No badges yet</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <span key={b} className="px-2 py-1 rounded-full text-xs bg-[color:rgba(246,212,203,0.1)]">{b}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ImpactWidget({ points, level }: { points: number; level: number }) {
  return (
    <div className="p-4 space-y-3">
      <h4 className="text-xs font-medium uppercase tracking-wider opacity-60">Impact</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-2 rounded-lg bg-[color:rgba(246,212,203,0.05)]">
          <Zap className="w-4 h-4 mx-auto mb-1 text-[#e0b115]" />
          <div className="text-lg font-bold">{points}</div>
          <div className="text-[10px] opacity-50">Credits</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-[color:rgba(246,212,203,0.05)]">
          <Flame className="w-4 h-4 mx-auto mb-1 text-[#7c413c]" />
          <div className="text-lg font-bold">{level}</div>
          <div className="text-[10px] opacity-50">Level</div>
        </div>
      </div>
    </div>
  );
}

function TodosWidget({ todos }: { todos: Array<{ id: number; title: string; is_completed: boolean; points_assigned: number }> }) {
  const pending = todos.filter(t => !t.is_completed);
  return (
    <div className="p-4 space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wider opacity-60 mb-2">Todos ({pending.length})</h4>
      {pending.length === 0 ? (
        <p className="text-sm opacity-50">All clear!</p>
      ) : (
        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {pending.slice(0, 10).map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm p-2 rounded bg-[color:rgba(246,212,203,0.05)]">
              <span className="truncate">{t.title}</span>
              <span className="text-xs opacity-40 ml-2 shrink-0">{t.points_assigned}pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChallengesWidget({ challenges }: { challenges: Array<{ id: string; title: string; progress: number; target: number; status: string }> }) {
  return (
    <div className="p-4 space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wider opacity-60 mb-2">Challenges</h4>
      {challenges.length === 0 ? (
        <p className="text-sm opacity-50">No challenges yet</p>
      ) : (
        <div className="space-y-3">
          {challenges.slice(0, 5).map((c) => (
            <div key={c.id}>
              <div className="flex justify-between text-xs mb-1">
                <span className="truncate">{c.title}</span>
                <span className="opacity-50">{c.progress}/{c.target}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[color:rgba(246,212,203,0.1)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (c.progress / c.target) * 100)}%`,
                    background: c.status === 'complete' ? '#7c413c' : 'var(--accent-color, #7c413c)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesWidget() {
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<string[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('desktop-notes') : null;
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const save = (list: string[]) => {
    setNotes(list);
    try { localStorage.setItem('desktop-notes', JSON.stringify(list)); } catch { /* ignore */ }
  };

  return (
    <div className="p-4 space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wider opacity-60 mb-2">Notes</h4>
      <div className="flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) { save([note.trim(), ...notes]); setNote(''); } }}
          placeholder="Add note..."
          className="flex-1 text-sm px-2 py-1 rounded bg-[color:rgba(246,212,203,0.1)] border border-[color:rgba(246,212,203,0.1)] outline-none"
        />
        <button
          onClick={() => { if (note.trim()) { save([note.trim(), ...notes]); setNote(''); } }}
          className="text-xs px-2 py-1 rounded bg-[color:rgba(246,212,203,0.1)] hover:bg-[color:rgba(246,212,203,0.2)]"
        >+</button>
      </div>
      <div className="space-y-1 max-h-[260px] overflow-y-auto">
        {notes.map((n, i) => (
          <div key={i} className="flex items-center justify-between text-sm p-1.5 rounded bg-[color:rgba(246,212,203,0.05)]">
            <span className="truncate">{n}</span>
            <button onClick={() => save(notes.filter((_, j) => j !== i))} className="text-xs opacity-40 hover:opacity-80 ml-1">x</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Widget menu ---

interface WidgetOption { type: WindowType; label: string; icon: React.ElementType; }
const WIDGETS: WidgetOption[] = [
  { type: 'about', label: 'About', icon: User },
  { type: 'badges', label: 'Badges', icon: Award },
  { type: 'impact', label: 'Impact', icon: Zap },
  { type: 'todos', label: 'Todos', icon: ListChecks },
  { type: 'challenges', label: 'Challenges', icon: Flame },
  { type: 'notes', label: 'Notes', icon: StickyNote },
  { type: 'timebank', label: 'Timebank', icon: Clock },
  { type: 'links', label: 'Links', icon: Link2 },
  { type: 'wall', label: 'Wall', icon: FileText },
  { type: 'microcosms', label: 'Microcosms', icon: Users },
  { type: 'pixel-studio', label: 'Pixel Art', icon: Paintbrush },
  { type: 'scroll-snap', label: 'Scroll Snap', icon: ScrollText },
  { type: 'time-travel-gallery', label: 'Gallery', icon: ImageIcon },
];

// --- Window dimensions ---

const WIN_SIZE: Partial<Record<WindowType, { w: number; h: number }>> = {
  notes: { w: 340, h: 400 },
  wall: { w: 400, h: 480 },
  settings: { w: 320, h: 380 },
  todos: { w: 360, h: 420 },
  challenges: { w: 380, h: 400 },
  customization: { w: 340, h: 520 },
  'pixel-studio': { w: 360, h: 420 },
  'scroll-snap': { w: 360, h: 480 },
  'time-travel-gallery': { w: 380, h: 440 },
};

function getWindowSize(type: WindowType) {
  const s = WIN_SIZE[type];
  return { width: s?.w ?? 360, height: s?.h ?? 400 };
}

// --- Default icons ---

const DEFAULT_ICONS: DesktopIconData[] = [
  { id: 'i-about',      kind: 'app',    label: 'About Me',    x: 30,  y: 30,  windowType: 'about' },
  { id: 'i-badges',     kind: 'folder', label: 'Badges',      x: 30,  y: 140, windowType: 'badges' },
  { id: 'i-impact',     kind: 'app',    label: 'Impact',      x: 30,  y: 250, windowType: 'impact' },
  { id: 'i-todos',      kind: 'file',   label: 'Todos',       x: 30,  y: 360, windowType: 'todos' },
  { id: 'i-challenges', kind: 'app',    label: 'Challenges',  x: 130, y: 30,  windowType: 'challenges' },
  { id: 'i-notes',      kind: 'file',   label: 'Notes',       x: 130, y: 140, windowType: 'notes' },
  { id: 'i-microcosms', kind: 'folder', label: 'Microcosms',  x: 130, y: 250, windowType: 'microcosms' },
  { id: 'i-pixel',      kind: 'app',    label: 'Pixel Art',   x: 130, y: 360, windowType: 'pixel-studio' },
  { id: 'i-gallery',    kind: 'app',    label: 'Gallery',     x: 230, y: 30,  windowType: 'time-travel-gallery' },
  { id: 'i-scroll',     kind: 'app',    label: 'Scroll Snap', x: 230, y: 140, windowType: 'scroll-snap' },
];

const DEFAULT_THEME = PRESET_THEMES[0].theme;

// --- Google Font loader ---

function useGoogleFont(fontFamily: string) {
  useEffect(() => {
    if (!fontFamily || fontFamily === 'system-ui') return;
    const id = `gfont-${fontFamily.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }, [fontFamily]);
}

// --- Main canvas ---

export interface ProfileDesktopProps {
  user: { pseudonym: string; role: string; level: number; points: number };
  badges: string[];
  todos: Array<{ id: number; title: string; is_completed: boolean; points_assigned: number }>;
  challenges: Array<{ id: string; title: string; progress: number; target: number; status: string }>;
  isOwner?: boolean;
}

export function DesktopCanvas({ user, badges, todos, challenges, isOwner = true }: ProfileDesktopProps) {
  const [state, setState] = useState<DesktopState>(() => {
    if (typeof window === 'undefined') return { icons: DEFAULT_ICONS, windows: [], focusedWindowId: null, theme: DEFAULT_THEME };
    try {
      const saved = localStorage.getItem('profile-desktop-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old theme format
        if (parsed.theme && !parsed.theme.bgType) {
          parsed.theme = { ...DEFAULT_THEME, ...parsed.theme };
        }
        // Add missing fields to windows
        if (parsed.windows) {
          parsed.windows = parsed.windows.map((w: WindowState) => ({
            ...w,
            isMinimized: w.isMinimized ?? false,
            isMaximized: w.isMaximized ?? false,
          }));
        }
        return parsed;
      }
    } catch { /* ignore */ }
    return { icons: DEFAULT_ICONS, windows: [], focusedWindowId: null, theme: DEFAULT_THEME };
  });

  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [nextZ, setNextZ] = useState(10);

  // Load Google Font
  useGoogleFont(state.theme.fontFamily);

  // Persist state
  useEffect(() => {
    try { localStorage.setItem('profile-desktop-state', JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  // Apply theme CSS vars
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg-color', state.theme.bgColor);
    root.style.setProperty('--accent-color', state.theme.accentColor);
    root.style.setProperty('--text-color', state.theme.textColor);
    root.style.setProperty('--window-bg', state.theme.windowBg);
    return () => {
      root.style.removeProperty('--bg-color');
      root.style.removeProperty('--accent-color');
      root.style.removeProperty('--text-color');
      root.style.removeProperty('--window-bg');
    };
  }, [state.theme]);

  const openWindow = useCallback((type: WindowType, title: string) => {
    setState((prev) => {
      const existing = prev.windows.find(w => w.type === type && w.isOpen);
      if (existing) {
        // If minimized, restore it
        if (existing.isMinimized) {
          return {
            ...prev,
            windows: prev.windows.map(w => w.id === existing.id ? { ...w, isMinimized: false } : w),
            focusedWindowId: existing.id,
          };
        }
        return { ...prev, focusedWindowId: existing.id };
      }

      const { width, height } = getWindowSize(type);
      const idx = prev.windows.filter(w => w.isOpen).length;
      const newWin: WindowState = {
        id: `w-${type}-${Date.now()}`,
        type, title,
        x: 200 + idx * 30,
        y: 80 + idx * 30,
        width, height,
        zIndex: nextZ,
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
      };
      setNextZ((z) => z + 1);
      return { ...prev, windows: [...prev.windows, newWin], focusedWindowId: newWin.id };
    });
  }, [nextZ]);

  const closeWindow = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      windows: prev.windows.filter(w => w.id !== id),
      focusedWindowId: prev.focusedWindowId === id ? null : prev.focusedWindowId,
    }));
  }, []);

  const focusWindow = useCallback((id: string) => {
    setNextZ((z) => {
      setState((prev) => ({
        ...prev,
        focusedWindowId: id,
        windows: prev.windows.map(w => w.id === id ? { ...w, zIndex: z + 1 } : w),
      }));
      return z + 1;
    });
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      windows: prev.windows.map(w => w.id === id ? { ...w, x, y } : w),
    }));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      windows: prev.windows.map(w => w.id === id ? { ...w, isMinimized: true } : w),
      focusedWindowId: prev.focusedWindowId === id ? null : prev.focusedWindowId,
    }));
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      windows: prev.windows.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w),
    }));
  }, []);

  const resizeWindow = useCallback((id: string, width: number, height: number) => {
    setState((prev) => ({
      ...prev,
      windows: prev.windows.map(w => w.id === id ? { ...w, width, height } : w),
    }));
  }, []);

  const restoreWindow = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      windows: prev.windows.map(w => w.id === id ? { ...w, isMinimized: false } : w),
      focusedWindowId: id,
    }));
    setNextZ(z => {
      setState(prev => ({
        ...prev,
        windows: prev.windows.map(w => w.id === id ? { ...w, zIndex: z + 1 } : w),
      }));
      return z + 1;
    });
  }, []);

  const moveIcon = useCallback((id: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      icons: prev.icons.map(i => i.id === id ? { ...i, x, y } : i),
    }));
  }, []);

  const handleIconOpen = useCallback((icon: DesktopIconData) => {
    openWindow(icon.windowType, icon.label);
  }, [openWindow]);

  const updateTheme = useCallback((theme: DesktopTheme) => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  const renderWidget = useCallback((win: WindowState) => {
    switch (win.type) {
      case 'about': return <AboutWidget user={user} />;
      case 'badges': return <BadgesWidget badges={badges} />;
      case 'impact': return <ImpactWidget points={user.points} level={user.level} />;
      case 'todos': return <TodosWidget todos={todos} />;
      case 'challenges': return <ChallengesWidget challenges={challenges} />;
      case 'notes': return <NotesWidget />;
      case 'settings': return <CustomizationPanel theme={state.theme} onUpdate={updateTheme} />;
      case 'customization': return <CustomizationPanel theme={state.theme} onUpdate={updateTheme} />;
      case 'pixel-studio': return <PixelStudioWidget />;
      case 'scroll-snap': return <ScrollSnapWidget />;
      case 'time-travel-gallery': return <TimeTravelWidget />;
      case 'links': return <div className="p-4 text-sm opacity-50">Links widget — connect your API data here</div>;
      case 'wall': return <div className="p-4 text-sm opacity-50">Wall widget — posts feed placeholder</div>;
      case 'microcosms': return <div className="p-4 text-sm opacity-50">Microcosms widget — community groups placeholder</div>;
      case 'timebank': return <div className="p-4 text-sm opacity-50">Timebank widget — hours log placeholder</div>;
      default: return null;
    }
  }, [user, badges, todos, challenges, state.theme, updateTheme]);

  // Minimized windows for taskbar
  const minimizedWindows = state.windows.filter(w => w.isOpen && w.isMinimized);

  // Build background style
  const bgStyle = useMemo(() => {
    const theme = state.theme;
    if (theme.bgType === 'gradient') {
      return { background: buildBackground(theme) };
    }
    if (theme.bgType === 'image' && theme.bgImage) {
      return { background: theme.bgColor };
    }
    return { background: theme.bgColor };
  }, [state.theme]);

  return (
    <div
      className="relative w-full min-h-screen overflow-hidden"
      style={{
        ...bgStyle,
        fontFamily: state.theme.fontFamily,
        fontSize: getFontSize(state.theme.fontSize),
      }}
    >
      {/* Background image */}
      {state.theme.bgType === 'image' && state.theme.bgImage && (
        <div className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${state.theme.bgImage})`,
            backgroundSize: state.theme.bgImageFit === 'tile' ? 'auto' : state.theme.bgImageFit,
            backgroundRepeat: state.theme.bgImageFit === 'tile' ? 'repeat' : 'no-repeat',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* SVG noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
        }}
      />

      {/* Desktop icons */}
      {state.icons.map((icon) => (
        <DesktopIcon
          key={icon.id}
          icon={icon}
          selected={selectedIcon === icon.id}
          onOpen={handleIconOpen}
          onSelect={setSelectedIcon}
          onMove={moveIcon}
        />
      ))}

      {/* Windows */}
      {state.windows.filter(w => w.isOpen).map((win) => (
        <DesktopWindow
          key={win.id}
          win={win}
          focused={state.focusedWindowId === win.id}
          theme={state.theme}
          onClose={closeWindow}
          onFocus={focusWindow}
          onMove={moveWindow}
          onMinimize={minimizeWindow}
          onMaximize={maximizeWindow}
          onResize={resizeWindow}
        >
          {renderWidget(win)}
        </DesktopWindow>
      ))}

      {/* Taskbar dock for minimized windows */}
      {minimizedWindows.length > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-3 py-1.5 mb-1 rounded-xl"
          style={{
            background: state.theme.windowBg,
            backdropFilter: `blur(${state.theme.windowBlur}px)`,
            border: '1px solid rgba(246,212,203,0.15)',
          }}>
          {minimizedWindows.map(win => {
            const widget = WIDGETS.find(w => w.type === win.type);
            const Icon = widget?.icon || Minus;
            return (
              <button key={win.id}
                onClick={() => restoreWindow(win.id)}
                className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-[color:rgba(246,212,203,0.1)] transition-colors"
                style={{ color: state.theme.textColor }}
                title={win.title}>
                <Icon className="w-4 h-4" />
                <span className="text-[8px] max-w-[40px] truncate">{win.title}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Add widget FAB */}
      <div className="fixed bottom-6 left-6 z-50">
        {showMenu && (
          <div
            className="absolute bottom-16 left-0 p-3 rounded-xl shadow-2xl"
            style={{
              background: state.theme.windowBg,
              backdropFilter: `blur(${state.theme.windowBlur}px)`,
              border: '1px solid rgba(246,212,203,0.2)',
              minWidth: 260,
            }}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-medium opacity-60" style={{ color: state.theme.textColor }}>Add Widget</span>
              <button onClick={() => setShowMenu(false)} className="text-xs opacity-40 hover:opacity-80" style={{ color: state.theme.textColor }}>x</button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {WIDGETS.map((w) => (
                <button
                  key={w.type}
                  onClick={() => { openWindow(w.type, w.label); setShowMenu(false); }}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-[color:rgba(246,212,203,0.1)] transition-colors"
                  style={{ color: state.theme.textColor }}
                >
                  <w.icon className="w-4 h-4" />
                  <span className="text-[8px]">{w.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
          style={{ background: state.theme.accentColor, color: '#fff' }}
          aria-label="Add widget"
        >
          <PlusCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Customization FAB (owner only) */}
      {isOwner && (
        <button
          onClick={() => openWindow('customization', 'Customize')}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-[color:rgba(246,212,203,0.1)] hover:bg-[color:rgba(246,212,203,0.2)] transition-colors"
          style={{ color: state.theme.textColor }}
          aria-label="Customize"
        >
          <Palette className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
