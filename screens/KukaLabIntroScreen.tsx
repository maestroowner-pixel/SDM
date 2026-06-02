
/**
 * KukaLabIntroScreen — упрощённая версия
 * ─────────────────────────────────────────────────────────────
 * SDK 55 / New Architecture / Reanimated 4
 *
 * Только:
 *  1. Логотип (fade-in + spring-scale) — Reanimated View
 *  2. Надпись "Kuka Lab" статичным текстом (Text) — Reanimated View
 *  3. Однократное неоновое мерцание + синхронный звук neon_flicker
 *  4. Fade-out экрана → onFinish
 *
 *  SVG-анимация штрихов полностью удалена.
 * ─────────────────────────────────────────────────────────────
 */

import React, { useEffect, useMemo } from 'react';
import Constants from 'expo-constants';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { AudioModule } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// ─── НАСТРОЙКИ ──────────────────────────────────────────────
const LOGO_SOURCE = require('../assets/images/logo.jpg');
const NEON_CYAN   = '#00F5FF';

const GRADIENT_COLORS: [string, string, string] = ['#080F1E', '#0B1D38', '#091830'];
const GRADIENT_LOCS:   [number, number, number]  = [0, 0.6, 1];

// Тайминги (ms)
const LOGO_IN_DURATION  = 650;
const TEXT_IN_DELAY     = 400;
const TEXT_IN_DURATION  = 500;
const FLICKER_DELAY     = 1200;   // когда начинается мерцание
const TOTAL_MS          = 3200;
const FADE_DURATION     = 400;

// Звук
const FLICKER_SOUND = require('../assets/sounds/neon_flicker.mp3');

function playSound(source: any, volume = 1.0) {
  try {
    const p = new AudioModule.AudioPlayer(source);
    p.volume = volume;
    p.play();
  } catch {}
}

// ─── Компонент ──────────────────────────────────────────────
interface Props { onFinish: () => void }

export default function KukaLabIntroScreen({ onFinish }: Props) {
  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  // Reanimated shared values
  const logoOpacity    = useSharedValue(0);
  const logoScale      = useSharedValue(0.7);
  const textOpacity    = useSharedValue(0);
  const textScale      = useSharedValue(0.9);
  const neonOpacity    = useSharedValue(0);   // управляет яркостью неона
  const screenOpacity  = useSharedValue(1);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textWrapStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: textScale.value }],
  }));

  // Неоновое свечение текста через opacity накладки
  const neonGlowStyle = useAnimatedStyle(() => ({
    opacity: neonOpacity.value,
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  useEffect(() => {
    if (isExpoGo) { onFinish(); return; }

    // ① Логотип — появление
    logoOpacity.value = withTiming(1, { duration: LOGO_IN_DURATION });
    logoScale.value   = withSpring(1, { damping: 14, stiffness: 120 });

    // ② Текст — появление с задержкой
    textOpacity.value = withDelay(TEXT_IN_DELAY, withTiming(1, { duration: TEXT_IN_DURATION }));
    textScale.value   = withDelay(TEXT_IN_DELAY, withSpring(1, { damping: 16, stiffness: 130 }));

    // ③ Неоновое мерцание — однократно
    //    Паттерн: off → on → dim → on → hold → off → on (финальное состояние)
    const flickerTimer = setTimeout(() => {
      playSound(FLICKER_SOUND, 0.9);

      neonOpacity.value = withSequence(
        withTiming(0.05, { duration: 55 }),   // вспышка тёмная
        withTiming(1,    { duration: 40 }),   // яркая
        withTiming(0.4,  { duration: 70 }),   // dim
        withTiming(1,    { duration: 45 }),   // яркая
        withTiming(0.06, { duration: 55 }),   // вспышка тёмная
        withTiming(1,    { duration: 35 }),   // финальное включение
        withTiming(1,    { duration: 800 }),  // держим
      );
    }, FLICKER_DELAY);

    // ④ Fade-out экрана
    screenOpacity.value = withDelay(
      TOTAL_MS - FADE_DURATION,
      withTiming(0, { duration: FADE_DURATION }),
    );
    const finishTimer = setTimeout(() => { onFinish(); }, TOTAL_MS);

    return () => {
      clearTimeout(flickerTimer);
      clearTimeout(finishTimer);
      cancelAnimation(logoOpacity);
      cancelAnimation(logoScale);
      cancelAnimation(textOpacity);
      cancelAnimation(textScale);
      cancelAnimation(neonOpacity);
      cancelAnimation(screenOpacity);
    };
  }, [onFinish]);

  // Звёзды (фиксированные, вычисляются один раз)
  const stars = useMemo(() =>
    Array.from({ length: 30 }, () => ({
      top:  Math.random() * height,
      left: Math.random() * width,
      size: Math.random() * 1.4 + 0.5,
      op:   Math.random() * 0.28 + 0.06,
    })), []
  );

  return (
    <Animated.View style={[styles.root, screenStyle]}>
      <StatusBar hidden />

      <LinearGradient
        colors={GRADIENT_COLORS}
        locations={GRADIENT_LOCS}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.25, y: 0 }}
        end={{ x: 0.75, y: 1 }}
      />

      {/* Звёзды */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {stars.map((s, i) => (
          <View
            key={i}
            style={[styles.star, {
              top: s.top, left: s.left,
              width: s.size, height: s.size,
              opacity: s.op,
            }]}
          />
        ))}
      </View>

      {/* Логотип */}
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <View style={styles.logoCircle}>
          <Image source={LOGO_SOURCE} style={styles.logoImg} resizeMode="cover" />
        </View>
        <View style={styles.logoGlow} />
      </Animated.View>

      {/* Надпись "Kuka Lab" */}
      <Animated.View style={[styles.signWrap, textWrapStyle]}>

        {/* Базовый текст (тёмная трубка) */}
        <Text style={styles.textBase} allowFontScaling={false}>
          Kuka Lab
        </Text>

        {/* Неоновый слой поверх — управляется neonOpacity */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.neonOverlay, neonGlowStyle]}
          pointerEvents="none">
          <Text style={styles.textNeon} allowFontScaling={false}>
            Kuka Lab
          </Text>
        </Animated.View>

        {/* Подчёркивание */}
        <Animated.View style={[styles.underline, neonGlowStyle]} />
      </Animated.View>

      {/* Слоган */}
      <Animated.View style={[styles.taglineWrap, logoStyle]}>
        <Text style={styles.tagline}>maritime apps</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Стили ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080F1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#8BC8EE',
  },

  // Логотип
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 148, height: 148, borderRadius: 74,
    overflow: 'hidden', borderWidth: 2,
    borderColor: 'rgba(0,245,255,0.2)',
    backgroundColor: '#e8f0f8',
    shadowColor: NEON_CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 18, elevation: 10,
  },
  logoImg: {
    width: 148, height: 148,
    transform: [{ scale: 1.06 }],
  },
  logoGlow: {
    position: 'absolute', bottom: -12,
    width: 140, height: 26, borderRadius: 70,
    backgroundColor: 'transparent',
    shadowColor: NEON_CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20,
  },

  // Надпись
  signWrap: {
    alignItems: 'center',
    position: 'relative',
  },
  textBase: {
    fontFamily: 'SpaceMono',
    fontSize: 42,
    letterSpacing: 6,
    color: '#0D3D47',          // тёмная "трубка"
    textTransform: 'uppercase',
  },
  neonOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textNeon: {
    fontFamily: 'SpaceMono',
    fontSize: 42,
    letterSpacing: 6,
    color: NEON_CYAN,
    textTransform: 'uppercase',
    textShadowColor: NEON_CYAN,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  underline: {
    marginTop: 8,
    width: '90%',
    height: 2,
    borderRadius: 1,
    backgroundColor: NEON_CYAN,
    shadowColor: NEON_CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },

  // Слоган
  taglineWrap: {
    position: 'absolute',
    bottom: height * 0.1,
  },
  tagline: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    letterSpacing: 7,
    color: 'rgba(0,195,215,0.36)',
    textTransform: 'uppercase',
  },
});