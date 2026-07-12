// Branded in-app dialogs for the mobile app — replaces the grey OS Alert box.
// Registers itself with utils/dialog, so callers keep using
// alertMsg / confirmAsync / chooseAsync.
//
// Why not a plain <Modal> at the root: RN 0.85 presents a Modal from its own
// reactViewController (RCTModalHostViewComponentView.mm). A root-level dialog
// Modal would therefore be presented from the ROOT view controller — and if a
// screen already has a Modal open (attach menu, MPC/DP edit form, Paywall), that
// root VC is already presenting, so on iOS UIKit silently refuses and the dialog
// never appears.
//
// Instead the dialog is a plain absolute overlay rendered by <DialogHost />.
// Every Modal that can raise a dialog renders its own <DialogHost />; hosts
// register in a stack and only the top-most one draws, so the dialog always
// lands inside whatever surface is currently on top.
import React, { createContext, useContext, useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useData } from './DataContext';
import { setDialogHandler, type DialogRequest, type DialogButtonStyle } from '../utils/dialog';

const APP_NAME = 'Seafarer Documents Manager';
const SDM_LOGO = require('../assets/images/sdm_icon.png');

interface PendingDialog extends DialogRequest {
  resolve: (value: string | null) => void;
}

interface DialogInternal {
  current: PendingDialog | null;
  close: (value: string | null) => void;
  push: (req: PendingDialog) => void;
}

const DialogContext = createContext<DialogInternal>({
  current: null,
  close: () => {},
  push: () => {},
});

// ── Host stack: only the top-most mounted host renders the dialog ───────────
let hostSeq = 0;
const hostStack: number[] = [];
const hostListeners = new Set<() => void>();
const notifyHosts = () => hostListeners.forEach((l) => l());

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [current, setCurrent] = useState<PendingDialog | null>(null);
  const queue = useRef<PendingDialog[]>([]);
  // Mirror of `current` so queueing has no side effects inside a state updater.
  const currentRef = useRef<PendingDialog | null>(null);

  const push = useCallback((req: PendingDialog) => {
    if (currentRef.current) { queue.current.push(req); return; }
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

  return (
    <DialogContext.Provider value={{ current, close, push }}>
      {children}
      {/* Root host — used whenever no Modal is open */}
      <DialogHost />
    </DialogContext.Provider>
  );
};

/**
 * Renders the active dialog if this host is the top-most one.
 * Place one inside every <Modal> that can raise a dialog, as its last child.
 */
export const DialogHost: React.FC = () => {
  const { current, close } = useContext(DialogContext);
  const { state } = useData();
  const isDark = state.theme === 'dark';

  const idRef = useRef<number>(0);
  if (idRef.current === 0) idRef.current = ++hostSeq;
  const [, forceRender] = useState(0);

  useEffect(() => {
    const id = idRef.current;
    hostStack.push(id);
    notifyHosts();

    const listener = () => forceRender((n) => n + 1);
    hostListeners.add(listener);

    return () => {
      const i = hostStack.indexOf(id);
      if (i >= 0) hostStack.splice(i, 1);
      hostListeners.delete(listener);
      notifyHosts();
    };
  }, []);

  const isTop = hostStack[hostStack.length - 1] === idRef.current;
  if (!current || !isTop) return null;

  const textColor = isDark ? '#fff' : '#1A3A5C';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';

  const btnStyles = (style?: DialogButtonStyle) => {
    if (style === 'ghost') {
      return {
        container: [styles.btn, styles.btnGhost, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }],
        text: [styles.btnText, { color: mutedColor }],
      };
    }
    return {
      container: [styles.btn, { backgroundColor: style === 'destructive' ? '#f44336' : '#1976d2' }],
      text: [styles.btnText, { color: '#fff', fontWeight: '700' as const }],
    };
  };

  return (
    <View style={styles.overlay}>
      <View style={[styles.card, { backgroundColor: isDark ? '#152a44' : '#ffffff' }]}>
        <View style={styles.brandRow}>
          <Image source={SDM_LOGO} style={styles.brandLogo} resizeMode="contain" />
          <Text style={[styles.brandText, { color: mutedColor }]} numberOfLines={1}>{APP_NAME}</Text>
        </View>

        <Text style={[styles.title, { color: textColor }]}>{current.title}</Text>

        {!!current.message && (
          <ScrollView style={styles.messageScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.message, { color: mutedColor }]}>{current.message}</Text>
          </ScrollView>
        )}

        {/* Stacked buttons read better on a phone, especially with 3 options */}
        <View style={styles.buttons}>
          {current.buttons.map((btn) => {
            const s = btnStyles(btn.style);
            return (
              <TouchableOpacity
                key={btn.value}
                style={s.container as any}
                onPress={() => close(btn.value)}
                activeOpacity={0.85}
              >
                <Text style={s.text as any}>{btn.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 22,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  brandLogo: { width: 20, height: 20, borderRadius: 5 },
  brandText: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.3 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  messageScroll: { maxHeight: 220 },
  message: { fontSize: 14.5, lineHeight: 20 },
  buttons: { marginTop: 20, gap: 10 },
  btn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  btnGhost: { borderWidth: 1, backgroundColor: 'transparent' },
  btnText: { fontSize: 15, fontWeight: '600' },
});
