// Real-time two-way sync of the app records (the `seafarer_data` JSON, no binary
// attachments) via Firestore, keyed by the signed-in user's uid. Both web and
// mobile signed into the same email account share `users/{uid}`.
//
// First link on an account that already holds different cloud data asks what to
// keep, so whole-document last-write-wins can never silently wipe one side.
//
// Loop safety: every write is tagged with this session's DEVICE_ID and we track
// the last JSON we synced; a snapshot that matches our own write or current local
// state is ignored, so applying a remote change never ping-pongs back.
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { alertMsg, chooseAsync } from '../utils/webAlert';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';

const DEVICE_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const PUSH_DEBOUNCE_MS = 900;

export type SyncStatus = 'off' | 'connecting' | 'synced' | 'error';

interface SyncContextType {
  status: SyncStatus;
  lastSyncAt: number | null;
  enabled: boolean;
}

const SyncContext = createContext<SyncContextType>({ status: 'off', lastSyncAt: null, enabled: false });

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { state, exportData, importData } = useData();

  const [status, setStatus] = useState<SyncStatus>('off');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [ready, setReady] = useState(false); // reconciliation done → live sync may run

  const uid = user && user.emailVerified ? user.uid : null;
  const enabled = !!db && !!uid;

  // Always call the freshest export/import (avoids stale closures in timers).
  const exportRef = useRef(exportData);
  const importRef = useRef(importData);
  exportRef.current = exportData;
  importRef.current = importData;

  const applyingRemote = useRef(false);
  const lastSyncedJson = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushNow = useCallback(async () => {
    if (!db || !uid) return;
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
    if (!db || !uid) return;
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

        const isFirstLink = !alreadyInitialized;

        const finish = async () => {
          await AsyncStorage.setItem(initKey, '1');
          if (cancelled) return;
          setReady(true);
          setLastSyncAt(Date.now());
          setStatus('synced');
          if (isFirstLink) {
            alertMsg(
              'Sync enabled',
              'Your records are now synced with the mobile app under this account.\n\nScans and attachments are not synced — move them with a .sdm backup.'
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

        // Nothing in the cloud yet → seed it from this browser.
        if (!remote?.json) { await takeLocal(); return; }

        // Same content, or this browser already reconciled with this account.
        if (remote.json === localJson) { lastSyncedJson.current = remote.json; await finish(); return; }
        if (alreadyInitialized) { await takeCloud(remote.json); return; }

        // Different data on first link → let the user choose. No silent overwrite.
        const choice = await chooseAsync(
          'Sync — which data to keep?',
          'This account already has data in the cloud, and it differs from the data in this browser. Attachments are not synced.',
          [
            { text: 'Cancel (sign out)', value: 'cancel', style: 'ghost' },
            { text: 'Use cloud data', value: 'cloud', style: 'primary' },
            { text: 'Upload this browser', value: 'local', style: 'primary' },
          ]
        );
        if (cancelled) return;

        if (choice === 'cloud') await takeCloud(remote.json);
        else if (choice === 'local') await takeLocal();
        else if (choice === 'cancel') { setStatus('off'); logout().catch(() => {}); }
        // choice === null means no dialog was available — never guess. Leave the
        // user signed in with sync off rather than touching anyone's data.
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
    <SyncContext.Provider value={{ status, lastSyncAt, enabled }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
