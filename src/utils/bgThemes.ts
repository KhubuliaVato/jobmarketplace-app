export interface BgThemeOption {
  id: string;
  color: string;
  label: string;
  lock: 'premium' | 'pro' | null;
}

export const BG_THEMES: BgThemeOption[] = [
  { id: 'noir', color: '#08080b', label: 'Noir', lock: null },
  { id: 'slate', color: '#08090e', label: 'Slate', lock: null },
  { id: 'amethyst', color: '#0d0a1a', label: 'Amethyst', lock: 'premium' },
  { id: 'gold', color: '#120e06', label: 'Gold', lock: 'premium' },
  { id: 'abyss', color: '#03070f', label: 'Abyss', lock: 'pro' },
  { id: 'crimson', color: '#130608', label: 'Crimson', lock: 'pro' },
  { id: 'jade', color: '#060f0b', label: 'Jade', lock: 'pro' },
];

export const THEME_PALETTES: Record<string, { bg: string; card: string; border: string }> = {
  noir: { bg: '#08080b', card: '#131318', border: '#222227' },
  slate: { bg: '#090d18', card: '#0f1525', border: '#1e2540' },
  amethyst: { bg: '#0c0718', card: '#16103a', border: '#2d1f6e' },
  gold: { bg: '#130e04', card: '#241a06', border: '#4a3510' },
  abyss: { bg: '#020c1e', card: '#071530', border: '#0e2a5c' },
  crimson: { bg: '#180408', card: '#2e0810', border: '#5c1020' },
  jade: { bg: '#041410', card: '#091f18', border: '#0e3d2a' },
};

export function isThemeLocked(theme: BgThemeOption, tier: string | null): boolean {
  if (theme.lock === 'premium') return tier !== 'premium' && tier !== 'pro';
  if (theme.lock === 'pro') return tier !== 'pro';
  return false;
}