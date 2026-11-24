// iOS assigns the app a new data-container path (…/Application/<UUID>/) after an
// update, reinstall or device restore. Attachments are stored with absolute
// file:// URIs, so the saved path goes stale even though the file is still in
// Documents/. Re-root any URI that points into an old Documents/ folder.
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MARKER = '/Documents/';

export const fixLocalUri = (uri: string): string => {
  const docDir = FileSystem.documentDirectory;
  if (!uri || !docDir || uri.startsWith(docDir)) return uri;
  const i = uri.indexOf(MARKER);
  if (i < 0 || !uri.startsWith('file://')) return uri;
  return docDir + uri.slice(i + MARKER.length);
};

type FileMap = { [key: string]: { uri: string }[] };

// Fix URIs inside a { id: AttachedFile[] } map; returns the map and whether anything changed.
export const fixFileMap = <T extends FileMap>(map: T): { map: T; changed: boolean } => {
  let changed = false;
  const out: FileMap = {};
  for (const [k, files] of Object.entries(map || {})) {
    out[k] = (Array.isArray(files) ? files : []).map(f => {
      const uri = fixLocalUri(f.uri);
      if (uri === f.uri) return f;
      changed = true;
      return { ...f, uri };
    });
  }
  return { map: out as T, changed };
};

// Read an attachment map from AsyncStorage with URIs re-rooted; persists the fix once.
export const loadFileMap = async <T extends FileMap>(key: string): Promise<T | null> => {
  const stored = await AsyncStorage.getItem(key);
  if (!stored) return null;
  const { map, changed } = fixFileMap(JSON.parse(stored) as T);
  if (changed) await AsyncStorage.setItem(key, JSON.stringify(map)).catch(() => {});
  return map;
};
