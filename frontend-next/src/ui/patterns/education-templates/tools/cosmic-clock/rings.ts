/**
 * Cosmic Clock ring rendering — 9 concentric rings for time visualization.
 * Ported faithfully from reference cosmic-clock implementation.
 */

export interface RingConfig {
  name: string;
  color: string;
  divisions: number;
  radius: number;      // relative radius (45–285 range)
  thickness: number;
  labels: string[];
  labelInterval: number;
  getValue: (d: Date) => number;
  maxValue: number;
  seasonColors?: string[];
  showPercentage?: boolean;
}

export function getWeekOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.floor(diff / oneWeek) + (date.getDay() + date.getHours() / 24) / 7;
}

export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getSeasonValue(date: Date): number {
  const month = date.getMonth();
  const day = date.getDate();
  // Winter: Dec 21 - Mar 19, Spring: Mar 20 - Jun 20, Summer: Jun 21 - Sep 21, Autumn: Sep 22 - Dec 20
  if ((month === 11 && day >= 21) || month === 0 || month === 1 || (month === 2 && day < 20)) {
    if (month === 11) return (day - 21) / 31 * 0.25;
    if (month === 0) return 0.25 + day / 31 * 0.25;
    if (month === 1) return 0.5 + day / 28 * 0.25;
    return 0.75 + day / 20 * 0.25;
  } else if ((month === 2 && day >= 20) || month === 3 || month === 4 || (month === 5 && day < 21)) {
    if (month === 2) return 1 + (day - 20) / 12 * 0.25;
    if (month === 3) return 1.25 + day / 30 * 0.25;
    if (month === 4) return 1.5 + day / 31 * 0.25;
    return 1.75 + day / 21 * 0.25;
  } else if ((month === 5 && day >= 21) || month === 6 || month === 7 || (month === 8 && day < 22)) {
    if (month === 5) return 2 + (day - 21) / 10 * 0.25;
    if (month === 6) return 2.25 + day / 31 * 0.25;
    if (month === 7) return 2.5 + day / 31 * 0.25;
    return 2.75 + day / 22 * 0.25;
  } else {
    if (month === 8) return 3 + (day - 22) / 9 * 0.25;
    if (month === 9) return 3.25 + day / 31 * 0.25;
    if (month === 10) return 3.5 + day / 30 * 0.25;
    return 3.75 + day / 21 * 0.25;
  }
}

export const RINGS: RingConfig[] = [
  {
    name: 'Seconds', color: '#ef4444', divisions: 60, radius: 45, thickness: 4,
    labels: Array.from({ length: 60 }, (_, i) => i % 10 === 0 ? i.toString() : ''),
    labelInterval: 10,
    getValue: (d) => d.getSeconds() + d.getMilliseconds() / 1000,
    maxValue: 60,
  },
  {
    name: 'Minutes', color: '#f59e0b', divisions: 60, radius: 65, thickness: 5,
    labels: Array.from({ length: 60 }, (_, i) => i % 10 === 0 ? i.toString() : ''),
    labelInterval: 10,
    getValue: (d) => d.getMinutes() + d.getSeconds() / 60,
    maxValue: 60,
  },
  {
    name: 'Hours', color: '#06b6d4', divisions: 24, radius: 88, thickness: 6,
    labels: Array.from({ length: 24 }, (_, i) => i % 3 === 0 ? i.toString().padStart(2, '0') : ''),
    labelInterval: 3,
    getValue: (d) => d.getHours() + d.getMinutes() / 60,
    maxValue: 24,
  },
  {
    name: 'Day of Week', color: '#10b981', divisions: 7, radius: 115, thickness: 10,
    labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    labelInterval: 1,
    getValue: (d) => d.getDay() + d.getHours() / 24,
    maxValue: 7,
  },
  {
    name: 'Week', color: '#8b5cf6', divisions: 52, radius: 145, thickness: 7,
    labels: Array.from({ length: 52 }, (_, i) => (i + 1) % 4 === 0 ? `${i + 1}` : ''),
    labelInterval: 4,
    getValue: (d) => getWeekOfYear(d),
    maxValue: 52,
  },
  {
    name: 'Month', color: '#ec4899', divisions: 12, radius: 178, thickness: 12,
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    labelInterval: 1,
    getValue: (d) => d.getMonth() + d.getDate() / getDaysInMonth(d),
    maxValue: 12,
  },
  {
    name: 'Quarter', color: '#3b82f6', divisions: 4, radius: 215, thickness: 10,
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    labelInterval: 1,
    getValue: (d) => Math.floor(d.getMonth() / 3) + (d.getMonth() % 3 + d.getDate() / getDaysInMonth(d)) / 3,
    maxValue: 4,
  },
  {
    name: 'Season', color: '#14b8a6', divisions: 4, radius: 248, thickness: 12,
    labels: ['Winter', 'Spring', 'Summer', 'Autumn'],
    labelInterval: 1,
    getValue: (d) => getSeasonValue(d),
    maxValue: 4,
    seasonColors: ['#64748b', '#22c55e', '#eab308', '#f97316'],
  },
  {
    name: 'Year', color: '#f97316', divisions: 12, radius: 285, thickness: 8,
    labels: [],
    labelInterval: 12,
    getValue: (d) => {
      const start = new Date(d.getFullYear(), 0, 1);
      const end = new Date(d.getFullYear() + 1, 0, 1);
      return ((d.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 12;
    },
    maxValue: 12,
    showPercentage: true,
  },
];

/** Draw a single ring on the canvas */
export function drawRing(
  ctx: CanvasRenderingContext2D,
  ring: RingConfig,
  value: number,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
): void {
  const { radius, thickness, divisions, color, labels, labelInterval, seasonColors, showPercentage } = ring;
  const baseRadius = Math.min(width, height) * 0.42 * (radius / 285);

  // Draw ring segments
  for (let i = 0; i < divisions; i++) {
    const startAngle = (i / divisions) * Math.PI * 2 - Math.PI / 2;
    const endAngle = ((i + 1) / divisions) * Math.PI * 2 - Math.PI / 2;

    let segmentColor = color;
    if (seasonColors) segmentColor = seasonColors[i];

    const segmentMidpoint = i + 0.5;
    const isBeforeCurrent = segmentMidpoint < value;
    const isCurrent = value >= i && value < i + 1;

    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius, startAngle, endAngle);

    if (isBeforeCurrent) {
      ctx.strokeStyle = segmentColor;
    } else if (isCurrent) {
      const partialEnd = startAngle + ((value - i) / 1) * (endAngle - startAngle);
      ctx.strokeStyle = `${segmentColor}33`;
      ctx.lineWidth = thickness;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, startAngle, partialEnd);
      ctx.strokeStyle = segmentColor;
    } else {
      ctx.strokeStyle = `${segmentColor}22`;
    }

    ctx.lineWidth = isCurrent ? thickness * 1.1 : thickness;
    ctx.lineCap = 'butt';
    ctx.stroke();
  }

  // Draw labels
  if (labels.some(l => l)) {
    ctx.font = `400 ${Math.max(6, thickness * 0.45)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < divisions; i++) {
      if (i % labelInterval === 0 && labels[i]) {
        const angle = ((i + 0.5) / divisions) * Math.PI * 2 - Math.PI / 2;
        const labelRadius = baseRadius + thickness / 2 + 10;
        const x = centerX + Math.cos(angle) * labelRadius;
        const y = centerY + Math.sin(angle) * labelRadius;

        ctx.save();
        ctx.translate(x, y);
        let textAngle = angle + Math.PI / 2;
        if (angle > 0 && angle < Math.PI) textAngle += Math.PI;
        ctx.rotate(textAngle);

        ctx.fillStyle = value >= i && value < i + 1 ? '#fff' : 'rgba(255,255,255,0.25)';
        ctx.fillText(labels[i], 0, 0);
        ctx.restore();
      }
    }
  }

  // Current position indicator
  const indicatorAngle = (value / ring.maxValue) * Math.PI * 2 - Math.PI / 2;
  ctx.beginPath();
  ctx.arc(
    centerX + Math.cos(indicatorAngle) * baseRadius,
    centerY + Math.sin(indicatorAngle) * baseRadius,
    thickness / 2 + 1, 0, Math.PI * 2,
  );
  ctx.fillStyle = '#fff';
  ctx.fill();

  // Year progress percentage
  if (showPercentage) {
    const percentage = Math.round((value / ring.maxValue) * 100);
    ctx.font = '500 10px Inter, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(`${percentage}%`, centerX, centerY + baseRadius + thickness + 16);
  }
}

/** Draw the center hub */
export function drawCenter(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  year: number,
): void {
  const hubRadius = Math.min(width, height) * 0.024;

  ctx.beginPath();
  ctx.arc(centerX, centerY, hubRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#0a0a0a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = '500 11px Inter, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(year.toString(), centerX, centerY);
}

export interface EventMarkerPosition {
  x: number;
  y: number;
  radius: number;
  event: { name: string; desc: string; date: Date; category: string };
}

/** Draw event markers around the month ring */
export function drawEventMarkers(
  ctx: CanvasRenderingContext2D,
  events: Array<{ date: Date; name: string; desc: string; category: string }>,
  simulatedTime: Date,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  categoryColors: Record<string, string>,
): EventMarkerPosition[] {
  const positions: EventMarkerPosition[] = [];
  const monthRing = RINGS.find(r => r.name === 'Month')!;
  const baseRadius = Math.min(width, height) * 0.42 * (monthRing.radius / 285);

  events.forEach(event => {
    if (event.date.getFullYear() !== simulatedTime.getFullYear()) return;

    const month = event.date.getMonth();
    const day = event.date.getDate();
    const daysInMonth = new Date(event.date.getFullYear(), month + 1, 0).getDate();
    const value = month + day / daysInMonth;

    const angle = (value / 12) * Math.PI * 2 - Math.PI / 2;
    const markerRadius = baseRadius + monthRing.thickness / 2 + 22;

    const x = centerX + Math.cos(angle) * markerRadius;
    const y = centerY + Math.sin(angle) * markerRadius;

    positions.push({ x, y, event, radius: 4 });

    const isPast = event.date < simulatedTime;
    const clr = categoryColors[event.category] || '#888';

    ctx.beginPath();
    ctx.arc(x, y, isPast ? 2 : 3, 0, Math.PI * 2);
    ctx.fillStyle = isPast ? `${clr}66` : clr;
    ctx.fill();

    // Line to ring
    ctx.beginPath();
    ctx.moveTo(
      centerX + Math.cos(angle) * (baseRadius + monthRing.thickness / 2 + 2),
      centerY + Math.sin(angle) * (baseRadius + monthRing.thickness / 2 + 2),
    );
    ctx.lineTo(x, y);
    ctx.strokeStyle = `${clr}${isPast ? '33' : '44'}`;
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  return positions;
}

/** Draw subtle background grid dots */
export function drawBackgroundGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.012)';
  for (let x = 50; x < width; x += 50) {
    for (let y = 50; y < height; y += 50) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
