// services/mpcStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MPCRecord } from '../screens/MPCScreen';

const KEYS = {
  RECORDS:     'mpc_records',
  VESSEL_NAME: 'mpc_vessel_name',
};

export async function loadMPCRecords(): Promise<MPCRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.RECORDS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveMPCRecords(records: MPCRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.RECORDS, JSON.stringify(records));
  } catch (e) {
    console.warn('MPC: failed to save records', e);
  }
}

export async function loadMPCVesselName(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(KEYS.VESSEL_NAME)) || '';
  } catch {
    return '';
  }
}

export async function saveMPCVesselName(name: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.VESSEL_NAME, name);
  } catch {}
}
