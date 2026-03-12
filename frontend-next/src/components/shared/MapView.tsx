'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  title: string;
  popup?: string;
  color?: 'sage' | 'institutional' | 'accent' | 'forest';
}

interface MapViewProps {
  markers?: MarkerData[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onMapClick?: (lat: number, lng: number) => void;
  clickMarker?: { lat: number; lng: number } | null;
}

const colorMap: Record<string, string> = {
  sage: '#87a878',
  institutional: '#1e3a5f',
  accent: '#d97706',
  forest: '#2d5a3d',
};

function createIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

export default function MapView({
  markers = [],
  center = [51.505, -0.09],
  zoom = 3,
  height = '400px',
  onMapClick,
  clickMarker,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const clickMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    leafletMap.current = L.map(mapRef.current).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(leafletMap.current);

    markersLayer.current = L.layerGroup().addTo(leafletMap.current);

    if (onMapClick) {
      leafletMap.current.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      leafletMap.current?.remove();
      leafletMap.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!markersLayer.current) return;
    markersLayer.current.clearLayers();
    markers.forEach((m) => {
      const icon = createIcon(colorMap[m.color || 'sage']);
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(markersLayer.current!);
      if (m.popup) marker.bindPopup(m.popup);
    });

    if (markers.length > 0 && leafletMap.current) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
      leafletMap.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [markers]);

  useEffect(() => {
    if (!leafletMap.current) return;
    if (clickMarkerRef.current) {
      clickMarkerRef.current.remove();
      clickMarkerRef.current = null;
    }
    if (clickMarker) {
      clickMarkerRef.current = L.marker(
        [clickMarker.lat, clickMarker.lng],
        { icon: createIcon(colorMap.accent) }
      ).addTo(leafletMap.current);
    }
  }, [clickMarker]);

  return <div ref={mapRef} style={{ height, width: '100%', borderRadius: '0.5rem' }} />;
}
