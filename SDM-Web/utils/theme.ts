// Shared UI theme for SDM Web (ported from native app/index.tsx UI_THEME).
export const rgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const UI_THEME = {
  colors: {
    cyanAccent: '#00BFFF',
    cyanGlass: rgba('#00BFFF', 0.15),
    light: {
      primary: '#1565C0',
      background: ['#F0F7FF', '#E1EFFD', '#D0E7FC'] as const,
      headerBg: rgba('#E1EFFD', 0.95),
      headerGradient: [rgba('#E1EFFD', 0.95), rgba('#E1EFFD', 0.85)] as const,
      text: '#1A3A5C',
      textSecondary: '#6B9CC8',
      iconInactive: '#6B9CC8',
      card: rgba('#FFFFFF', 0.5),
      navBg: rgba('#E1EFFD', 0.95),
    },
    dark: {
      primary: '#00BFFF',
      background: ['#0a1628', '#1a2a4a', '#0d1a2d'] as const,
      headerBg: rgba('#1a2a4a', 0.95),
      headerGradient: [rgba('#1a2a4a', 0.95), rgba('#1a2a4a', 0.85)] as const,
      text: '#FFFFFF',
      textSecondary: '#556B8D',
      iconInactive: '#556B8D',
      card: rgba('#1a2a4a', 0.4),
      navBg: rgba('#1a2a4a', 0.95),
    },
  },
};

export type ThemeColors = typeof UI_THEME.colors.dark;
