// In-app themed dialogs, replacing the browser's native alert/confirm (which
// render as "localhost:8090 says…"). Registers itself with utils/webAlert so the
// existing alertMsg/confirmAsync/chooseAsync call sites work unchanged.
import React, { createContext, useContext, useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { createPortal } from 'react-dom';
import { useData } from './DataContext';
import { UI_THEME } from '../utils/theme';
import { setDialogHandler, type DialogRequest, type DialogButtonStyle } from '../utils/webAlert';

const APP_NAME = 'Seafarer Documents Manager';

interface PendingDialog extends DialogRequest {
  resolve: (value: string | null) => void;
}

const DialogContext = createContext<{ alert: (title: string, message?: string) => void }>({ alert: () => {} });

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { state } = useData();
  const isDark = state.theme === 'dark';
  const theme = isDark ? UI_THEME.colors.dark : UI_THEME.colors.light;

  const [current, setCurrent] = useState<PendingDialog | null>(null);
  const queue = useRef<PendingDialog[]>([]);
  // Mirror of `current` so queueing stays deterministic (no side effects inside
  // a state updater, which React may invoke twice).
  const currentRef = useRef<PendingDialog | null>(null);

  const push = useCallback((req: PendingDialog) => {
    if (currentRef.current) {
      queue.current.push(req);
      return;
    }
    currentRef.current = req;
    setCurrent(req);
  }, []);

  const close = useCallback((value: string | null) => {
    const cur = currentRef.current;
    cur?.resolve(value);
    const item = queue.current.shift() || null;
    currentRef.current = item;
    setCurrent(item);
  }, []);

  useEffect(() => {
    setDialogHandler({
      show: (req) => new Promise<string | null>((resolve) => push({ ...req, resolve })),
    });
    return () => setDialogHandler(null);
  }, [push]);

  const buttonStyleFor = (style?: DialogButtonStyle) => {
    if (style === 'ghost') {
      return {
        container: [styles.btn, styles.btnGhost, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }],
        text: [styles.btnGhostText, { color: theme.textSecondary }],
      };
    }
    const bg = style === 'destructive' ? '#f44336' : theme.primary;
    return { container: [styles.btn, { backgroundColor: bg }], text: styles.btnPrimaryText };
  };

  // Rendered through a portal straight into <body> with the highest possible
  // z-index: react-native-web's Modal stacks by mount order, so a dialog opened
  // from inside a screen's Modal would otherwise appear *behind* it.
  const overlay = current ? (
    <View style={styles.overlay}>
      <View
        style={[
          styles.card,
          { backgroundColor: isDark ? '#152a44' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' },
        ]}
      >
        {/* Brand header — so it reads as the app, not the browser */}
        <View style={styles.brandRow}>
          <Image source={require('../assets/images/sdm_icon.png')} style={styles.brandLogo} resizeMode="contain" />
          <Text style={[styles.brandText, { color: theme.textSecondary }]} numberOfLines={1}>{APP_NAME}</Text>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>{current.title}</Text>

        {!!current.message && (
          <ScrollView style={styles.messageScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.message, { color: theme.textSecondary }]}>{current.message}</Text>
          </ScrollView>
        )}

        <View style={styles.buttons}>
          {current.buttons.map((btn) => {
            const s = buttonStyleFor(btn.style);
            return (
              <TouchableOpacity
                key={btn.value}
                style={s.container as any}
                onPress={() => close(btn.value)}
                activeOpacity={0.8}
              >
                <Text style={s.text as any}>{btn.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  ) : null;

  return (
    <DialogContext.Provider
      value={{
        alert: (title, message) =>
          push({ title, message, buttons: [{ text: 'OK', value: 'ok', style: 'primary' }], resolve: () => {} }),
      }}
    >
      {children}
      {overlay && typeof document !== 'undefined' ? createPortal(overlay, document.body) : null}
    </DialogContext.Provider>
  );
};

export const useDialog = () => useContext(DialogContext);

const styles = StyleSheet.create({
  overlay: {
    // 'fixed' is web-only (react-native-web supports it); pins the dialog above
    // every other modal regardless of mount order.
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2147483647,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  brandLogo: { width: 20, height: 20, borderRadius: 5 },
  brandText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  title: { fontSize: 19, fontWeight: '700', marginBottom: 8 },
  messageScroll: { maxHeight: 240 },
  message: { fontSize: 15, lineHeight: 21 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
  btn: {
    minWidth: 96,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  btnGhost: { borderWidth: 1, backgroundColor: 'transparent' },
  btnGhostText: { fontSize: 15, fontWeight: '600' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
