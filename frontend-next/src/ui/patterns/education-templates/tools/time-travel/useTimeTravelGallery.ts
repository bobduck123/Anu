'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Artwork } from './metMuseumApi';
import { fetchArtworksForRange } from './metMuseumApi';
import { getPeriodForYear, interpolatePeriodBackground, interpolatePeriodTextColor } from './periods';
import type { ArtPeriod } from './periods';

export interface UserImage {
  id: string;
  src: string;      // base64 data URL
  title: string;
  year: number;
}

const USER_IMAGES_KEY = 'time-travel-user-images';

function loadUserImages(): UserImage[] {
  try {
    const saved = localStorage.getItem(USER_IMAGES_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
}

function saveUserImages(images: UserImage[]): void {
  try {
    localStorage.setItem(USER_IMAGES_KEY, JSON.stringify(images));
  } catch { /* storage full */ }
}

export function useTimeTravelGallery() {
  const [currentYear, setCurrentYear] = useState(1600);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [userImages, setUserImages] = useState<UserImage[]>(() => loadUserImages());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreenArtwork, setFullscreenArtwork] = useState<Artwork | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Derived state
  const currentPeriod: ArtPeriod | null = getPeriodForYear(currentYear);
  const bgColor = interpolatePeriodBackground(currentYear);
  const textColor = interpolatePeriodTextColor(currentYear);

  // Fetch artworks when year changes
  const fetchArtworks = useCallback(async (year: number) => {
    // Abort previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      // Search within a decade range around the year
      const yearStart = Math.floor(year / 10) * 10;
      const yearEnd = yearStart + 10;
      const results = await fetchArtworksForRange(yearStart, yearEnd, 6, controller.signal);
      if (!controller.signal.aborted) {
        setArtworks(results);
        setIsLoading(false);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to fetch artworks');
        setIsLoading(false);
      }
    }
  }, []);

  // Fetch on year change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchArtworks(currentYear);
    }, 300);
    return () => clearTimeout(timer);
  }, [currentYear, fetchArtworks]);

  // Cleanup abort controller
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Year navigation
  const navigateToYear = useCallback((year: number) => {
    const clamped = Math.max(1440, Math.min(1940, year));
    setCurrentYear(clamped);
  }, []);

  const snapToDecade = useCallback((year: number) => {
    navigateToYear(Math.round(year / 10) * 10);
  }, [navigateToYear]);

  // User image upload
  const addUserImage = useCallback((file: File, title: string, year: number) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newImage: UserImage = {
        id: `user-${Date.now()}`,
        src: e.target?.result as string,
        title: title || file.name,
        year,
      };
      setUserImages(prev => {
        const next = [...prev, newImage];
        saveUserImages(next);
        return next;
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const removeUserImage = useCallback((id: string) => {
    setUserImages(prev => {
      const next = prev.filter(img => img.id !== id);
      saveUserImages(next);
      return next;
    });
  }, []);

  // User images for current decade
  const currentUserImages = userImages.filter(img => {
    const decadeStart = Math.floor(currentYear / 10) * 10;
    return img.year >= decadeStart && img.year < decadeStart + 10;
  });

  const retry = useCallback(() => {
    fetchArtworks(currentYear);
  }, [currentYear, fetchArtworks]);

  return {
    currentYear,
    artworks,
    userImages: currentUserImages,
    allUserImages: userImages,
    isLoading,
    error,
    fullscreenArtwork,
    showUploadModal,
    currentPeriod,
    bgColor,
    textColor,
    galleryRef,
    navigateToYear,
    snapToDecade,
    setFullscreenArtwork,
    setShowUploadModal,
    addUserImage,
    removeUserImage,
    retry,
  };
}
