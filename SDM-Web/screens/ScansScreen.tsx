// screens/ScansScreen.tsx — Web version.
// Attachment manager: aggregates all attachments (documents + sea service +
// standalone uploads), lets you upload files (images are combined into one PDF),
// preview (open in a new tab), download a ZIP of the selection, rename, delete.
// No camera / OCR / native PDF viewer.
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import JSZip from 'jszip';
import {
  buildPdfFromImages,
  storeUploadedFile,
  readImageFile,
  buildScanFileName,
  ScanImage,
} from '../utils/scanUtils';
import { getBlob, deleteBlob, openAttachment, downloadAttachment } from '../utils/attachmentStore';
import { alertMsg, confirmAsync } from '../utils/webAlert';
import { useData } from '../contexts/DataContext';
import { t } from '../utils/i18n';
import { useTablet } from '../hooks/useTablet';

const GHOST_SHARK_IMAGE = require('../assets/images/ghost-shark.png');

interface ScanFile {
  fileName: string;
  uri: string;
  size: number;
  uploadDate: string;
  documentId: string;
  documentName: string;
  selected: boolean;
}

const BUCKET = 'standalone_scans';

const ToggleButton: React.FC<{ selected: boolean; onPress: () => void; isDark: boolean }> = ({ selected, onPress, isDark }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (selected) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
    glowAnim.setValue(0);
  }, [selected]);
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      {selected ? (
        <Animated.View style={[styles.toggleButtonActive, { opacity: glowOpacity }]}>
          <Ionicons name="checkbox" size={20} color="#00ffff" />
        </Animated.View>
      ) : (
        <View style={[styles.toggleButtonInactive, isDark ? styles.toggleInactiveDark : styles.toggleInactiveLight]}>
          <Ionicons name="square-outline" size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export const ScansScreen: React.FC = () => {
  const { state } = useData();
  const isDark = state.theme === 'dark';
  const isTablet = useTablet();

  const [scans, setScans] = useState<ScanFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ScanFile | null>(null);
  const [renameText, setRenameText] = useState('');

  useEffect(() => { loadScans(); }, []);

  const loadScans = async () => {
    try {
      setLoading(true);
      const allScans: ScanFile[] = [];
      const addFrom = (raw: string | null, fallbackName: string) => {
        if (!raw) return;
        const attachments = JSON.parse(raw);
        Object.entries(attachments).forEach(([id, files]: [string, any]) => {
          (files || []).forEach((file: any) => {
            allScans.push({ ...file, documentId: id, documentName: file.documentName || fallbackName, selected: false });
          });
        });
      };
      addFrom(await AsyncStorage.getItem('document_attachments'), 'Document');
      addFrom(await AsyncStorage.getItem('service_attachments'), 'Sea Service');
      setScans(allScans);
    } catch (error) {
      console.error('Error loading scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleScanSelection = (index: number) =>
    setScans(scans.map((scan, i) => (i === index ? { ...scan, selected: !scan.selected } : scan)));

  const getSelectedScans = () => scans.filter(scan => scan.selected);
  const selectedCount = getSelectedScans().length;
  const totalSize = getSelectedScans().reduce((sum, scan) => sum + scan.size, 0);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.ceil(Math.abs(today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('common.today');
    if (diffDays === 1) return t('common.yesterday');
    if (diffDays < 7) return `${diffDays} ${t('common.daysAgo')}`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Upload files → add to the standalone bucket. Images picked directly are
  // combined into one PDF; PDFs are stored as-is; a .zip (incl. archives made by
  // the mobile app) is unpacked and each contained file stored as-is.
  const handleAddFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/zip', 'application/x-zip-compressed', '.zip'],
        multiple: true,
        copyToCacheDirectory: false,
      });
      if (result.canceled || !result.assets?.length) return;

      setScanning(true);
      const images: ScanImage[] = [];
      const fileItems: { blob: Blob; name: string; size: number }[] = [];

      for (const a of result.assets) {
        const resp = await fetch(a.uri);
        const blob = await resp.blob();
        const isZip = (a.mimeType || '').includes('zip') || /\.zip$/i.test(a.name || '');
        const isImage = (a.mimeType || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(a.name || '');

        if (isZip) {
          // Unpack the archive: keep each file as-is under its original name.
          const zip = await JSZip.loadAsync(blob);
          const entries = Object.values(zip.files).filter((e: any) => !e.dir);
          for (const entry of entries as any[]) {
            const entryBlob = await entry.async('blob');
            fileItems.push({ blob: entryBlob, name: entry.name.split('/').pop() || entry.name, size: entryBlob.size });
          }
        } else if (isImage) {
          images.push(await readImageFile(blob));
        } else {
          fileItems.push({ blob, name: a.name || buildScanFileName(), size: a.size || blob.size });
        }
      }

      const bucketItems: any[] = [];
      if (images.length) {
        const f = await buildPdfFromImages('', images, buildScanFileName());
        if (f) bucketItems.push({ ...f, documentName: t('scans.title') });
      }
      for (const p of fileItems) {
        const f = await storeUploadedFile(p.blob, p.name, p.size);
        bucketItems.push({ ...f, documentName: t('scans.title') });
      }

      const stored = await AsyncStorage.getItem('document_attachments');
      const attachments = stored ? JSON.parse(stored) : {};
      if (!attachments[BUCKET]) attachments[BUCKET] = [];
      attachments[BUCKET].push(...bucketItems);
      await AsyncStorage.setItem('document_attachments', JSON.stringify(attachments));
      await loadScans();
    } catch (error) {
      console.error('Upload failed:', error);
      alertMsg(t('common.error'), t('scans.scanFailed'));
    } finally {
      setScanning(false);
    }
  };

  // Zip the selected attachments and trigger a browser download.
  const handleArchiveAndShare = async () => {
    const selectedScans = getSelectedScans();
    if (selectedScans.length === 0) { alertMsg(t('scans.noSelection'), t('scans.selectFilesFirst')); return; }
    try {
      setArchiving(true);
      const zip = new JSZip();
      for (const scan of selectedScans) {
        const blob = await getBlob(scan.uri);
        if (blob) zip.file(scan.fileName, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      if (typeof document !== 'undefined') {
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SDM_scans_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } catch (error) {
      console.error('Failed to archive:', error);
      alertMsg(t('common.error'), t('scans.shareFailed'));
    } finally {
      setArchiving(false);
    }
  };

  // Remove a scan reference from both attachment stores.
  const removeFromStores = async (uris: string[]) => {
    for (const key of ['document_attachments', 'service_attachments']) {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) continue;
      const att = JSON.parse(stored);
      let changed = false;
      for (const id of Object.keys(att)) {
        const before = att[id].length;
        att[id] = att[id].filter((f: any) => !uris.includes(f.uri));
        if (att[id].length !== before) changed = true;
        if (att[id].length === 0) delete att[id];
      }
      if (changed) await AsyncStorage.setItem(key, JSON.stringify(att));
    }
  };

  const handleDeleteSelected = () => {
    const selectedScans = getSelectedScans();
    if (selectedScans.length === 0) { alertMsg(t('scans.noSelection'), t('scans.selectFilesFirst')); return; }
    if (!confirmAsync(t('scans.deleteTitle'), `${t('scans.deleteMessage')} ${selectedScans.length} ${selectedScans.length > 1 ? 'files' : 'file'}?`)) return;
    (async () => {
      try {
        for (const scan of selectedScans) { await deleteBlob(scan.uri); }
        await removeFromStores(selectedScans.map(s => s.uri));
        await loadScans();
      } catch (error) {
        console.error('Failed to delete scans:', error);
        alertMsg(t('common.error'), t('scans.deleteFailed'));
      }
    })();
  };

  const openRename = (scan: ScanFile) => {
    setRenameText(scan.fileName.replace(/\.pdf$/i, ''));
    setRenameTarget(scan);
  };

  const renameInStores = async (oldUri: string, fileName: string) => {
    for (const key of ['document_attachments', 'service_attachments']) {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) continue;
      const att = JSON.parse(stored);
      let changed = false;
      for (const id of Object.keys(att)) {
        att[id] = att[id].map((f: any) => {
          if (f.uri === oldUri) { changed = true; return { ...f, fileName }; }
          return f;
        });
      }
      if (changed) await AsyncStorage.setItem(key, JSON.stringify(att));
    }
  };

  const confirmRename = async () => {
    if (!renameTarget) return;
    const clean = renameText.trim().replace(/[\/\\:*?"<>|]/g, '').replace(/\.pdf$/i, '');
    if (!clean) { setRenameTarget(null); return; }
    const newName = `${clean}.pdf`;
    try {
      await renameInStores(renameTarget.uri, newName);
      setRenameTarget(null);
      await loadScans();
    } catch (error) {
      console.error('Rename failed:', error);
      alertMsg(t('common.error'), t('scans.renameFailed'));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        <Image source={GHOST_SHARK_IMAGE} style={[styles.sharkBackground, { opacity: isDark ? 0.07 : 0.09 }]} resizeMode="cover" />

        <View style={[styles.headerRow, isTablet && styles.statsContainerTablet]}>
          <View style={[styles.statsContainer, isDark ? styles.statsDark : styles.statsLight]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, isDark ? styles.textLight : styles.textDark]}>{scans.length}</Text>
              <Text style={[styles.statLabel, isDark ? styles.textMuted : styles.textMutedLight]}>{t('scans.totalFiles')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#00ffff' }]}>{selectedCount}</Text>
              <Text style={[styles.statLabel, isDark ? styles.textMuted : styles.textMutedLight]}>{t('scans.selected')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, isDark ? styles.textLight : styles.textDark]}>{formatFileSize(totalSize)}</Text>
              <Text style={[styles.statLabel, isDark ? styles.textMuted : styles.textMutedLight]}>{t('scans.totalSize')}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }, scanning && styles.actionButtonDisabled]}
            onPress={handleAddFiles}
            disabled={scanning}
            activeOpacity={0.8}
          >
            {scanning ? (
              <ActivityIndicator size="small" color={isDark ? '#64b5f6' : '#1976d2'} />
            ) : (
              <Ionicons name="cloud-upload-outline" size={26} color={isDark ? '#64b5f6' : '#1976d2'} />
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={isDark ? '#64b5f6' : '#1976d2'} />
            <Text style={[styles.loadingText, isDark ? styles.textLight : styles.textDark]}>{t('scans.loading')}</Text>
          </View>
        ) : scans.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-upload-outline" size={64} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            <Text style={[styles.emptyText, isDark ? styles.textLight : styles.textDark]}>{t('scans.noScans')}</Text>
            <Text style={[styles.emptyHint, isDark ? styles.textMuted : styles.textMutedLight]}>{t('scans.addScansHint')}</Text>
          </View>
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={isTablet ? styles.listContentTablet : undefined}>
            <View style={isTablet ? styles.gridTablet : undefined}>
              {scans.map((scan, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.scanItem, isDark ? styles.scanItemDark : styles.scanItemLight, scan.selected && styles.scanItemSelected, isTablet && styles.scanItemTablet]}
                  onPress={() => toggleScanSelection(index)}
                  activeOpacity={0.7}
                >
                  <ToggleButton selected={scan.selected} onPress={() => toggleScanSelection(index)} isDark={isDark} />
                  <View style={styles.scanInfo}>
                    <Text style={[styles.scanFileName, isDark ? styles.textLight : styles.textDark]} numberOfLines={1}>{scan.fileName}</Text>
                    <Text style={[styles.scanDocument, isDark ? styles.textMuted : styles.textMutedLight]}>{scan.documentName}</Text>
                    <View style={styles.scanMeta}>
                      <Text style={[styles.scanMetaText, isDark ? styles.textMuted : styles.textMutedLight]}>{formatFileSize(scan.size)}</Text>
                      <Text style={[styles.scanMetaText, isDark ? styles.textMuted : styles.textMutedLight]}>•</Text>
                      <Text style={[styles.scanMetaText, isDark ? styles.textMuted : styles.textMutedLight]}>{formatDate(scan.uploadDate)}</Text>
                    </View>
                  </View>
                  <View style={styles.scanActions}>
                    <TouchableOpacity style={styles.scanActionBtn} onPress={() => openAttachment(scan.uri)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                      <Ionicons name="eye-outline" size={20} color={isDark ? '#90caf9' : '#1976d2'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.scanActionBtn} onPress={() => downloadAttachment(scan.uri, scan.fileName)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                      <Ionicons name="download-outline" size={20} color={isDark ? '#90caf9' : '#1976d2'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.scanActionBtn} onPress={() => openRename(scan)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                      <Ionicons name="create-outline" size={20} color={isDark ? '#90caf9' : '#1976d2'} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: 120 }} />
          </ScrollView>
        )}

        <View style={[styles.bottomBar, isDark ? styles.bottomBarDark : styles.bottomBarLight, isTablet && styles.bottomBarTablet]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton, selectedCount === 0 && styles.actionButtonDisabled]}
            onPress={handleDeleteSelected}
            disabled={selectedCount === 0}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>{t('common.delete')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.archiveButton, (selectedCount === 0 || archiving) && styles.actionButtonDisabled]}
            onPress={handleArchiveAndShare}
            disabled={selectedCount === 0 || archiving}
          >
            {archiving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="download-outline" size={20} color="#fff" />}
            <Text style={styles.actionButtonText}>{archiving ? t('scans.archiving') : t('scans.archiveAndSend')}</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={!!renameTarget} transparent animationType="fade" onRequestClose={() => setRenameTarget(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.renameOverlay}>
            <View style={[styles.renameBox, { backgroundColor: isDark ? '#10233b' : '#fff' }]}>
              <Text style={[styles.renameTitle, isDark ? styles.textLight : styles.textDark]}>{t('scans.renameTitle')}</Text>
              <View style={styles.renameInputRow}>
                <TextInput
                  style={[styles.renameInput, isDark ? styles.renameInputDark : styles.renameInputLight]}
                  value={renameText}
                  onChangeText={setRenameText}
                  placeholder={t('scans.renamePlaceholder')}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                  autoFocus
                  selectTextOnFocus
                  returnKeyType="done"
                  onSubmitEditing={confirmRename}
                />
                <Text style={[styles.renameExt, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>.pdf</Text>
              </View>
              <View style={styles.renameButtons}>
                <TouchableOpacity style={styles.renameBtn} onPress={() => setRenameTarget(null)}>
                  <Text style={[styles.renameBtnText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.renameBtn, styles.renameBtnSave]} onPress={confirmRename}>
                  <Text style={[styles.renameBtnText, { color: '#fff', fontWeight: '700' }]}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  sharkBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginTop: 10, marginBottom: 12 },
  addButton: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  statsContainer: { flex: 1, flexDirection: 'row', padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'space-around' },
  statsDark: { backgroundColor: 'rgba(255,255,255,0.08)' },
  statsLight: { backgroundColor: 'rgba(255,255,255,0.3)' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(128,128,128,0.3)' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  emptyHint: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  list: { flex: 1, paddingHorizontal: 16 },
  statsContainerTablet: { alignSelf: 'center', width: '100%', maxWidth: 700 },
  listContentTablet: { paddingBottom: 8 },
  gridTablet: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  scanItemTablet: { flex: 1, minWidth: 280, maxWidth: '48%', marginBottom: 0 },
  bottomBarTablet: { alignSelf: 'center', width: '100%', maxWidth: 700 },
  scanItem: { flexDirection: 'row', alignItems: 'center', height: 72, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginBottom: 8, gap: 12 },
  scanItemDark: { backgroundColor: 'rgba(255,255,255,0.08)' },
  scanItemLight: { backgroundColor: 'rgba(255,255,255,0.3)' },
  scanItemSelected: { borderWidth: 2, borderColor: '#00ffff' },
  toggleButtonActive: { shadowColor: '#00ffff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 8 },
  toggleButtonInactive: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  toggleInactiveDark: { backgroundColor: 'rgba(255,255,255,0.05)' },
  toggleInactiveLight: { backgroundColor: 'rgba(0,0,0,0.03)' },
  scanInfo: { flex: 1 },
  scanFileName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  scanDocument: { fontSize: 13, marginBottom: 2 },
  scanMeta: { flexDirection: 'row', gap: 6 },
  scanMetaText: { fontSize: 12 },
  scanActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scanActionBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  renameOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 28 },
  renameBox: { borderRadius: 16, padding: 20, maxWidth: 460, width: '100%', alignSelf: 'center' },
  renameTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  renameInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
  renameInput: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  renameInputDark: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' },
  renameInputLight: { backgroundColor: 'rgba(0,0,0,0.03)', borderColor: 'rgba(0,0,0,0.12)', color: '#1a1a1a' },
  renameExt: { fontSize: 14 },
  renameButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  renameBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  renameBtnSave: { backgroundColor: '#1976d2' },
  renameBtnText: { fontSize: 15 },
  bottomBar: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  bottomBarDark: { backgroundColor: 'rgba(255,255,255,0.05)', borderTopColor: 'rgba(255,255,255,0.1)' },
  bottomBarLight: { backgroundColor: 'rgba(255,255,255,0.3)', borderTopColor: 'rgba(0,0,0,0.1)' },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, gap: 8 },
  deleteButton: { backgroundColor: '#f44336' },
  archiveButton: { backgroundColor: '#1976d2' },
  actionButtonDisabled: { opacity: 0.4 },
  actionButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  textLight: { color: '#fff' },
  textDark: { color: '#333' },
  textMuted: { color: 'rgba(255,255,255,0.6)' },
  textMutedLight: { color: 'rgba(0,0,0,0.5)' },
});
