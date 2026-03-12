/**
 * Pure drawing functions for the pixel editor.
 * No React dependencies — all take CanvasRenderingContext2D + params.
 */

export function bresenhamLine(
  x0: number, y0: number, x1: number, y1: number,
  plot: (x: number, y: number) => void,
): void {
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    plot(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

export function drawPixel(
  ctx: CanvasRenderingContext2D, x: number, y: number, color: string,
  w: number, h: number,
): void {
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

export function floodFill(
  ctx: CanvasRenderingContext2D, x: number, y: number, color: string,
  w: number, h: number,
): void {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const pos = (y * w + x) * 4;
  const r0 = d[pos], g0 = d[pos + 1], b0 = d[pos + 2];

  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  if (r0 === r && g0 === g && b0 === b) return;

  const stack: [number, number][] = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
    const p = (cy * w + cx) * 4;
    if (d[p] === r0 && d[p + 1] === g0 && d[p + 2] === b0) {
      d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  color: string, w: number, h: number,
): void {
  bresenhamLine(x0, y0, x1, y1, (x, y) => {
    drawPixel(ctx, x, y, color, w, h);
  });
}

export function drawRect(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  color: string,
): void {
  const x = Math.min(x0, x1);
  const y = Math.min(y0, y1);
  const rw = Math.abs(x1 - x0) + 1;
  const rh = Math.abs(y1 - y0) + 1;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, rw, rh);
}

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  color: string,
): void {
  const r = Math.floor(Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2));
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x0, y0, r, 0, Math.PI * 2);
  ctx.fill();
}

export function pickColor(ctx: CanvasRenderingContext2D, x: number, y: number): string {
  const d = ctx.getImageData(x, y, 1, 1).data;
  return '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function flipPixels(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  dir: 'h' | 'v',
): void {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  const b = new Uint8ClampedArray(d);

  if (dir === 'h') {
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < Math.floor(w / 2); col++) {
        const leftIdx = (row * w + col) * 4;
        const rightIdx = (row * w + (w - 1 - col)) * 4;
        for (let i = 0; i < 4; i++) {
          b[leftIdx + i] = d[rightIdx + i];
          b[rightIdx + i] = d[leftIdx + i];
        }
      }
    }
  } else {
    for (let row = 0; row < Math.floor(h / 2); row++) {
      for (let col = 0; col < w; col++) {
        const topIdx = (row * w + col) * 4;
        const bottomIdx = ((h - 1 - row) * w + col) * 4;
        for (let i = 0; i < 4; i++) {
          b[topIdx + i] = d[bottomIdx + i];
          b[bottomIdx + i] = d[topIdx + i];
        }
      }
    }
  }
  ctx.putImageData(new ImageData(b, w, h), x, y);
}

export function rotatePixels(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  deg: 90 | -90 | 180,
): void {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  const rotated = new Uint8ClampedArray(d.length);

  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const srcIdx = (row * w + col) * 4;
      let dstRow: number, dstCol: number;
      if (deg === 90) { dstRow = col; dstCol = h - 1 - row; }
      else if (deg === -90) { dstRow = w - 1 - col; dstCol = row; }
      else { dstRow = h - 1 - row; dstCol = w - 1 - col; }
      const dstIdx = (dstRow * w + dstCol) * 4;
      for (let i = 0; i < 4; i++) rotated[dstIdx + i] = d[srcIdx + i];
    }
  }
  ctx.putImageData(new ImageData(rotated, w, h), x, y);
}

export function invertPixels(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
): void {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];
    d[i + 1] = 255 - d[i + 1];
    d[i + 2] = 255 - d[i + 2];
  }
  ctx.putImageData(img, x, y);
}

export function convertToPalette(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  palette: string[],
): void {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const paletteRgb = palette.map(hex => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }));

  for (let i = 0; i < d.length; i += 4) {
    let minDist = Infinity;
    let nearest = paletteRgb[0];
    for (const pc of paletteRgb) {
      const dr = d[i] - pc.r, dg = d[i + 1] - pc.g, db = d[i + 2] - pc.b;
      const dist = dr * dr + dg * dg + db * db;
      if (dist < minDist) { minDist = dist; nearest = pc; }
    }
    d[i] = nearest.r; d[i + 1] = nearest.g; d[i + 2] = nearest.b;
  }
  ctx.putImageData(img, 0, 0);
}

export function drawGrid(
  gridCtx: CanvasRenderingContext2D,
  displayWidth: number, displayHeight: number,
  zoom: number,
): void {
  gridCtx.clearRect(0, 0, displayWidth, displayHeight);
  gridCtx.strokeStyle = 'rgba(102, 102, 102, 0.5)';
  gridCtx.lineWidth = 1;
  gridCtx.beginPath();
  for (let x = 0; x <= displayWidth; x += zoom) {
    gridCtx.moveTo(x, 0); gridCtx.lineTo(x, displayHeight);
  }
  for (let y = 0; y <= displayHeight; y += zoom) {
    gridCtx.moveTo(0, y); gridCtx.lineTo(displayWidth, y);
  }
  gridCtx.stroke();
}

export function exportCanvas(
  srcCanvas: HTMLCanvasElement,
  w: number, h: number,
  format: string,
  transEnabled: boolean,
  transColor: string,
): void {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(srcCanvas, 0, 0);

  if (transEnabled && (format === 'image/png' || format === 'image/webp')) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const tr = parseInt(transColor.slice(1, 3), 16);
    const tg = parseInt(transColor.slice(3, 5), 16);
    const tb = parseInt(transColor.slice(5, 7), 16);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] === tr && d[i + 1] === tg && d[i + 2] === tb) d[i + 3] = 0;
    }
    ctx.putImageData(new ImageData(d, w, h), 0, 0);
  }

  const link = document.createElement('a');
  const ext = format === 'image/jpeg' ? 'jpg' : format.split('/')[1];
  link.download = `pixel_art_${w}x${h}.${ext}`;
  link.href = c.toDataURL(format, 0.9);
  link.click();
}
