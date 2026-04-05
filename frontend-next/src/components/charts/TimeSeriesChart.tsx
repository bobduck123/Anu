"use client";

import React from "react";

interface TimeSeriesChartProps {
  data: number[];
  label?: string;
}

export default function TimeSeriesChart({ data, label }: TimeSeriesChartProps) {
  const max = Math.max(1, ...data);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {label && <p className="text-xs text-muted-foreground mb-3">{label}</p>}
      <div className="flex items-end gap-2 h-24">
        {data.map((value, idx) => (
          <div
            key={idx}
            className="flex-1 bg-[color:rgba(102,87,0,0.7)] rounded-sm"
            style={{ height: `${Math.round((value / max) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
