'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { api, Venue } from '@/lib/api';
import AddressAutocomplete from './AddressAutocomplete';

interface CreateEventModalProps {
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

export default function CreateEventModal({ onClose, onSubmit }: CreateEventModalProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [form, setForm] = useState({
    title: '', description: '', address: '', city: '', country: '',
    latitude: 0, longitude: 0, date: '', time: '12:00:00',
    venue_id: 0, is_online: false, is_global: false, goal: 50,
    reminder_week: '', reminder_day: '', reminder_hours: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.venues.getAll().then(setVenues).catch(() => {});
  }, []);

  const handleAddressSelect = (result: { address: string; lat: number; lng: number; city?: string; country?: string }) => {
    setForm(p => ({
      ...p, address: result.address, latitude: result.lat, longitude: result.lng,
      city: result.city || '', country: result.country || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      console.error('Failed to create event:', err);
      alert('Failed to create event');
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
            <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Create Event</h2>
            <button onClick={onClose}><X className="h-6 w-6 text-[var(--color-muted-foreground)]" /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input type="text" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description *</label>
              <textarea required rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input type="date" required value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time *</label>
                <input type="time" required value={form.time.slice(0, 5)}
                  onChange={e => setForm(p => ({ ...p, time: e.target.value + ':00' }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Venue *</label>
              <select required value={form.venue_id} onChange={e => setForm(p => ({ ...p, venue_id: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
                <option value={0}>Select venue</option>
                {venues.map(v => <option key={v.id} value={v.id}>{v.name} — {v.city}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <AddressAutocomplete value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} onSelect={handleAddressSelect} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Goal (attendees) *</label>
                <input type="number" min={1} required value={form.goal}
                  onChange={e => setForm(p => ({ ...p, goal: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg font-mono-data" />
              </div>
              <div className="flex items-end gap-6 pb-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.is_online} onChange={e => setForm(p => ({ ...p, is_online: e.target.checked }))} />
                  Online
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.is_global} onChange={e => setForm(p => ({ ...p, is_global: e.target.checked }))} />
                  Global
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-pill btn-pill-outline">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-pill btn-pill-primary disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
