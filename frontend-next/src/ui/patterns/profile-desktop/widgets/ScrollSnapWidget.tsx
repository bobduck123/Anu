'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Upload, Settings2 } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  image: string;
  color: string;
}

const STORAGE_KEY = 'desktop-scroll-snap-config';
const DEFAULT_COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#2b2e4a', '#903749'];

function loadConfig(): Section[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [
    { id: '1', title: 'Welcome', image: '', color: DEFAULT_COLORS[0] },
    { id: '2', title: 'About', image: '', color: DEFAULT_COLORS[1] },
    { id: '3', title: 'Gallery', image: '', color: DEFAULT_COLORS[2] },
  ];
}

function saveConfig(sections: Section[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sections)); } catch { /* ignore */ }
}

export function ScrollSnapWidget() {
  const [sections, setSections] = useState<Section[]>(() => loadConfig());
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { saveConfig(sections); }, [sections]);

  const addSection = useCallback(() => {
    if (sections.length >= 10) return;
    const newSection: Section = {
      id: Date.now().toString(),
      title: `Section ${sections.length + 1}`,
      image: '',
      color: DEFAULT_COLORS[sections.length % DEFAULT_COLORS.length],
    };
    setSections(prev => [...prev, newSection]);
  }, [sections.length]);

  const removeSection = useCallback((id: string) => {
    if (sections.length <= 2) return;
    setSections(prev => prev.filter(s => s.id !== id));
  }, [sections.length]);

  const updateSection = useCallback((id: string, updates: Partial<Section>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const handleImageUpload = useCallback((id: string) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => updateSection(id, { image: ev.target?.result as string });
      reader.readAsDataURL(file);
    };
    input.click();
  }, [updateSection]);

  if (showSettings) {
    return (
      <div className="p-3 space-y-2 max-h-[360px] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium opacity-60">Scroll Snap Settings</h4>
          <button onClick={() => setShowSettings(false)} className="text-[9px] px-2 py-1 rounded bg-white/10 hover:bg-white/15">Done</button>
        </div>

        {sections.map((section, i) => (
          <div key={section.id} className="p-2 rounded-lg bg-white/5 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[9px] opacity-40 w-4">{i + 1}</span>
              <input value={section.title} onChange={e => updateSection(section.id, { title: e.target.value })}
                className="flex-1 text-[10px] px-1.5 py-1 rounded bg-white/10 border border-white/10 outline-none" />
              <input type="color" value={section.color} onChange={e => updateSection(section.id, { color: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer" />
              <button onClick={() => handleImageUpload(section.id)} className="p-1 rounded hover:bg-white/10">
                <Upload className="w-3 h-3" />
              </button>
              {sections.length > 2 && (
                <button onClick={() => removeSection(section.id)} className="p-1 rounded hover:bg-white/10 text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}

        {sections.length < 10 && (
          <button onClick={addSection}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-[9px] rounded bg-white/5 hover:bg-white/10">
            <Plus className="w-3 h-3" /> Add Section
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Scroll snap container */}
      <div ref={scrollRef} className="h-full overflow-y-auto snap-y snap-mandatory">
        {sections.map((section, i) => (
          <div key={section.id}
            className="snap-start w-full h-full flex flex-col items-center justify-center p-4 relative"
            style={{
              minHeight: '100%',
              background: section.image
                ? `url(${section.image}) center/cover no-repeat`
                : section.color,
            }}>
            {section.image && <div className="absolute inset-0 bg-black/40" />}
            <h3 className="text-lg font-medium relative z-10 text-white">{section.title}</h3>
            <div className="text-[10px] opacity-40 relative z-10 mt-1 text-white">{i + 1} / {sections.length}</div>
          </div>
        ))}
      </div>

      {/* Settings button */}
      <button onClick={() => setShowSettings(true)}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/30 hover:bg-black/50 transition-colors z-10">
        <Settings2 className="w-3 h-3 text-white" />
      </button>

      {/* Progress dots */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
        {sections.map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40" />
        ))}
      </div>
    </div>
  );
}
