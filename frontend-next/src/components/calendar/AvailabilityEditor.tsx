'use client';

import { useState } from 'react';
import { Button } from '@/ui-system/primitives/Button';
import { Input } from '@/ui-system/primitives/Form';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface AvailabilityEditorProps {
  slots: AvailabilitySlot[];
  onSave: (slots: AvailabilitySlot[]) => void;
  saving?: boolean;
}

export function AvailabilityEditor({ slots, onSave, saving }: AvailabilityEditorProps) {
  const [local, setLocal] = useState<AvailabilitySlot[]>(slots);

  const update = (idx: number, field: keyof AvailabilitySlot, value: string | number) => {
    setLocal((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const addSlot = (day: number) => {
    setLocal((prev) => [...prev, { day_of_week: day, start_time: '09:00', end_time: '17:00' }]);
  };

  const removeSlot = (idx: number) => {
    setLocal((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      {DAYS.map((day, dayIdx) => {
        const daySlots = local
          .map((s, i) => ({ ...s, _idx: i }))
          .filter((s) => s.day_of_week === dayIdx);
        return (
          <div key={dayIdx} className="flex items-start gap-4">
            <div className="w-12 text-sm font-medium text-[var(--color-foreground)] pt-2">{day}</div>
            <div className="flex-1 space-y-2">
              {daySlots.map((slot) => (
                <div key={slot._idx} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={slot.start_time}
                    onChange={(e) => update(slot._idx, 'start_time', e.target.value)}
                    className="w-28"
                  />
                  <span className="text-[var(--color-muted-foreground)]">to</span>
                  <Input
                    type="time"
                    value={slot.end_time}
                    onChange={(e) => update(slot._idx, 'end_time', e.target.value)}
                    className="w-28"
                  />
                  <button
                    onClick={() => removeSlot(slot._idx)}
                    className="text-[var(--color-danger)] text-xs hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => addSlot(dayIdx)}
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                + Add slot
              </button>
            </div>
          </div>
        );
      })}
      <Button variant="primary" size="sm" loading={saving} onClick={() => onSave(local)}>
        Save Availability
      </Button>
    </div>
  );
}
