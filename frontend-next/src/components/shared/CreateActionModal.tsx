'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import AddressAutocomplete from './AddressAutocomplete';

const MapView = dynamic(() => import('./MapView'), { ssr: false });

interface CreateActionModalProps {
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}

export default function CreateActionModal({ onClose, onSubmit }: CreateActionModalProps) {
  const [form, setForm] = useState({
    title: '', details: '', instructions: '', action_type: 'environmental',
    is_online: false, is_global: false, address: '', city: '', country: '',
    latitude: 0, longitude: 0, start_date: '', end_date: '',
    first_milestone: '', second_milestone: '', final_milestone: '',
    points_assigned: 10, recurrence: 'none',
  });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [clickMarker, setClickMarker] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapClick = (lat: number, lng: number) => {
    setClickMarker({ lat, lng });
    setForm(p => ({ ...p, latitude: lat, longitude: lng }));
  };

  const handleAddressSelect = (result: { address: string; lat: number; lng: number; city?: string; country?: string }) => {
    setForm(p => ({
      ...p,
      address: result.address, latitude: result.lat, longitude: result.lng,
      city: result.city || '', country: result.country || '',
    }));
    setClickMarker({ lat: result.lat, lng: result.lng });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (file) fd.append('file', file);
      await onSubmit(fd);
      onClose();
    } catch (err) {
      console.error('Failed to create action:', err);
      alert('Failed to create action');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[color:rgba(30,2,39,0.5)] flex items-center justify-center p-4 z-50">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--color-card)] rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Create Action</h2>
            <button onClick={onClose} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input type="text" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-sage)]" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Details *</label>
                <textarea required rows={3} value={form.details} onChange={e => setForm(p => ({ ...p, details: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Instructions</label>
                <textarea rows={3} value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select value={form.action_type} onChange={e => setForm(p => ({ ...p, action_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
                  <option value="environmental">Environmental</option>
                  <option value="social">Social</option>
                  <option value="educational">Educational</option>
                  <option value="community">Community</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Points *</label>
                <input type="number" min={1} required value={form.points_assigned}
                  onChange={e => setForm(p => ({ ...p, points_assigned: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg font-mono-data" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Recurrence</label>
                <select value={form.recurrence} onChange={e => setForm(p => ({ ...p, recurrence: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_online} onChange={e => setForm(p => ({ ...p, is_online: e.target.checked }))} />
                Online
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_global} onChange={e => setForm(p => ({ ...p, is_global: e.target.checked }))} />
                Global
              </label>
            </div>

            {!form.is_online && !form.is_global && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <AddressAutocomplete value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} onSelect={handleAddressSelect} />
                </div>
                <MapView height="200px" onMapClick={handleMapClick} clickMarker={clickMarker} zoom={2} />
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date *</label>
                <input type="date" required value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date *</label>
                <input type="date" required value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">1st Milestone</label>
                <input type="text" value={form.first_milestone} onChange={e => setForm(p => ({ ...p, first_milestone: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">2nd Milestone</label>
                <input type="text" value={form.second_milestone} onChange={e => setForm(p => ({ ...p, second_milestone: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Final Milestone</label>
                <input type="text" value={form.final_milestone} onChange={e => setForm(p => ({ ...p, final_milestone: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Image *</label>
              <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-pill btn-pill-outline">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-pill btn-pill-sage disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create Action'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
