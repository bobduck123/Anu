'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import AddressAutocomplete from './AddressAutocomplete';

const MapView = dynamic(() => import('./MapView'), { ssr: false });

interface CreateVenueModalProps {
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

export default function CreateVenueModal({ onClose, onSubmit }: CreateVenueModalProps) {
  const [form, setForm] = useState({
    name: '', address: '', city: '', country: '',
    latitude: 0, longitude: 0, is_online: false, is_global: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [clickMarker, setClickMarker] = useState<{ lat: number; lng: number } | null>(null);

  const handleAddressSelect = (result: { address: string; lat: number; lng: number; city?: string; country?: string }) => {
    setForm(p => ({
      ...p, address: result.address, latitude: result.lat, longitude: result.lng,
      city: result.city || '', country: result.country || '',
    }));
    setClickMarker({ lat: result.lat, lng: result.lng });
  };

  const handleMapClick = (lat: number, lng: number) => {
    setClickMarker({ lat, lng });
    setForm(p => ({ ...p, latitude: lat, longitude: lng }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      console.error('Failed to create venue:', err);
      alert('Failed to create venue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--color-card)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Create Venue</h2>
            <button onClick={onClose}><X className="h-6 w-6 text-[var(--color-muted-foreground)]" /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Venue Name *</label>
              <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address *</label>
              <AddressAutocomplete value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} onSelect={handleAddressSelect} />
            </div>
            <MapView height="200px" onMapClick={handleMapClick} clickMarker={clickMarker} zoom={2} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input type="text" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <input type="text" value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-pill btn-pill-outline">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-pill btn-pill-primary disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create Venue'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
