'use client';

import { useState, useCallback } from 'react';
import { ExternalLink, RefreshCw, ImagePlus, X } from 'lucide-react';
import { useTimeTravelGallery } from '../../education-templates/tools/time-travel/useTimeTravelGallery';
import type { UserImage } from '../../education-templates/tools/time-travel/useTimeTravelGallery';
import type { Artwork } from '../../education-templates/tools/time-travel/metMuseumApi';

export function TimeTravelWidget() {
  const {
    currentYear, artworks, userImages, isLoading, error,
    currentPeriod, textColor,
    navigateToYear, addUserImage, retry,
    setShowUploadModal, showUploadModal,
  } = useTimeTravelGallery();

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadYear, setUploadYear] = useState(currentYear);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const handleUploadSubmit = useCallback(() => {
    if (!uploadFile) return;
    addUserImage(uploadFile, uploadTitle, uploadYear);
    setUploadFile(null);
    setUploadTitle('');
    setShowUploadModal(false);
  }, [uploadFile, uploadTitle, uploadYear, addUserImage, setShowUploadModal]);

  const allItems = [
    ...artworks.slice(0, 2),
    ...userImages.slice(0, 1),
  ];

  return (
    <div className="p-3 space-y-3" style={{ color: textColor }}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-wider opacity-60">Time Travel</h4>
        <button onClick={() => setShowUploadModal(true)}
          className="p-1 rounded hover:bg-white/10 transition-colors" title="Add your art">
          <ImagePlus className="w-3 h-3" />
        </button>
      </div>

      {/* Year slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="opacity-40">1440</span>
          <span className="font-medium">{currentYear}</span>
          <span className="opacity-40">1940</span>
        </div>
        <input type="range" min={1440} max={1940} step={10} value={currentYear}
          onChange={e => navigateToYear(parseInt(e.target.value))}
          className="w-full h-1 appearance-none bg-white/20 rounded-full cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-grab" />
        {currentPeriod && (
          <p className="text-[9px] opacity-40 text-center">{currentPeriod.name}</p>
        )}
      </div>

      {/* Artwork thumbnails */}
      {isLoading && (
        <div className="flex gap-2">
          {[0, 1].map(i => (
            <div key={i} className="flex-1 aspect-square rounded animate-pulse bg-white/5" />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="text-center py-3">
          <p className="text-[9px] opacity-40 mb-1">Failed to load</p>
          <button onClick={retry} className="text-[9px] px-2 py-1 rounded bg-white/10 hover:bg-white/15">
            <RefreshCw className="w-3 h-3 inline mr-1" />Retry
          </button>
        </div>
      )}

      {!isLoading && !error && allItems.length === 0 && (
        <p className="text-[9px] opacity-30 text-center py-4">No artworks for this decade</p>
      )}

      {!isLoading && allItems.length > 0 && (
        <div className="flex gap-2">
          {allItems.map((item, i) => {
            const isUserImg = 'src' in item;
            const src = isUserImg ? (item as UserImage).src : (item as Artwork).primaryImage;
            const title = isUserImg ? (item as UserImage).title : (item as Artwork).title;
            return (
              <div key={i} className="flex-1 rounded overflow-hidden bg-white/5 border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={title} className="w-full aspect-square object-cover" loading="lazy" />
                <div className="p-1.5">
                  <p className="text-[8px] truncate">{title}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Open full gallery link */}
      <a href="/education/templates" className="flex items-center justify-center gap-1 text-[9px] opacity-50 hover:opacity-80 transition-opacity">
        Open Full Gallery <ExternalLink className="w-2.5 h-2.5" />
      </a>

      {/* Mini upload modal */}
      {showUploadModal && (
        <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center p-3 rounded-xl">
          <div className="bg-[#1a1a2e] border border-white/15 rounded-lg p-3 w-full max-w-[260px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium">Add Your Art</span>
              <button onClick={() => setShowUploadModal(false)}><X className="w-3 h-3" /></button>
            </div>
            <input type="file" accept="image/*" onChange={e => setUploadFile(e.target.files?.[0] || null)}
              className="w-full text-[9px]" />
            <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="Title"
              className="w-full text-[10px] px-2 py-1 rounded bg-white/10 border border-white/10 outline-none" />
            <input type="number" min={1440} max={1940} value={uploadYear}
              onChange={e => setUploadYear(parseInt(e.target.value) || currentYear)} placeholder="Year"
              className="w-full text-[10px] px-2 py-1 rounded bg-white/10 border border-white/10 outline-none" />
            <button onClick={handleUploadSubmit} disabled={!uploadFile}
              className="w-full text-[9px] py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white">
              Upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
