import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark';
export type ThemeColor = 'blue' | 'purple' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'indigo' | 'custom';

export interface ThemeColorOption {
  id: ThemeColor;
  name: string;
  primaryLight: string;
  primaryDark: string;
  hoverLight: string;
  hoverDark: string;
  bgLight: string;
  bgDark: string;
  ringHex: string;
}

export const THEME_COLORS: Record<Exclude<ThemeColor, 'custom'>, ThemeColorOption> = {
  blue: {
    id: 'blue',
    name: 'Royal Blue',
    primaryLight: '#2563eb',
    primaryDark: '#3b82f6',
    hoverLight: '#1d4ed8',
    hoverDark: '#60a5fa',
    bgLight: '#eff6ff',
    bgDark: 'rgba(59, 130, 246, 0.18)',
    ringHex: '#2563eb',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Green',
    primaryLight: '#059669',
    primaryDark: '#10b981',
    hoverLight: '#047857',
    hoverDark: '#34d399',
    bgLight: '#ecfdf5',
    bgDark: 'rgba(16, 185, 129, 0.18)',
    ringHex: '#059669',
  },
  purple: {
    id: 'purple',
    name: 'Violet Purple',
    primaryLight: '#7c3aed',
    primaryDark: '#8b5cf6',
    hoverLight: '#6d28d9',
    hoverDark: '#a78bfa',
    bgLight: '#f5f3ff',
    bgDark: 'rgba(139, 92, 246, 0.18)',
    ringHex: '#7c3aed',
  },
  rose: {
    id: 'rose',
    name: 'Rose Pink',
    primaryLight: '#e11d48',
    primaryDark: '#f43f5e',
    hoverLight: '#be123c',
    hoverDark: '#fb7185',
    bgLight: '#fff1f2',
    bgDark: 'rgba(244, 63, 94, 0.18)',
    ringHex: '#e11d48',
  },
  amber: {
    id: 'amber',
    name: 'Sunset Amber',
    primaryLight: '#d97706',
    primaryDark: '#f59e0b',
    hoverLight: '#b45309',
    hoverDark: '#fbbf24',
    bgLight: '#fffbeb',
    bgDark: 'rgba(245, 158, 11, 0.18)',
    ringHex: '#d97706',
  },
  cyan: {
    id: 'cyan',
    name: 'Ocean Cyan',
    primaryLight: '#0891b2',
    primaryDark: '#06b6d4',
    hoverLight: '#0e7490',
    hoverDark: '#22d3ee',
    bgLight: '#ecfeff',
    bgDark: 'rgba(6, 182, 212, 0.18)',
    ringHex: '#0891b2',
  },
  indigo: {
    id: 'indigo',
    name: 'Indigo Blue',
    primaryLight: '#4f46e5',
    primaryDark: '#6366f1',
    hoverLight: '#4338ca',
    hoverDark: '#818cf8',
    bgLight: '#eef2ff',
    bgDark: 'rgba(99, 102, 241, 0.18)',
    ringHex: '#4f46e5',
  },
};

function hexToRgb(hex: string) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16) || 0;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function adjustColorBrightness(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const amt = Math.round(2.55 * percent);
  const newR = Math.min(255, Math.max(0, r + amt));
  const newG = Math.min(255, Math.max(0, g + amt));
  const newB = Math.min(255, Math.max(0, b + amt));
  return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyThemeToDom(mode: ThemeMode, color: ThemeColor, customHex?: string) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;

  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  let primaryHex: string;
  let hoverHex: string;
  let bgSoftHex: string;
  let ringHex: string;

  if (color === 'custom' && customHex) {
    const validHex = customHex.startsWith('#') ? customHex : `#${customHex}`;
    primaryHex = mode === 'dark' ? adjustColorBrightness(validHex, 15) : validHex;
    hoverHex = mode === 'dark' ? adjustColorBrightness(validHex, 25) : adjustColorBrightness(validHex, -15);
    bgSoftHex = mode === 'dark' ? hexToRgba(validHex, 0.22) : hexToRgba(validHex, 0.12);
    ringHex = validHex;
  } else {
    const preset = THEME_COLORS[color as keyof typeof THEME_COLORS] || THEME_COLORS.blue;
    primaryHex = mode === 'dark' ? preset.primaryDark : preset.primaryLight;
    hoverHex = mode === 'dark' ? preset.hoverDark : preset.hoverLight;
    bgSoftHex = mode === 'dark' ? preset.bgDark : preset.bgLight;
    ringHex = preset.ringHex;
  }

  root.style.setProperty('--primary', primaryHex);
  root.style.setProperty('--primary-hover', hoverHex);
  root.style.setProperty('--primary-light-bg', bgSoftHex);
  root.style.setProperty('--ring', ringHex);
  root.setAttribute('data-theme-color', color);
}

interface ThemeState {
  mode: ThemeMode;
  color: ThemeColor;
  customHex: string;
}

const getInitialState = (): ThemeState => {
  let mode: ThemeMode = 'light';
  let color: ThemeColor = 'blue';
  let customHex = '#ec4899';
  if (typeof window !== 'undefined') {
    const savedMode = localStorage.getItem('themeMode') as ThemeMode;
    if (savedMode === 'dark' || savedMode === 'light') mode = savedMode;

    const savedColor = localStorage.getItem('themeColor') as ThemeColor;
    if (savedColor) color = savedColor;

    const savedCustomHex = localStorage.getItem('themeCustomHex');
    if (savedCustomHex) customHex = savedCustomHex;
  }
  return { mode, color, customHex };
};

const themeSlice = createSlice({
  name: 'theme',
  initialState: getInitialState(),
  reducers: {
    toggleTheme(state) {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        localStorage.setItem('themeMode', state.mode);
      }
      applyThemeToDom(state.mode, state.color, state.customHex);
    },
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('themeMode', action.payload);
      }
      applyThemeToDom(state.mode, state.color, state.customHex);
    },
    setThemeColor(state, action: PayloadAction<ThemeColor>) {
      state.color = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('themeColor', action.payload);
      }
      applyThemeToDom(state.mode, state.color, state.customHex);
    },
    setCustomHex(state, action: PayloadAction<string>) {
      state.customHex = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('themeCustomHex', action.payload);
      }
      if (state.color === 'custom') {
        applyThemeToDom(state.mode, 'custom', action.payload);
      }
    },
    setFullTheme(state, action: PayloadAction<{ mode: ThemeMode; color: ThemeColor; customHex?: string }>) {
      state.mode = action.payload.mode;
      state.color = action.payload.color;
      if (action.payload.customHex) {
        state.customHex = action.payload.customHex;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('themeMode', action.payload.mode);
        localStorage.setItem('themeColor', action.payload.color);
        if (action.payload.customHex) {
          localStorage.setItem('themeCustomHex', action.payload.customHex);
        }
      }
      applyThemeToDom(action.payload.mode, action.payload.color, action.payload.customHex || state.customHex);
    },
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('themeMode', action.payload);
      }
      applyThemeToDom(state.mode, state.color, state.customHex);
    },
  },
});

export const { toggleTheme, setThemeMode, setThemeColor, setCustomHex, setFullTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
