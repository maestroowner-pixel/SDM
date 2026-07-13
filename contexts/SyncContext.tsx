// Real-time two-way sync of the app records with SDM Web, via Firestore
// `users/{uid}`. Only records (the `seafarer_data` JSON) sync — scans/attachments
// stay on-device and move via the .sdm backup.
//
// Sync is opt-in: it only runs while the user is signed in (and verified).
//
// First login on an account that already has cloud data asks what to keep, so a
// phone full of records is never silently overwritten by (or overwrites) the cloud.
// After that it's whole-document last-write-wins, which is fine for one person's
// own devices.
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { playSuccessSound } from '../utils/sound';
import { alertMsg, chooseAsync } from '../utils/dialog';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';

const DEVICE_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const PUSH_DEBOUNCE_MS = 900;

export type SyncStatus = 'off' | 'connecting' | 'synced' | 'error';

interface SyncContextType {
  status: SyncStatus;
  lastSyncAt: number | null;
  enabled: boolean;
  /**
   * Stop this session from ever writing to the cloud again. Synchronous, so a
   * caller can wipe local data right after without the change racing its way up
   * to the account (and from there onto every other device).
   */
  halt: () => void;
}

const SyncContext = createContext<SyncContextType>({
  status: 'off', lastSyncAt: null, enabled: false, halt: () => {},
});

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { state, exportData, importData } = useData();

  const [status, setStatus] = useState<SyncStatus>('off');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [ready, setReady] = useState(false); // reconciliation done → live sync may run

  const uid = user && user.emailVerified ? user.uid : null;
  const enabled = !!db && !!uid;

  // Always use the freshest export/import (no stale closures in timers).
  const exportRef = useRef(exportData);
  const importRef = useRef(importData);
  exportRef.current = exportData;
  importRef.current = importData;

  const applyingRemote = useRef(false);
  const lastSyncedJson = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const halted = useRef(false);

  const halt = useCallback(() => {
    halted.current = true;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    setReady(false); // tears down the snapshot listener
    setStatus('off');
  }, []);

  const pushNow = useCallback(async () => {
    if (!db || !uid || halted.current) return;
    try {
      const json = exportRef.current();
      if (json === lastSyncedJson.current) return;
      await setDoc(doc(db, 'users', uid), { json, deviceId: DEVICE_ID, updatedAt: Date.now() });
      lastSyncedJson.current = json;
      setLastSyncAt(Date.now());
      setStatus('synced');
    } catch (e) {
      console.error('sync push failed:', e);
      setStatus('error');
    }
  }, [uid]);

  const schedulePush = useCallback((immediate = false) => {
    if (!db || !uid || halted.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(pushNow, immediate ? 0 : PUSH_DEBOUNCE_MS);
  }, [uid, pushNow]);

  // ── First-run reconciliation, then unlock live sync ───────────────────────
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!db || !uid) {
        setStatus('off');
        setReady(false);
        lastSyncedJson.current = null;
        return;
      }
      halted.current = false; // a fresh sign-in re-arms sync
      setStatus('connecting');
      const ref = doc(db, 'users', uid);
      const initKey = `sync_init_${uid}`;

      try {
        const snap = await getDoc(ref);
        if (cancelled) return;

        const remote = snap.exists() ? (snap.data() as { json?: string }) : null;
        const localJson = exportRef.current();
        const alreadyInitialized = await AsyncStorage.getItem(initKey);
        if (cancelled) return;

        // Confirm out loud the first time this account is linked on this device;
        // on later launches the Settings status row is enough.
        const isFirstLink = !alreadyInitialized;
        const finish = async () => {
          await AsyncStorage.setItem(initKey, '1');
          if (cancelled) return;
          setReady(true);
          setLastSyncAt(Date.now());
          setStatus('synced');
          if (isFirstLink) {
            playSuccessSound().catch(() => {});
            alertMsg(
              'Sync enabled',
              'Your records are now synced with the web app under this account.\n\nScans and attachments are not synced — move them with a .sdm backup.'
            );
          }
        };

        const takeCloud = async (json: string) => {
          applyingRemote.current = true;
          try { await importRef.current(json); } finally { applyingRemote.current = false; }
          lastSyncedJson.current = json;
          await finish();
        };

        const takeLocal = async () => {
          await setDoc(ref, { json: localJson, deviceId: DEVICE_ID, updatedAt: Date.now() });
          lastSyncedJson.current = localJson;
          await finish();
        };

        // Nothing in the cloud yet → seed it from this phone.
        if (!remote?.json) { await takeLocal(); return; }

        // Same content, or this device already reconciled with this account.
        if (remote.json === localJson) { lastSyncedJson.current = remote.json; await finish(); return; }
        if (alreadyInitialized) { await takeCloud(remote.json); return; }

        // Different data on first link → let the user choose. No silent overwrite.
        const choice = await chooseAsync(
          'Sync — which data to keep?',
          'This account already has data in the cloud, and it differs from the data on this phone. Attachments are not synced.',
          [
            { text: 'Use cloud data', value: 'cloud', style: 'primary' },
            { text: 'Upload phone data', value: 'local', style: 'primary' },
            { text: 'Cancel (sign out)', value: 'cancel', style: 'ghost' },
          ]
        );
        if (cancelled) return;

        if (choice === 'cloud') await takeCloud(remote.json);
        else if (choice === 'local') await takeLocal();
        else if (choice === 'cancel') { setStatus('off'); logout().catch(() => {}); }
        // No answer (dialog unavailable) → never guess: stay signed in, sync off.
        else setStatus('off');
      } catch (e) {
        console.error('sync init failed:', e);
        if (!cancelled) setStatus('error');
      }
    };

    run();
    return () => { cancelled = true; };
  }, [uid, logout]);

  // ── Live subscription (only after reconciliation) ─────────────────────────
  useEffect(() => {
    if (!db || !uid || !ready) return;
    const ref = doc(db, 'users', uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (halted.current) return; // wiping locally — don't pull the cloud copy back in
        const data = snap.data() as { json?: string; deviceId?: string } | undefined;
        setStatus('synced');
        if (!data?.json) { schedulePush(true); return; }

        if (data.deviceId === DEVICE_ID) {
          lastSyncedJson.current = data.json;
          setLastSyncAt(Date.now());
          return;
        }
        if (data.json !== exportRef.current()) {
          applyingRemote.current = true;
          importRef.current(data.json).finally(() => { applyingRemote.current = false; });
        }
        lastSyncedJson.current = data.json;
        setLastSyncAt(Date.now());
      },
      (err) => { console.error('sync snapshot error:', err); setStatus('error'); }
    );
    return () => { unsub(); if (pushTimer.current) clearTimeout(pushTimer.current); };
  }, [uid, ready, schedulePush]);

  // ── Push local edits (debounced) ──────────────────────────────────────────
  useEffect(() => {
    if (!db || !uid || !ready) return;
    if (applyingRemote.current) return;
    if (exportRef.current() === lastSyncedJson.current) return;
    schedulePush();
  }, [state, uid, ready, schedulePush]);

  return (
    <SyncContext.Provider value={{ status, lastSyncAt, enabled, halt }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
