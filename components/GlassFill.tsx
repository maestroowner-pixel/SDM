import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// «Стеклянная» объёмная заливка кнопки: градиент светлее сверху → темнее снизу
// и блик на верхней половине. Кладётся первым ребёнком в кнопку; самой кнопке
// нужен стиль glassEdge(...) (кромка, свечение, overflow hidden).

export type GlassTone = 'blue' | 'purple' | 'red' | 'clear';

const TONES: Record<GlassTone, { dark: [string, string]; light: [string, string]; glowDark: string; glowLight: string }> = {
  blue: {
    dark: ['rgba(66, 165, 245, 0.95)', 'rgba(21, 101, 192, 0.95)'],
    light: ['rgba(61, 139, 224, 0.95)', 'rgba(13, 71, 161, 0.95)'],
    glowDark: 'rgba(25, 118, 210, 0.5)',
    glowLight: 'rgba(21, 101, 192, 0.35)',
  },
  purple: {
    dark: ['rgba(156, 127, 214, 0.95)', 'rgba(94, 53, 177, 0.95)'],
    light: ['rgba(66, 165, 245, 0.95)', 'rgba(21, 101, 192, 0.95)'],
    glowDark: 'rgba(126, 87, 194, 0.45)',
    glowLight: 'rgba(25, 118, 210, 0.35)',
  },
  red: {
    dark: ['rgba(255, 112, 102, 0.95)', 'rgba(211, 47, 47, 0.95)'],
    light: ['rgba(255, 112, 102, 0.95)', 'rgba(211, 47, 47, 0.95)'],
    glowDark: 'rgba(255, 59, 48, 0.4)',
    glowLight: 'rgba(255, 59, 48, 0.4)',
  },
  // Прозрачное стекло для второстепенных кнопок (Cancel)
  clear: {
    dark: ['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.05)'],
    light: ['rgba(255, 255, 255, 0.95)', 'rgba(225, 239, 253, 0.9)'],
    glowDark: 'rgba(0, 0, 0, 0.35)',
    glowLight: 'rgba(21, 101, 192, 0.18)',
  },
};

export const GlassFill: React.FC<{ tone?: GlassTone; isDark: boolean }> = ({ tone = 'blue', isDark }) => {
  const t = TONES[tone];
  return (
    <>
      <LinearGradient colors={isDark ? t.dark : t.light} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.32)', 'rgba(255, 255, 255, 0.04)']}
        style={styles.sheen}
        pointerEvents="none"
      />
    </>
  );
};

// Кромка и свечение для кнопки со стеклянной заливкой
export const glassEdge = (tone: GlassTone, isDark: boolean): ViewStyle => {
  const t = TONES[tone];
  return {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: tone === 'clear'
      ? (isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(21, 101, 192, 0.35)')
      : 'rgba(255, 255, 255, 0.28)',
    borderBottomColor: tone === 'clear'
      ? (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(21, 101, 192, 0.5)')
      : 'rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
    boxShadow: `0 4px 14px ${isDark ? t.glowDark : t.glowLight}`,
  };
};

const styles = StyleSheet.create({
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
});
