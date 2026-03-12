export type PixelTool = 'pencil' | 'eraser' | 'line' | 'rect' | 'circle' | 'fill' | 'select' | 'picker';

export type CanvasSize = 8 | 16 | 32 | 64 | 128;

export type ZoomLevel = 4 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 32;

export type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export interface SelectionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ClipboardData {
  data: ImageData;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PixelEditorState {
  tool: PixelTool;
  color: string;
  zoom: ZoomLevel;
  width: number;
  height: number;
  paletteName: string;
  paletteKey: string;
  transEnabled: boolean;
  transColor: string;
  lightMode: boolean;
  gridVisible: boolean;
  crtEnabled: boolean;
  selection: SelectionRect | null;
  showExportModal: boolean;
  showNewDocModal: boolean;
  showHelpModal: boolean;
  showClearModal: boolean;
}

export type PixelEditorAction =
  | { type: 'SET_TOOL'; tool: PixelTool }
  | { type: 'SET_COLOR'; color: string }
  | { type: 'SET_ZOOM'; zoom: ZoomLevel }
  | { type: 'SET_PALETTE'; name: string; key: string }
  | { type: 'SET_SELECTION'; selection: SelectionRect | null }
  | { type: 'TOGGLE_GRID' }
  | { type: 'TOGGLE_CRT' }
  | { type: 'TOGGLE_THEME' }
  | { type: 'TOGGLE_TRANS' }
  | { type: 'SET_TRANS_COLOR'; color: string }
  | { type: 'SHOW_MODAL'; modal: 'export' | 'newDoc' | 'help' | 'clear' }
  | { type: 'HIDE_MODAL'; modal: 'export' | 'newDoc' | 'help' | 'clear' }
  | { type: 'RESIZE'; width: number; height: number };

export const CANVAS_SIZES: CanvasSize[] = [8, 16, 32, 64, 128];
export const ZOOM_LEVELS: ZoomLevel[] = [4, 6, 8, 10, 12, 16, 20, 24, 32];

export const TOOL_SHORTCUTS: Record<string, PixelTool> = {
  b: 'pencil',
  e: 'eraser',
  l: 'line',
  r: 'rect',
  c: 'circle',
  f: 'fill',
  m: 'select',
  i: 'picker',
};

export const TOOL_LABELS: Record<PixelTool, string> = {
  pencil: 'Pencil (B)',
  eraser: 'Eraser (E)',
  line: 'Line (L)',
  rect: 'Rectangle (R)',
  circle: 'Circle (C)',
  fill: 'Fill (F)',
  select: 'Select (M)',
  picker: 'Picker (I)',
};
