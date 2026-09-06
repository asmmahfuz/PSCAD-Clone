/**
 * PSCAD CLONE - Comprehensive Theme Definitions & Classic CAD Palette
 * Phase 23 - Step 23.1: Classic PSCAD Light Engineering Palette & Grid Stencil
 */

import type { ThemeType } from '../types';

export type GridStencilType = 'dots' | 'crosses' | 'lines';

export interface ThemePalette {
  name: ThemeType;
  label: string;
  isDark: boolean;
  bg: string;
  panelBg: string;
  panelBorder: string;
  canvasBg: string;
  gridDot: string;
  gridCross: string;
  gridMajor: string;
  gridMinor: string;
  componentBody: string;
  componentStroke: string;
  componentText: string;
  componentTextMuted: string;
  wireNormal: string;
  wireControl: string;
  wirePolyphase: string;
  wireActive: string;
  busbar3Ph: string;
  busbar3PhSecondary: string;
  busbar1Ph: string;
  selection: string;
  pinHover: string;
  pinConnected: string;
  pinUnconnected: string;
  pinControl: string;
  pinPolyphase: string;
  sheetBorder: string;
  sheetBorderInner: string;
  titleBlockBg: string;
  titleBlockBorder: string;
  titleBlockText: string;
  titleBlockHeading: string;
  titleBlockMuted: string;
  titleBlockStatusBg: string;
  titleBlockStatusText: string;
  waveformColors: string[];
}

export const THEME_PALETTES: Record<string, ThemePalette> = {
  LIGHT: {
    name: 'light',
    label: 'Classic PSCAD Light CAD',
    isDark: false,
    bg: '#f1f5f9',
    panelBg: '#ffffff',
    panelBorder: '#cbd5e1',
    canvasBg: '#f4f6f9', // Authentic off-white / light gray engineering workstation background
    gridDot: '#cbd5e1', // Soft, subtle, non-intrusive light gray
    gridCross: 'rgba(100, 116, 139, 0.20)', // Faint cross ticks
    gridMajor: '#cbd5e1',
    gridMinor: '#e2e8f0',
    componentBody: '#ffffff',
    componentStroke: '#0f172a', // Crisp dark charcoal / black lines
    componentText: '#0f172a',
    componentTextMuted: '#475569',
    wireNormal: '#1e293b', // High-contrast crisp dark charcoal (#1E293B / #000000)
    wireControl: '#059669', // Classic green control signal
    wirePolyphase: '#1d4ed8', // 3-Phase polyphase dark blue
    wireActive: '#16a34a',
    busbar3Ph: '#1e3a8a', // Heavy solid 3-phase blue bar
    busbar3PhSecondary: '#881337', // Heavy solid 3-phase dark red bar
    busbar1Ph: '#1e293b', // Heavy solid single-phase dark charcoal bar
    selection: '#2563eb',
    pinHover: '#ea580c',
    pinConnected: '#16a34a',
    pinUnconnected: '#dc2626',
    pinControl: '#059669',
    pinPolyphase: '#1d4ed8',
    sheetBorder: 'rgba(30, 58, 138, 0.55)',
    sheetBorderInner: 'rgba(30, 58, 138, 0.30)',
    titleBlockBg: '#ffffff',
    titleBlockBorder: '#1e3a8a',
    titleBlockText: '#0f172a',
    titleBlockHeading: '#1e3a8a',
    titleBlockMuted: '#475569',
    titleBlockStatusBg: '#e2e8f0',
    titleBlockStatusText: '#334155',
    waveformColors: [
      '#0284c7', // Ocean Blue
      '#be185d', // Deep Rose
      '#b45309', // Dark Amber / Ochre
      '#15803d', // Forest Green
      '#ea580c', // Deep Orange
      '#6d28d9', // Deep Purple
      '#e11d48', // Crimson
      '#0e7490', // Deep Teal
      '#dc2626', // Bright Red
      '#0369a1', // Dark Sky Blue
    ],
  },
  DARK: {
    name: 'dark',
    label: 'Modern Dark IDE',
    isDark: true,
    bg: '#10141d',
    panelBg: '#161b26',
    panelBorder: '#232d42',
    canvasBg: '#0c0f17',
    gridDot: '#252d3d',
    gridCross: '#334155',
    gridMajor: '#334155',
    gridMinor: '#1e2533',
    componentBody: '#1e2533',
    componentStroke: '#61afef',
    componentText: '#e6edf3',
    componentTextMuted: '#94a3b8',
    wireNormal: '#4fc1ff',
    wireControl: '#10b981',
    wirePolyphase: '#38bdf8',
    wireActive: '#00e676',
    busbar3Ph: '#40c4ff',
    busbar3PhSecondary: '#f43f5e',
    busbar1Ph: '#61afef',
    selection: '#388bfd',
    pinHover: '#ff9800',
    pinConnected: '#238636',
    pinUnconnected: '#da3633',
    pinControl: '#10b981',
    pinPolyphase: '#00e5ff',
    sheetBorder: 'rgba(56, 139, 253, 0.45)',
    sheetBorderInner: 'rgba(56, 139, 253, 0.25)',
    titleBlockBg: '#161b26',
    titleBlockBorder: '#388bfd',
    titleBlockText: '#e2e8f0',
    titleBlockHeading: '#58a6ff',
    titleBlockMuted: '#94a3b8',
    titleBlockStatusBg: '#1e293b',
    titleBlockStatusText: '#94a3b8',
    waveformColors: [
      '#00e5ff', // Cyan
      '#ff4081', // Pink
      '#ffeb3b', // Yellow
      '#00e676', // Bright Green
      '#ff9100', // Orange
      '#7c4dff', // Purple
      '#e040fb', // Magenta
      '#69f0ae', // Mint
      '#ff5252', // Red
      '#40c4ff', // Light Blue
    ],
  },
  BLUEPRINT: {
    name: 'blueprint',
    label: 'Technical Blueprint CAD',
    isDark: true,
    bg: '#081324',
    panelBg: '#0d1e38',
    panelBorder: '#16325c',
    canvasBg: '#060e1c',
    gridDot: '#1d3d6e',
    gridCross: '#254e8c',
    gridMajor: '#254e8c',
    gridMinor: '#142a4d',
    componentBody: '#0d2240',
    componentStroke: '#64ffda',
    componentText: '#e2f1ff',
    componentTextMuted: '#93c5fd',
    wireNormal: '#00ffff',
    wireControl: '#69f0ae',
    wirePolyphase: '#80d8ff',
    wireActive: '#64ffda',
    busbar3Ph: '#00ffff',
    busbar3PhSecondary: '#ff4081',
    busbar1Ph: '#64ffda',
    selection: '#64ffda',
    pinHover: '#ffa657',
    pinConnected: '#64ffda',
    pinUnconnected: '#ff5964',
    pinControl: '#69f0ae',
    pinPolyphase: '#80d8ff',
    sheetBorder: 'rgba(100, 255, 218, 0.45)',
    sheetBorderInner: 'rgba(100, 255, 218, 0.25)',
    titleBlockBg: '#0d2240',
    titleBlockBorder: '#64ffda',
    titleBlockText: '#e2f1ff',
    titleBlockHeading: '#64ffda',
    titleBlockMuted: '#93c5fd',
    titleBlockStatusBg: '#142a4d',
    titleBlockStatusText: '#93c5fd',
    waveformColors: [
      '#00ffff', // Bright Cyan
      '#ff4081', // Pink
      '#ffd700', // Gold
      '#64ffda', // Teal
      '#ffab40', // Orange
      '#b388ff', // Lavender
      '#ea80fc', // Orchid
      '#69f0ae', // Mint
      '#ff5252', // Coral
      '#80d8ff', // Sky
    ],
  },
};

/**
 * Resolves the theme palette safely with fallback to DARK.
 */
export function getThemePalette(theme: string | ThemeType = 'dark'): ThemePalette {
  const key = String(theme).toUpperCase();
  return THEME_PALETTES[key] || THEME_PALETTES.DARK;
}

/**
 * Maps waveform trace colors to high-contrast equivalents when rendered on light canvas backgrounds.
 */
export function resolveWaveformColor(color: string, isDark: boolean = true): string {
  if (isDark) return color;

  const lower = color.toLowerCase();
  // Low-contrast bright yellow/amber -> Deep Amber
  if (lower === '#ffeb3b' || lower === '#facc15' || lower === '#eab308' || lower === '#ffd700' || lower === '#ffff00') {
    return '#b45309';
  }
  // Low-contrast bright cyan -> Deep Ocean Blue
  if (lower === '#00e5ff' || lower === '#00ffff' || lower === '#38bdf8' || lower === '#22d3ee' || lower === '#40c4ff') {
    return '#0284c7';
  }
  // Low-contrast bright green/mint -> Forest Green
  if (lower === '#00e676' || lower === '#69f0ae' || lower === '#4ade80' || lower === '#10b981' || lower === '#00ff00') {
    return '#15803d';
  }
  // Low-contrast neon pink/magenta -> Deep Rose / Raspberry
  if (lower === '#ff4081' || lower === '#e040fb' || lower === '#f472b6' || lower === '#ff007f') {
    return '#be185d';
  }
  // Low-contrast light orange -> Deep Burnt Orange
  if (lower === '#ff9100' || lower === '#ffab40' || lower === '#fb923c') {
    return '#ea580c';
  }
  // Low-contrast light purple/lavender -> Deep Indigo/Purple
  if (lower === '#7c4dff' || lower === '#b388ff' || lower === '#a855f7' || lower === '#c084fc') {
    return '#6d28d9';
  }
  return color;
}
