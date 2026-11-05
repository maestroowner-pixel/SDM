// Saved CV versions: each holds its own design and composition, so one CV can
// be tailored per vessel or company. Kept in this browser's storage only — not
// part of the synced `seafarer_data` blob, which the mobile app also reads.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CvDesignConfig, defaultCvConfig, normalizeCvConfig } from './cvTemplate';

export const CV_VERSIONS_KEY = 'cv_versions';
export const CV_LEGACY_CONFIG_KEY = 'cv_design_config';
export const CV_VERSION_NAME_MAX = 40;

export interface CvVersion {
  id: string;
  name: string;
  config: CvDesignConfig;
}

export interface CvVersionStore {
  activeId: string;
  versions: CvVersion[];
}

const newId = () => `cv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const singleVersion = (name: string, config: CvDesignConfig): CvVersionStore => {
  const id = newId();
  return { activeId: id, versions: [{ id, name, config }] };
};

const parseStore = (raw: string | null): CvVersionStore | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const versions: CvVersion[] = (Array.isArray(parsed?.versions) ? parsed.versions : [])
      .filter((v: any) => v && typeof v.id === 'string')
      .map((v: any) => ({ id: v.id, name: String(v.name || ''), config: normalizeCvConfig(v.config) }));
    if (versions.length === 0) return null;
    const activeId = versions.some(v => v.id === parsed.activeId) ? parsed.activeId : versions[0].id;
    return { activeId, versions };
  } catch {
    return null;
  }
};

// First run after the upgrade: the design saved by the old constructor becomes
// the first version. The old key is left in place so a rollback still finds it.
export const loadCvVersions = async (defaultName: string): Promise<CvVersionStore> => {
  const store = parseStore(await AsyncStorage.getItem(CV_VERSIONS_KEY).catch(() => null));
  if (store) return store;
  let legacy: CvDesignConfig = defaultCvConfig;
  try {
    const raw = await AsyncStorage.getItem(CV_LEGACY_CONFIG_KEY);
    if (raw) legacy = normalizeCvConfig(JSON.parse(raw));
  } catch {}
  return singleVersion(defaultName, legacy);
};

export const saveCvVersions = (store: CvVersionStore): Promise<void> =>
  AsyncStorage.setItem(CV_VERSIONS_KEY, JSON.stringify(store));

export const activeCvVersion = (store: CvVersionStore): CvVersion =>
  store.versions.find(v => v.id === store.activeId) || store.versions[0];

export const updateActiveCvConfig = (
  store: CvVersionStore, update: (c: CvDesignConfig) => CvDesignConfig,
): CvVersionStore => ({
  ...store,
  versions: store.versions.map(v => (v.id === store.activeId ? { ...v, config: update(v.config) } : v)),
});

export const duplicateActiveCvVersion = (store: CvVersionStore, name: string): CvVersionStore => {
  const id = newId();
  const copy: CvVersion = { id, name: name.slice(0, CV_VERSION_NAME_MAX), config: activeCvVersion(store).config };
  return { activeId: id, versions: [...store.versions, copy] };
};

export const renameActiveCvVersion = (store: CvVersionStore, name: string): CvVersionStore => ({
  ...store,
  versions: store.versions.map(v => (v.id === store.activeId ? { ...v, name } : v)),
});

// The last version can't be deleted: the screen always needs an active one.
export const deleteActiveCvVersion = (store: CvVersionStore): CvVersionStore => {
  if (store.versions.length <= 1) return store;
  const index = store.versions.findIndex(v => v.id === store.activeId);
  const versions = store.versions.filter(v => v.id !== store.activeId);
  return { activeId: versions[Math.max(0, index - 1)].id, versions };
};
