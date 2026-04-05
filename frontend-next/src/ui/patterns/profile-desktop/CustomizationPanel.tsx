'use client';

import { useState, useCallback } from 'react';
import { Palette, Type, AppWindow, Grid2x2, Image as ImageIcon, Download, Upload, RotateCcw } from 'lucide-react';
import type { DesktopTheme, BgType, GradientType, ButtonStyle, IconStyle, FontSize } from './types';
import { PRESET_THEMES, GOOGLE_FONTS } from './types';

interface Props {
  theme: DesktopTheme;
  onUpdate: (theme: DesktopTheme) => void;
}

type Tab = 'background' | 'colors' | 'typography' | 'windows' | 'icons';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'background', label: 'BG', icon: ImageIcon },
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'typography', label: 'Font', icon: Type },
  { id: 'windows', label: 'Win', icon: AppWindow },
  { id: 'icons', label: 'Icons', icon: Grid2x2 },
];

export function CustomizationPanel({ theme, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('background');

  const update = useCallback(<K extends keyof DesktopTheme>(key: K, value: DesktopTheme[K]) => {
    onUpdate({ ...theme, [key]: value });
  }, [theme, onUpdate]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'desktop-theme.json'; a.click();
    URL.revokeObjectURL(url);
  }, [theme]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string);
          onUpdate(imported);
        } catch { /* ignore */ }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [onUpdate]);

  const handleReset = useCallback(() => {
    onUpdate(PRESET_THEMES[0].theme);
  }, [onUpdate]);

  const handleBgImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        update('bgImage', ev.target?.result as string);
        update('bgType', 'image');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [update]);

  return (
    <div className="p-3 space-y-3 text-[11px]">
      {/* Tab bar */}
      <div className="flex gap-1">
        {TABS.map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors text-[9px] ${
              activeTab === tab.id ? 'bg-[color:rgba(246,212,203,0.15)] font-medium' : 'hover:bg-[color:rgba(246,212,203,0.05)] opacity-60'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Background tab */}
      {activeTab === 'background' && (
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {(['solid', 'gradient', 'image'] as BgType[]).map(t => (
              <button key={t} onClick={() => update('bgType', t)}
                className={`flex-1 px-2 py-1.5 rounded text-[9px] capitalize transition-colors ${
                  theme.bgType === t ? 'bg-[color:rgba(246,212,203,0.2)]' : 'bg-[color:rgba(246,212,203,0.05)] hover:bg-[color:rgba(246,212,203,0.1)]'
                }`}>{t}</button>
            ))}
          </div>

          {theme.bgType === 'solid' && (
            <label className="flex items-center justify-between">
              <span>Color</span>
              <input type="color" value={theme.bgColor} onChange={e => update('bgColor', e.target.value)} className="w-8 h-6 rounded cursor-pointer" />
            </label>
          )}

          {theme.bgType === 'gradient' && (
            <div className="space-y-2">
              <div className="flex gap-1.5">
                {(['linear', 'radial', 'conic'] as GradientType[]).map(t => (
                  <button key={t} onClick={() => update('bgGradient', { ...theme.bgGradient, type: t })}
                    className={`flex-1 px-1 py-1 rounded text-[8px] capitalize ${
                      theme.bgGradient.type === t ? 'bg-[color:rgba(246,212,203,0.15)]' : 'bg-[color:rgba(246,212,203,0.05)]'
                    }`}>{t}</button>
                ))}
              </div>
              {theme.bgGradient.type !== 'radial' && (
                <label className="flex items-center justify-between">
                  <span>Angle</span>
                  <input type="range" min={0} max={360} value={theme.bgGradient.angle}
                    onChange={e => update('bgGradient', { ...theme.bgGradient, angle: parseInt(e.target.value) })}
                    className="w-24 h-1" />
                  <span className="w-8 text-right text-[9px] opacity-50">{theme.bgGradient.angle}°</span>
                </label>
              )}
              {theme.bgGradient.stops.map((stop, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="color" value={stop.color}
                    onChange={e => {
                      const stops = [...theme.bgGradient.stops];
                      stops[i] = { ...stop, color: e.target.value };
                      update('bgGradient', { ...theme.bgGradient, stops });
                    }}
                    className="w-6 h-5 rounded cursor-pointer" />
                  <input type="range" min={0} max={100} value={stop.position}
                    onChange={e => {
                      const stops = [...theme.bgGradient.stops];
                      stops[i] = { ...stop, position: parseInt(e.target.value) };
                      update('bgGradient', { ...theme.bgGradient, stops });
                    }}
                    className="flex-1 h-1" />
                  <span className="text-[8px] w-6 opacity-40">{stop.position}%</span>
                </div>
              ))}
              <button onClick={() => {
                const stops = [...theme.bgGradient.stops, { color: '#7c413c', position: 100 }];
                update('bgGradient', { ...theme.bgGradient, stops });
              }} className="w-full text-[9px] py-1 rounded bg-[color:rgba(246,212,203,0.05)] hover:bg-[color:rgba(246,212,203,0.1)]">+ Add Stop</button>
            </div>
          )}

          {theme.bgType === 'image' && (
            <div className="space-y-2">
              <button onClick={handleBgImage} className="w-full flex items-center justify-center gap-1 py-2 rounded bg-[color:rgba(246,212,203,0.05)] hover:bg-[color:rgba(246,212,203,0.1)]">
                <Upload className="w-3 h-3" /> Upload Image
              </button>
              {theme.bgImage && (
                <div className="flex gap-1.5">
                  {(['cover', 'contain', 'fill', 'tile'] as const).map(fit => (
                    <button key={fit} onClick={() => update('bgImageFit', fit)}
                      className={`flex-1 px-1 py-1 rounded text-[8px] capitalize ${
                        theme.bgImageFit === fit ? 'bg-[color:rgba(246,212,203,0.15)]' : 'bg-[color:rgba(246,212,203,0.05)]'
                      }`}>{fit}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Colors tab */}
      {activeTab === 'colors' && (
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span>Accent</span>
            <input type="color" value={theme.accentColor} onChange={e => update('accentColor', e.target.value)} className="w-8 h-6 rounded cursor-pointer" />
          </label>
          <label className="flex items-center justify-between">
            <span>Text</span>
            <input type="color" value={theme.textColor} onChange={e => update('textColor', e.target.value)} className="w-8 h-6 rounded cursor-pointer" />
          </label>
          <label className="flex items-center justify-between">
            <span>Window BG</span>
            <input type="color" value={theme.windowBg.startsWith('rgba') ? '#f6d4cb' : theme.windowBg}
              onChange={e => update('windowBg', `${e.target.value}20`)} className="w-8 h-6 rounded cursor-pointer" />
          </label>

          <div className="pt-2">
            <span className="text-[9px] uppercase tracking-wider opacity-40 mb-2 block">Preset Themes</span>
            <div className="grid grid-cols-3 gap-1.5">
              {PRESET_THEMES.map(p => (
                <button key={p.name} onClick={() => onUpdate(p.theme)}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded text-[8px] transition-colors ${
                    theme.bgColor === p.theme.bgColor ? 'ring-1 ring-white/40 bg-[color:rgba(246,212,203,0.1)]' : 'bg-[color:rgba(246,212,203,0.05)] hover:bg-[color:rgba(246,212,203,0.1)]'
                  }`}>
                  <div className="w-6 h-6 rounded-full border border-[color:rgba(246,212,203,0.2)]" style={{ background: p.theme.bgColor }} />
                  <span className="truncate w-full text-center">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Typography tab */}
      {activeTab === 'typography' && (
        <div className="space-y-3">
          <div>
            <span className="text-[9px] opacity-50 mb-1 block">Font Family</span>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {GOOGLE_FONTS.map(font => (
                <button key={font} onClick={() => update('fontFamily', font)}
                  className={`w-full text-left px-2 py-1.5 rounded text-[10px] transition-colors ${
                    theme.fontFamily === font ? 'bg-[color:rgba(246,212,203,0.15)]' : 'hover:bg-[color:rgba(246,212,203,0.05)]'
                  }`}
                  style={{ fontFamily: font }}>
                  {font}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[9px] opacity-50 mb-1 block">Font Size</span>
            <div className="flex gap-1.5">
              {(['small', 'medium', 'large'] as FontSize[]).map(s => (
                <button key={s} onClick={() => update('fontSize', s)}
                  className={`flex-1 px-2 py-1.5 rounded text-[9px] capitalize ${
                    theme.fontSize === s ? 'bg-[color:rgba(246,212,203,0.15)]' : 'bg-[color:rgba(246,212,203,0.05)] hover:bg-[color:rgba(246,212,203,0.1)]'
                  }`}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Windows tab */}
      {activeTab === 'windows' && (
        <div className="space-y-3">
          <div>
            <span className="text-[9px] opacity-50 mb-1 block">Button Style</span>
            <div className="flex gap-1.5">
              {(['rounded', 'sharp', 'pill', 'ghost', 'outline'] as ButtonStyle[]).map(s => (
                <button key={s} onClick={() => update('buttonStyle', s)}
                  className={`flex-1 px-1 py-1.5 rounded text-[8px] capitalize ${
                    theme.buttonStyle === s ? 'bg-[color:rgba(246,212,203,0.15)]' : 'bg-[color:rgba(246,212,203,0.05)] hover:bg-[color:rgba(246,212,203,0.1)]'
                  }`}>{s}</button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between">
            <span>Border Radius</span>
            <input type="range" min={0} max={24} value={theme.borderRadius}
              onChange={e => update('borderRadius', parseInt(e.target.value))} className="w-24 h-1" />
            <span className="w-6 text-right text-[9px] opacity-50">{theme.borderRadius}</span>
          </label>
          <label className="flex items-center justify-between">
            <span>Shadow</span>
            <input type="range" min={0} max={3} value={theme.shadowIntensity}
              onChange={e => update('shadowIntensity', parseInt(e.target.value))} className="w-24 h-1" />
            <span className="w-6 text-right text-[9px] opacity-50">{theme.shadowIntensity}</span>
          </label>
          <label className="flex items-center justify-between">
            <span>Blur</span>
            <input type="range" min={0} max={40} value={theme.windowBlur}
              onChange={e => update('windowBlur', parseInt(e.target.value))} className="w-24 h-1" />
            <span className="w-6 text-right text-[9px] opacity-50">{theme.windowBlur}</span>
          </label>
          <label className="flex items-center justify-between">
            <span>Opacity</span>
            <input type="range" min={10} max={100} value={Math.round(theme.windowOpacity * 100)}
              onChange={e => update('windowOpacity', parseInt(e.target.value) / 100)} className="w-24 h-1" />
            <span className="w-8 text-right text-[9px] opacity-50">{Math.round(theme.windowOpacity * 100)}%</span>
          </label>
        </div>
      )}

      {/* Icons tab */}
      {activeTab === 'icons' && (
        <div className="space-y-3">
          <span className="text-[9px] opacity-50 mb-1 block">Icon Style</span>
          <div className="grid grid-cols-2 gap-1.5">
            {(['default', 'minimal', 'rounded', 'square'] as IconStyle[]).map(s => (
              <button key={s} onClick={() => update('iconStyle', s)}
                className={`flex items-center justify-center gap-1.5 p-2 rounded text-[9px] capitalize ${
                  theme.iconStyle === s ? 'bg-[color:rgba(246,212,203,0.15)] ring-1 ring-white/20' : 'bg-[color:rgba(246,212,203,0.05)] hover:bg-[color:rgba(246,212,203,0.1)]'
                }`}>
                <div className={`w-4 h-4 bg-[color:rgba(246,212,203,0.3)] ${
                  s === 'rounded' ? 'rounded-full' : s === 'square' ? 'rounded-none' : s === 'minimal' ? 'rounded-sm' : 'rounded-md'
                }`} />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex gap-1.5 pt-2 border-t border-[color:rgba(246,212,203,0.1)]">
        <button onClick={handleReset}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[9px] bg-[color:rgba(246,212,203,0.05)] hover:bg-[color:rgba(246,212,203,0.1)]">
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
        <button onClick={handleExport}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[9px] bg-[color:rgba(246,212,203,0.05)] hover:bg-[color:rgba(246,212,203,0.1)]">
          <Download className="w-3 h-3" /> Export
        </button>
        <button onClick={handleImport}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[9px] bg-[color:rgba(246,212,203,0.05)] hover:bg-[color:rgba(246,212,203,0.1)]">
          <Upload className="w-3 h-3" /> Import
        </button>
      </div>
    </div>
  );
}
