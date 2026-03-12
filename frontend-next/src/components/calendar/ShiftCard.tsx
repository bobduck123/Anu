'use client';

import { Clock, MapPin, Users } from 'lucide-react';
import { Card } from '@/ui-system/primitives/Card';
import { Button } from '@/ui-system/primitives/Button';
import { StatusBadge } from '@/ui-system/primitives/StatusBadge';

export interface ShiftData {
  id: number;
  title: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
  location?: string;
  max_volunteers: number;
  assigned_count: number;
}

interface ShiftCardProps {
  shift: ShiftData;
  onSignUp?: (shiftId: number) => void;
  loading?: boolean;
}

export function ShiftCard({ shift, onSignUp, loading }: ShiftCardProps) {
  const isFull = shift.assigned_count >= shift.max_volunteers;

  return (
    <Card padding="md" className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <h4 className="font-semibold">{shift.title}</h4>
        {isFull ? (
          <StatusBadge status="closed">Full</StatusBadge>
        ) : (
          <StatusBadge status="open" dot>Open</StatusBadge>
        )}
      </div>
      {shift.description && (
        <p className="text-sm text-[var(--color-muted-foreground)] line-clamp-2">{shift.description}</p>
      )}
      <div className="flex flex-wrap gap-4 text-xs text-[var(--color-muted-foreground)]">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}
        </span>
        {shift.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {shift.location}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {shift.assigned_count} / {shift.max_volunteers}
        </span>
      </div>
      {onSignUp && !isFull && (
        <Button
          variant="sage"
          size="sm"
          loading={loading}
          onClick={() => onSignUp(shift.id)}
          className="self-start"
        >
          Sign Up
        </Button>
      )}
    </Card>
  );
}
