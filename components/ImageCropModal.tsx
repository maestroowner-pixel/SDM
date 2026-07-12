import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, PanResponder, ActivityIndicator } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { t } from '../utils/i18n';

interface Rect { x: number; y: number; w: number; h: number; }
interface Layout { imgX: number; imgY: number; dispW: number; dispH: number; }

interface Props {
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  onDone: (uri: string | null) => void;
}

const MIN = 60;       // мин. сторона рамки (в координатах экрана)
const HANDLE = 30;    // визуальный размер уголка
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Свой экран обрезки (overlay-View, НЕ RN Modal — чтобы показываться поверх
// модалки редактирования на iOS). Прямоугольная (freeform) обрезка через
// expo-image-manipulator.crop — без нативных зависимостей, одинаково на iOS/Android.
const ImageCropModal: React.FC<Props> = ({ imageUri, imageWidth, imageHeight, onDone }) => {
  const [rect, setRectState] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);
  const rectRef = useRef<Rect | null>(null);
  const layoutRef = useRef<Layout>({ imgX: 0, imgY: 0, dispW: 0, dispH: 0 });
  const startRef = useRef<Rect>({ x: 0, y: 0, w: 0, h: 0 });

  const setRect = useCallback((r: Rect) => { rectRef.current = r; setRectState(r); }, []);

  // Вписать фото в доступную область и инициализировать рамку на всё фото.
  const onAreaLayout = (e: any) => {
    if (rectRef.current) return;
    const { width: availW, height: availH } = e.nativeEvent.layout;
    const aspect = imageWidth / imageHeight;
    let dispW = availW;
    let dispH = dispW / aspect;
    if (dispH > availH) { dispH = availH; dispW = dispH * aspect; }
    const imgX = (availW - dispW) / 2;
    const imgY = (availH - dispH) / 2;
    layoutRef.current = { imgX, imgY, dispW, dispH };
    setRect({ x: imgX, y: imgY, w: dispW, h: dispH });
  };

  // Создаём PanResponder'ы один раз; читают актуальные значения из ref'ов.
  const resp = useRef<any>(null);
  if (!resp.current) {
    const makeCorner = (corner: 'tl' | 'tr' | 'bl' | 'br') =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => { if (rectRef.current) startRef.current = { ...rectRef.current }; },
        onPanResponderMove: (_e, g) => {
          const L = layoutRef.current; const s = startRef.current;
          let x = s.x, y = s.y, w = s.w, h = s.h;
          if (corner === 'br') { w = s.w + g.dx; h = s.h + g.dy; }
          if (corner === 'tr') { w = s.w + g.dx; y = s.y + g.dy; h = s.h - g.dy; }
          if (corner === 'bl') { x = s.x + g.dx; w = s.w - g.dx; h = s.h + g.dy; }
          if (corner === 'tl') { x = s.x + g.dx; y = s.y + g.dy; w = s.w - g.dx; h = s.h - g.dy; }
          // удержать в границах фото
          if (x < L.imgX) { w -= L.imgX - x; x = L.imgX; }
          if (y < L.imgY) { h -= L.imgY - y; y = L.imgY; }
          if (x + w > L.imgX + L.dispW) w = L.imgX + L.dispW - x;
          if (y + h > L.imgY + L.dispH) h = L.imgY + L.dispH - y;
          // мин. размер (фиксируем противоположный край)
          if (w < MIN) { if (corner === 'tl' || corner === 'bl') x = x + w - MIN; w = MIN; }
          if (h < MIN) { if (corner === 'tl' || corner === 'tr') y = y + h - MIN; h = MIN; }
          setRect({ x, y, w, h });
        },
      });

    resp.current = {
      move: PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => { if (rectRef.current) startRef.current = { ...rectRef.current }; },
        onPanResponderMove: (_e, g) => {
          const L = layoutRef.current; const s = startRef.current;
          const x = clamp(s.x + g.dx, L.imgX, L.imgX + L.dispW - s.w);
          const y = clamp(s.y + g.dy, L.imgY, L.imgY + L.dispH - s.h);
          setRect({ x, y, w: s.w, h: s.h });
        },
      }),
      tl: makeCorner('tl'), tr: makeCorner('tr'), bl: makeCorner('bl'), br: makeCorner('br'),
    };
  }
  const R = resp.current;

  const confirm = async () => {
    const L = layoutRef.current; const r = rectRef.current;
    if (!r || !L.dispW) { onDone(null); return; }
    try {
      setBusy(true);
      const scale = imageWidth / L.dispW;
      const originX = clamp(Math.round((r.x - L.imgX) * scale), 0, imageWidth - 1);
      const originY = clamp(Math.round((r.y - L.imgY) * scale), 0, imageHeight - 1);
      const width = clamp(Math.round(r.w * scale), 1, imageWidth - originX);
      const height = clamp(Math.round(r.h * scale), 1, imageHeight - originY);
      const out = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: { originX, originY, width, height } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      onDone(out.uri);
    } catch {
      onDone(imageUri); // если кроп не удался — отдаём исходник
    }
  };

  const cornerStyle = (r: Rect, c: 'tl' | 'tr' | 'bl' | 'br') => {
    const half = HANDLE / 2;
    const base: any = { position: 'absolute', width: HANDLE, height: HANDLE };
    if (c === 'tl') return { ...base, left: r.x - half, top: r.y - half };
    if (c === 'tr') return { ...base, left: r.x + r.w - half, top: r.y - half };
    if (c === 'bl') return { ...base, left: r.x - half, top: r.y + r.h - half };
    return { ...base, left: r.x + r.w - half, top: r.y + r.h - half };
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.area} onLayout={onAreaLayout}>
        {!!layoutRef.current.dispW && (
          <Image
            source={{ uri: imageUri }}
            style={{ position: 'absolute', left: layoutRef.current.imgX, top: layoutRef.current.imgY, width: layoutRef.current.dispW, height: layoutRef.current.dispH }}
            resizeMode="contain"
          />
        )}

        {rect && (
          <>
            {/* затемнение вне рамки */}
            <View style={[styles.dim, { left: 0, top: 0, right: 0, height: rect.y }]} />
            <View style={[styles.dim, { left: 0, top: rect.y + rect.h, right: 0, bottom: 0 }]} />
            <View style={[styles.dim, { left: 0, top: rect.y, width: rect.x, height: rect.h }]} />
            <View style={[styles.dim, { left: rect.x + rect.w, top: rect.y, right: 0, height: rect.h }]} />

            {/* рамка с возможностью перемещения */}
            <View
              {...R.move.panHandlers}
              style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderWidth: 2, borderColor: '#00bcd4' }}
            />

            {/* уголки */}
            {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
              <View key={c} {...R[c].panHandlers} style={cornerStyle(rect, c)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <View style={styles.handleDot} />
              </View>
            ))}
          </>
        )}

        {busy && (
          <View style={styles.busy}><ActivityIndicator size="large" color="#00bcd4" /></View>
        )}
      </View>

      <View style={styles.bar}>
        <TouchableOpacity style={styles.btn} onPress={() => onDone(null)} disabled={busy}>
          <Text style={styles.btnText}>{t('attach.cropCancel')}</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>{t('attach.cropTitle')}</Text>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={confirm} disabled={busy}>
          <Text style={[styles.btnText, styles.btnTextPrimary]}>{t('attach.cropDone')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 2000, elevation: 2000 },
  area: { flex: 1, margin: 0 },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
  handleDot: { flex: 1, margin: 8, borderRadius: 999, backgroundColor: '#00bcd4', borderWidth: 2, borderColor: '#fff' },
  busy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16, paddingBottom: 28, backgroundColor: '#10233b' },
  hint: { color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1, textAlign: 'center' },
  btn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  btnPrimary: { backgroundColor: '#00bcd4' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnTextPrimary: { color: '#04222e' },
});

// Хук: даёт промис-функцию cropImage(uri,w,h) и элемент для рендера.
export function useImageCropper() {
  const [pending, setPending] = useState<{ uri: string; w: number; h: number } | null>(null);
  const resolver = useRef<((v: string | null) => void) | null>(null);

  const cropImage = useCallback(
    (uri: string, w: number, h: number) =>
      new Promise<string | null>((res) => { resolver.current = res; setPending({ uri, w, h }); }),
    []
  );

  const handleDone = useCallback((uri: string | null) => {
    setPending(null);
    resolver.current?.(uri);
    resolver.current = null;
  }, []);

  const cropElement = pending ? (
    <ImageCropModal imageUri={pending.uri} imageWidth={pending.w} imageHeight={pending.h} onDone={handleDone} />
  ) : null;

  return { cropImage, cropElement };
}

export default ImageCropModal;
