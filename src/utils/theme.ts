export const COLORS = {
  light: {
    brand: '#5B42F5',
    brandDark: '#4a34d4',
    brandLight: '#7c68f7',
    brandBg: '#f4f2ff',
    bg: '#f5f5f7',
    card: '#ffffff',
    text: '#1c1c1e',
    textSub: '#6e6e73',
    border: '#e5e5ea',
  },
  dark: {
    brand: '#5B42F5',
    brandDark: '#4a34d4',
    brandLight: '#7c68f7',
    brandBg: '#1e1b3a',
    bg: '#08080b',
    card: '#131318',
    text: '#ffffff',
    textSub: '#8a8a92',
    border: '#222227',
  },
};

export const RADIUS = { sm: 12, md: 16, lg: 20, xl: 24 };

import { THEME_PALETTES } from './bgThemes';

export function getTheme(isDarkMode: boolean, bgTheme: string = 'noir') {
  if (!isDarkMode) return COLORS.light;
  const palette = THEME_PALETTES[bgTheme] || THEME_PALETTES.noir;
  return { ...COLORS.dark, bg: palette.bg, card: palette.card, border: palette.border };
}