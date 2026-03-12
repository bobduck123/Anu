'use client';

import { Download, Image as ImageIcon } from 'lucide-react';
import type { HeatmapData } from '@/data/adapters/heatmapAdapter';

interface HeatmapExportProps {
  data: HeatmapData;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function HeatmapExport({ data, canvasRef }: HeatmapExportProps) {
  const exportCSV = () => {
    const header = ['Row', 'Column', 'Value', 'Category', 'Tenant', 'Timestamp'];
    const rows = data.cells.map((c) => [
      data.rows[c.row] ?? c.row,
      data.cols[c.col] ?? c.col,
      c.value,
      c.category,
      c.tenant,
      c.timestamp,
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    downloadFile('heatmap-export.csv', csv, 'text/csv');
  };

  const exportPNG = () => {
    const canvas = canvasRef?.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'heatmap-snapshot.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportCSV}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        CSV
      </button>
      <button
        onClick={exportPNG}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
      >
        <ImageIcon className="w-3.5 h-3.5" />
        PNG
      </button>
    </div>
  );
}
