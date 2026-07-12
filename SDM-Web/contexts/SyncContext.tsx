// Real-time two-way sync of the app records (the `seafarer_data` JSON, no binary
// attachments) via Firestore, keyed by the signed-in user's uid. Both web and
// mobile signed into the same email account share `users/{uid}`.
//
// Loop safety: every write is tagged with this session's DEVICE_ID and we track
// the last JSON we synced; a snapshot that matches our own write or current local
// state is ignored, so applying a remote change never ping-pongs back.
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
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
  const { user } = useAuth();
  const { state, exportData, importData } = useData();

  const [status, setStatus] = useState<SyncStatus>('off');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

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

  // Subscribe to the remote document.
  useEffect(() => {
    if (!db || !uid) {
      setStatus('off');
      lastSyncedJson.current = null;
      return;
    }
    setStatus('connecting');
    const ref = doc(db, 'users', uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as { json?: string; deviceId?: string } | undefined;
        setStatus('synced');

        if (!data || !data.json) {
          // No remote state yet → seed it from this device.
          lastSyncedJson.current = null;
          schedulePush(true);
          return;
        }
        if (data.deviceId === DEVICE_ID) {
          // Our own write echoed back — just acknowledge.
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
  }, [uid, schedulePush]);

  // Push local edits (debounced). Skipped while applying a remote change or when
  // nothing actually changed vs the last synced snapshot.
  useEffect(() => {
    if (!db || !uid) return;
    if (applyingRemote.current) return;
    if (exportRef.current() === lastSyncedJson.current) return;
    schedulePush();
  }, [state, uid, schedulePush]);

  return (
    <SyncContext.Provider value={{ status, lastSyncAt, enabled }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
