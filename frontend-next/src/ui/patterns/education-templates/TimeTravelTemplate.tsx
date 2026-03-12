'use client';

import { useState, useCallback, useRef } from 'react';
import { X, Upload, ChevronLeft, ChevronRight, ZoomIn, ExternalLink, RefreshCw, ImagePlus } from 'lucide-react';
import { useTimeTravelGallery } from './tools/time-travel/useTimeTravelGallery';
import { PERIODS } from './tools/time-travel/periods';
import type { Artwork } from './tools/time-travel/metMuseumApi';

interface Props {
  mode?: 'full' | 'compact';
}

export function TimeTravelTemplate({ mode = 'full' }: Props) {
  const {
    currentYear, artworks, userImages, isLoading, error,
    fullscreenArtwork, showUploadModal, currentPeriod, bgColor, textColor,
    galleryRef, navigateToYear,
    setFullscreenArtwork, setShowUploadModal, addUserImage, removeUserImage, retry,
  } = useTimeTravelGallery();

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadYear, setUploadYear] = useState(currentYear);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const dialerRef = useRef<HTMLInputElement>(null);

  const isCompact = mode === 'compact';

  const handleUploadSubmit = useCallback(() => {
    if (!uploadFile) return;
    addUserImage(uploadFile, uploadTitle, uploadYear);
    setUploadFile(null);
    setUploadTitle('');
    setShowUploadModal(false);
  }, [uploadFile, uploadTitle, uploadYear, addUserImage, setShowUploadModal]);

  // All items to display (Met artworks + user images)
  const allItems = [
    ...artworks.map(a => ({ type: 'met' as const, data: a })),
    ...userImages.map(img => ({ type: 'user' as const, data: img })),
  ];

  return (
    <div
      className={`relative ${isCompact ? 'h-full' : 'min-h-[calc(100vh-56px)]'} flex flex-col transition-colors duration-700`}
      style={{ background: bgColor, color: textColor }}
    >
      {/* Header */}
      {!isCompact && (
        <div className="text-center p-6 relative z-10">
          <h2 className="text-xs uppercase tracking-[0.3em] opacity-40 mb-1">Time-Traveling Gallery</h2>
          <h1 className="text-2xl font-light tracking-wide">Art Through the Ages</h1>
          {currentPeriod && (
            <p className="text-xs opacity-50 mt-2">{currentPeriod.name} ({currentPeriod.yearStart}–{currentPeriod.yearEnd})</p>
          )}
        </div>
      )}

      {/* Period info bar */}
      {!isCompact && currentPeriod && (
        <div className="text-center px-4 pb-4">
          <p className="text-[11px] opacity-40 max-w-xl mx-auto">{currentPeriod.description}</p>
        </div>
      )}

      {/* Artwork grid */}
      <div ref={galleryRef} className="flex-1 p-4 overflow-y-auto">
        {isLoading && (
          <div className={`grid ${isCompact ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-4`}>
            {Array.from({ length: isCompact ? 2 : 6 }).map((_, i) => (
              <div key={i} className="rounded-lg aspect-[3/4] animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center py-12">
            <p className="text-sm opacity-50 mb-3">{error}</p>
            <button onClick={retry} className="flex items-center gap-1.5 mx-auto px-4 py-2 text-xs rounded-lg"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {!isLoading && !error && allItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm opacity-40">No artworks found for this period</p>
            <p className="text-xs opacity-30 mt-1">Try a different decade or add your own</p>
          </div>
        )}

        {!isLoading && allItems.length > 0 && (
          <div className={`grid ${isCompact ? 'grid-cols-1 gap-2' : 'grid-cols-2 md:grid-cols-3 gap-4'}`}>
            {allItems.slice(0, isCompact ? 2 : undefined).map((item) => {
              if (item.type === 'met') {
                const artwork = item.data as Artwork;
                return (
                  <ArtworkCard
                    key={artwork.objectID}
                    artwork={artwork}
                    compact={isCompact}
                    onClick={() => !isCompact && setFullscreenArtwork(artwork)}
                  />
                );
              } else {
                const img = item.data as { id: string; src: string; title: string; year: number };
                return (
                  <div key={img.id}
                    className="group rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] relative"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src} alt={img.title} className="w-full aspect-[3/4] object-cover" loading="lazy" />
                    <div className="p-3">
                      <h3 className="text-xs font-medium truncate">{img.title}</h3>
                      <p className="text-[10px] opacity-40 mt-0.5">{img.year} — Your upload</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeUserImage(img.id); }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* Year dialer */}
      <div className="relative z-10 p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          {!isCompact && (
            <button onClick={() => navigateToYear(currentYear - 10)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="text-2xl font-light tracking-widest">{currentYear}</div>
            <input
              ref={dialerRef}
              type="range"
              min={1440} max={1940} step={10}
              value={currentYear}
              onChange={(e) => navigateToYear(parseInt(e.target.value))}
              className="w-full h-1 appearance-none bg-white/20 rounded-full cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
            />
            {!isCompact && (
              <div className="flex justify-between w-full text-[9px] opacity-30">
                {PERIODS.map(p => (
                  <button key={p.name} onClick={() => navigateToYear(p.yearStart)}
                    className="hover:opacity-100 transition-opacity">
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isCompact && (
            <button onClick={() => navigateToYear(currentYear + 10)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Add Your Art button */}
        {!isCompact && (
          <div className="flex justify-center mt-3">
            <button onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-[10px] rounded-full transition-colors"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <ImagePlus className="w-3 h-3" /> Add Your Art
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen viewer */}
      {fullscreenArtwork && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setFullscreenArtwork(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 z-10">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="max-w-4xl max-h-[90vh] p-4" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fullscreenArtwork.primaryImage} alt={fullscreenArtwork.title}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl" />
            <div className="text-white text-center mt-4">
              <h3 className="text-lg font-medium">{fullscreenArtwork.title}</h3>
              <p className="text-sm opacity-60 mt-1">{fullscreenArtwork.artistDisplayName}</p>
              <p className="text-xs opacity-40 mt-1">{fullscreenArtwork.objectDate} — {fullscreenArtwork.medium}</p>
              {fullscreenArtwork.objectURL && (
                <a href={fullscreenArtwork.objectURL} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-xs text-blue-400 hover:text-blue-300">
                  View on Met Museum <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowUploadModal(false)}>
          <div className="rounded-xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}
            style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.15)', color: '#e8e0d8' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Add Your Art</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] opacity-60">Image</label>
                <input type="file" accept="image/*" onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full mt-1 text-[10px]" />
              </div>
              <div>
                <label className="text-[10px] opacity-60">Title</label>
                <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="Artwork title"
                  className="w-full mt-1 text-[11px] px-2 py-1.5 rounded bg-white/10 border border-white/10 outline-none" />
              </div>
              <div>
                <label className="text-[10px] opacity-60">Year (1440-1940)</label>
                <input type="number" min={1440} max={1940} value={uploadYear}
                  onChange={e => setUploadYear(parseInt(e.target.value) || currentYear)}
                  className="w-full mt-1 text-[11px] px-2 py-1.5 rounded bg-white/10 border border-white/10 outline-none" />
              </div>
              <button onClick={handleUploadSubmit} disabled={!uploadFile}
                className="w-full flex items-center justify-center gap-1 px-3 py-2 text-[10px] rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-30 transition-colors">
                <Upload className="w-3 h-3" /> Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArtworkCard({ artwork, compact, onClick }: {
  artwork: Artwork; compact: boolean; onClick: () => void;
}) {
  return (
    <div
      className={`group rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl ${compact ? '' : ''}`}
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
      onClick={onClick}
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artwork.primaryImage} alt={artwork.title}
          className={`w-full ${compact ? 'aspect-[4/3]' : 'aspect-[3/4]'} object-cover`}
          loading="lazy" />
        {!compact && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-xs font-medium truncate">{artwork.title}</h3>
        <p className="text-[10px] opacity-50 truncate mt-0.5">{artwork.artistDisplayName}</p>
        <p className="text-[10px] opacity-30 mt-0.5">{artwork.objectDate}</p>
      </div>
    </div>
  );
}
