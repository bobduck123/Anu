'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TerrainMarker {
  lat: number;
  lng: number;
}

interface EarthTerrainBackdropProps {
  markers?: TerrainMarker[];
  center?: [number, number];
  zoom?: number;
  creditLabel?: string;
}

const ESRI_WORLD_RELIEF_TILE_URL =
  'https://tiles.arcgis.com/tiles/jIL9msH9OI208GCb/arcgis/rest/services/World_Relief_Map/MapServer/tile/{z}/{y}/{x}';

export function EarthTerrainBackdrop({
  markers = [],
  center = [-33.8688, 151.2093],
  zoom = 8,
  creditLabel = 'Terrain / Esri World Relief',
}: EarthTerrainBackdropProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    leafletMap.current = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      tapHold: false,
      inertia: false,
    });

    L.tileLayer(ESRI_WORLD_RELIEF_TILE_URL, {
      maxZoom: 13,
      minZoom: 2,
      crossOrigin: true,
    }).addTo(leafletMap.current);

    const resize = () => leafletMap.current?.invalidateSize(false);
    const timer = window.setTimeout(resize, 50);
    window.addEventListener('resize', resize);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', resize);
      leafletMap.current?.remove();
      leafletMap.current = null;
    };
  }, [center, zoom]);

  useEffect(() => {
    if (!leafletMap.current) return;

    if (markers.length === 0) {
      leafletMap.current.setView(center, zoom, { animate: false });
      return;
    }

    if (markers.length === 1) {
      leafletMap.current.setView([markers[0].lat, markers[0].lng], Math.max(zoom, 10), { animate: false });
      return;
    }

    const bounds = L.latLngBounds(markers.map((marker) => [marker.lat, marker.lng] as [number, number]));
    leafletMap.current.fitBounds(bounds, {
      padding: [96, 96],
      maxZoom: 10,
      animate: false,
    });
  }, [center, markers, zoom]);

  return (
    <div className="anu-earth-terrain-backdrop" aria-hidden="true">
      <div ref={mapRef} className="anu-earth-terrain-map" />
      <div className="anu-earth-terrain-credit">{creditLabel}</div>
    </div>
  );
}
