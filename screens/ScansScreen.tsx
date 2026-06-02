// screens/ScansScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
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
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import JSZip from 'jszip';
import Pdf from 'react-native-pdf';
import { captureScanImage, buildPdfFromImages, ScanImage } from '../utils/scanUtils';
import { useData } from '../contexts/DataContext';
import { t } from '../utils/i18n';
import { useTablet } from '../hooks/useTablet'; // ← ДОБАВЛЕНО

const GHOST_SHARK_IMAGE = require('../assets/images/ghost-shark.png');

// Интерфейс для файла скана
interface ScanFile {
  fileName: string;
  uri: string;
  size: number;
  uploadDate: string;
  documentId: string;
  documentName: string;
  selected: boolean;
}

// Компонент кнопки включения в архив с glow-анимацией
const ToggleButton: React.FC<{ 
  selected: boolean; 
  onPress: () => void; 
  isDark: boolean 
}> = ({ selected, onPress, isDark }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selected) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      glowAnim.setValue(0);
    }
  }, [selected]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

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
  const isTablet = useTablet(); // ← ДОБАВЛЕНО
  
  const [scans, setScans] = useState<ScanFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ScanFile | null>(null);
  const [renameText, setRenameText] = useState('');
  const [previewFile, setPreviewFile] = useState<ScanFile | null>(null);

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    try {
      setLoading(true);
      const allScans: ScanFile[] = [];

      // Загружаем вложения документов
      const storedAttachments = await AsyncStorage.getItem('document_attachments');
      if (storedAttachments) {
        const attachments = JSON.parse(storedAttachments);
        Object.entries(attachments).forEach(([docId, files]: [string, any]) => {
          files.forEach((file: any) => {
            allScans.push({
              ...file,
              documentId: docId,
              documentName: file.documentName || 'Document',
              selected: false,
            });
          });
        });
      }

      // Загружаем вложения Sea Service
      const serviceAttachments = await AsyncStorage.getItem('service_attachments');
      if (serviceAttachments) {
        const attachments = JSON.parse(serviceAttachments);
        Object.entries(attachments).forEach(([serviceId, files]: [string, any]) => {
          files.forEach((file: any) => {
            allScans.push({
              ...file,
              documentId: serviceId,
              documentName: file.documentName || 'Sea Service',
              selected: false,
            });
          });
        });
      }

      setScans(allScans);
    } catch (error) {
      console.error('Error loading scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleScanSelection = (index: number) => {
    setScans(scans.map((scan, i) => 
      i === index ? { ...scan, selected: !scan.selected } : scan
    ));
  };

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
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('common.today');
    if (diffDays === 1) return t('common.yesterday');
    if (diffDays < 7) return `${diffDays} ${t('common.daysAgo')}`;
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handleArchiveAndShare = async () => {
    const selectedScans = getSelectedScans();
    
    if (selectedScans.length === 0) {
      Alert.alert(t('scans.noSelection'), t('scans.selectFilesFirst'));
      return;
    }

    try {
      setArchiving(true);
      
      const zip = new JSZip();
      
      for (const scan of selectedScans) {
        try {
          const fileContent = await FileSystem.readAsStringAsync(scan.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          zip.file(scan.fileName, fileContent, { base64: true });
        } catch (error) {
          console.error(`Failed to add ${scan.fileName}:`, error);
        }
      }

      const zipContent = await zip.generateAsync({ 
        type: 'base64',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const zipPath = `${FileSystem.cacheDirectory}scans_${Date.now()}.zip`;
      await FileSystem.writeAsStringAsync(zipPath, zipContent, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (Platform.OS === 'android') {
        await Sharing.shareAsync(zipPath, {
          mimeType: 'application/zip',
          dialogTitle: t('scans.archiveAndSend'),
        });
      } else {
        await Sharing.shareAsync(zipPath);
      }

      if (Platform.OS === 'ios') {
        setTimeout(async () => {
          try {
            await FileSystem.deleteAsync(zipPath, { idempotent: true });
          } catch (err) {
            console.log('Failed to delete temp ZIP:', err);
          }
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to share:', error);
      Alert.alert(t('common.error'), t('scans.shareFailed'));
    } finally {
      setArchiving(false);
    }
  };

  const handleDeleteSelected = () => {
    const selectedScans = getSelectedScans();
    
    if (selectedScans.length === 0) {
      Alert.alert(t('scans.noSelection'), t('scans.selectFilesFirst'));
      return;
    }

    Alert.alert(
      t('scans.deleteTitle'),
      `${t('scans.deleteMessage')} ${selectedScans.length} ${selectedScans.length > 1 ? 'files' : 'file'}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              for (const scan of selectedScans) {
                await FileSystem.deleteAsync(scan.uri, { idempotent: true });
              }

              const storedAttachments = await AsyncStorage.getItem('document_attachments');
              if (storedAttachments) {
                const attachments = JSON.parse(storedAttachments);
                
                for (const scan of selectedScans) {
                  if (attachments[scan.documentId]) {
                    attachments[scan.documentId] = attachments[scan.documentId].filter(
                      (file: any) => file.uri !== scan.uri
                    );
                    
                    if (attachments[scan.documentId].length === 0) {
                      delete attachments[scan.documentId];
                    }
                  }
                }
                
                await AsyncStorage.setItem('document_attachments', JSON.stringify(attachments));
              }

              const serviceAttachments = await AsyncStorage.getItem('service_attachments');
              if (serviceAttachments) {
                const attachments = JSON.parse(serviceAttachments);
                
                for (const scan of selectedScans) {
                  if (attachments[scan.documentId]) {
                    attachments[scan.documentId] = attachments[scan.documentId].filter(
                      (file: any) => file.uri !== scan.uri
                    );
                    
                    if (attachments[scan.documentId].length === 0) {
                      delete attachments[scan.documentId];
                    }
                  }
                }
                
                await AsyncStorage.setItem('service_attachments', JSON.stringify(attachments));
              }

              await loadScans();
              Alert.alert(t('common.success'), t('scans.deleteSuccess'));
            } catch (error) {
              console.error('Failed to delete scans:', error);
              Alert.alert(t('common.error'), t('scans.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  // Имя файла: SDM_scan_DDMMYYYY_HHMM.pdf
  const buildScanFileName = (): string => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `SDM_scan_${p(d.getDate())}${p(d.getMonth() + 1)}${d.getFullYear()}_${p(d.getHours())}${p(d.getMinutes())}.pdf`;
  };

  // Спросить: добавить ещё страницу или сохранить готовый PDF
  const confirmAddPage = (count: number): Promise<boolean> =>
    new Promise((resolve) => {
      Alert.alert(
        t('scans.addPageTitle'),
        `${t('scans.pagesSoFar')}: ${count}`,
        [
          { text: t('scans.savePdf'), style: 'cancel', onPress: () => resolve(false) },
          { text: t('scans.addPage'), onPress: () => resolve(true) },
        ],
        { cancelable: false }
      );
    });

  // Снять документ камерой (одна или несколько страниц) → один PDF
  const handleCameraScan = async () => {
    try {
      const first = await captureScanImage();
      if (!first) return;

      const images: ScanImage[] = [first];
      let addMore = await confirmAddPage(images.length);
      while (addMore) {
        const next = await captureScanImage();
        if (next) images.push(next);
        addMore = next ? await confirmAddPage(images.length) : false;
      }

      setScanning(true);
      const fileName = buildScanFileName();
      const f = await buildPdfFromImages(FileSystem.documentDirectory as string, images, fileName);
      if (!f) return;

      // Сохраняем в общий список сканов (корзина standalone_scans)
      const stored = await AsyncStorage.getItem('document_attachments');
      const attachments = stored ? JSON.parse(stored) : {};
      const BUCKET = 'standalone_scans';
      if (!attachments[BUCKET]) attachments[BUCKET] = [];
      attachments[BUCKET].push({
        fileName: f.fileName,
        uri: f.uri,
        size: f.size,
        uploadDate: f.uploadDate,
        documentName: t('scans.cameraScan'),
      });
      await AsyncStorage.setItem('document_attachments', JSON.stringify(attachments));

      await loadScans();
      const pagesWord = images.length > 1 ? t('scans.pages') : t('scans.pageOne');
      Alert.alert(t('common.success'), `${t('scans.scanCreated')}\n${f.fileName} — ${images.length} ${pagesWord}`);
    } catch (error: any) {
      if (error?.message === 'camera-permission-denied') {
        Alert.alert(t('common.error'), t('scans.cameraPermissionDenied'));
      } else {
        console.error('Camera scan failed:', error);
        Alert.alert(t('common.error'), t('scans.scanFailed'));
      }
    } finally {
      setScanning(false);
    }
  };

  // Предпросмотр PDF прямо в приложении (модалка)
  const previewScan = (scan: ScanFile) => setPreviewFile(scan);

  // Открыть/поделиться во внешнем приложении
  const shareScan = async (scan: ScanFile) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(scan.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: scan.fileName,
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const openRename = (scan: ScanFile) => {
    setRenameText(scan.fileName.replace(/\.pdf$/i, ''));
    setRenameTarget(scan);
  };

  // Обновить запись скана (uri+имя) в обоих хранилищах вложений
  const updateScanInStores = async (oldUri: string, fileName: string, uri: string) => {
    for (const key of ['document_attachments', 'service_attachments']) {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) continue;
      const att = JSON.parse(stored);
      let changed = false;
      for (const id of Object.keys(att)) {
        att[id] = att[id].map((f: any) => {
          if (f.uri === oldUri) { changed = true; return { ...f, fileName, uri }; }
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
    const dir = renameTarget.uri.substring(0, renameTarget.uri.lastIndexOf('/') + 1);
    const newUri = `${dir}${newName}`;
    try {
      if (newUri !== renameTarget.uri) {
        const exists = await FileSystem.getInfoAsync(newUri);
        if (exists.exists) { Alert.alert(t('common.error'), t('scans.renameExists')); return; }
        await FileSystem.moveAsync({ from: renameTarget.uri, to: newUri });
        await updateScanInStores(renameTarget.uri, newName, newUri);
      }
      setRenameTarget(null);
      await loadScans();
    } catch (error) {
      console.error('Rename failed:', error);
      Alert.alert(t('common.error'), t('scans.renameFailed'));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        {/* Ghost Shark Background */}
        <Image
          source={GHOST_SHARK_IMAGE}
          style={[
            styles.sharkBackground,
            {
              opacity: isDark ? 0.07 : 0.09,
            }
          ]}
          resizeMode="cover"
        />

        {/* Шапка: счётчик + кнопка скана (стиль как в Sea Service) */}
        <View style={[styles.headerRow, isTablet && styles.statsContainerTablet]}>
        <View style={[styles.statsContainer, isDark ? styles.statsDark : styles.statsLight]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, isDark ? styles.textLight : styles.textDark]}>
              {scans.length}
            </Text>
            <Text style={[styles.statLabel, isDark ? styles.textMuted : styles.textMutedLight]}>
              {t('scans.totalFiles')}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#00ffff' }]}>
              {selectedCount}
            </Text>
            <Text style={[styles.statLabel, isDark ? styles.textMuted : styles.textMutedLight]}>
              {t('scans.selected')}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, isDark ? styles.textLight : styles.textDark]}>
              {formatFileSize(totalSize)}
            </Text>
            <Text style={[styles.statLabel, isDark ? styles.textMuted : styles.textMutedLight]}>
              {t('scans.totalSize')}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }, scanning && styles.actionButtonDisabled]}
          onPress={handleCameraScan}
          disabled={scanning}
          activeOpacity={0.8}
        >
          {scanning ? (
            <ActivityIndicator size="small" color={isDark ? '#64b5f6' : '#1976d2'} />
          ) : (
            <Ionicons name="add" size={28} color={isDark ? '#64b5f6' : '#1976d2'} />
          )}
        </TouchableOpacity>
        </View>

        {/* Список сканов */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={isDark ? '#64b5f6' : '#1976d2'} />
            <Text style={[styles.loadingText, isDark ? styles.textLight : styles.textDark]}>
              {t('scans.loading')}
            </Text>
          </View>
        ) : scans.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            <Text style={[styles.emptyText, isDark ? styles.textLight : styles.textDark]}>
              {t('scans.noScans')}
            </Text>
            <Text style={[styles.emptyHint, isDark ? styles.textMuted : styles.textMutedLight]}>
              {t('scans.addScansHint')}
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={isTablet ? styles.listContentTablet : undefined}>
            <View style={isTablet ? styles.gridTablet : undefined}>
            {scans.map((scan, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.scanItem,
                  isDark ? styles.scanItemDark : styles.scanItemLight,
                  scan.selected && styles.scanItemSelected,
                  isTablet && styles.scanItemTablet,
                ]}
                onPress={() => toggleScanSelection(index)}
                activeOpacity={0.7}
              >
                <ToggleButton
                  selected={scan.selected}
                  onPress={() => toggleScanSelection(index)}
                  isDark={isDark}
                />
                <View style={styles.scanInfo}>
                  <Text 
                    style={[styles.scanFileName, isDark ? styles.textLight : styles.textDark]} 
                    numberOfLines={1}
                  >
                    {scan.fileName}
                  </Text>
                  <Text style={[styles.scanDocument, isDark ? styles.textMuted : styles.textMutedLight]}>
                    {scan.documentName}
                  </Text>
                  <View style={styles.scanMeta}>
                    <Text style={[styles.scanMetaText, isDark ? styles.textMuted : styles.textMutedLight]}>
                      {formatFileSize(scan.size)}
                    </Text>
                    <Text style={[styles.scanMetaText, isDark ? styles.textMuted : styles.textMutedLight]}>
                      •
                    </Text>
                    <Text style={[styles.scanMetaText, isDark ? styles.textMuted : styles.textMutedLight]}>
                      {formatDate(scan.uploadDate)}
                    </Text>
                  </View>
                </View>
                <View style={styles.scanActions}>
                  <TouchableOpacity
                    style={styles.scanActionBtn}
                    onPress={() => previewScan(scan)}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <Ionicons name="eye-outline" size={20} color={isDark ? '#90caf9' : '#1976d2'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.scanActionBtn}
                    onPress={() => openRename(scan)}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <Ionicons name="create-outline" size={20} color={isDark ? '#90caf9' : '#1976d2'} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
            </View>
            <View style={{ height: 120 }} />
          </ScrollView>
        )}

        {/* Нижняя панель действий */}
        <View style={[styles.bottomBar, isDark ? styles.bottomBarDark : styles.bottomBarLight, isTablet && styles.bottomBarTablet]}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.deleteButton,
              selectedCount === 0 && styles.actionButtonDisabled,
            ]}
            onPress={handleDeleteSelected}
            disabled={selectedCount === 0}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>{t('common.delete')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.archiveButton,
              (selectedCount === 0 || archiving) && styles.actionButtonDisabled,
            ]}
            onPress={handleArchiveAndShare}
            disabled={selectedCount === 0 || archiving}
          >
            {archiving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="share-outline" size={20} color="#fff" />
            )}
            <Text style={styles.actionButtonText}>
              {archiving ? t('scans.archiving') : t('scans.archiveAndSend')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Переименование скана */}
        <Modal visible={!!renameTarget} transparent animationType="fade" onRequestClose={() => setRenameTarget(null)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.renameOverlay}
          >
            <View style={[styles.renameBox, { backgroundColor: isDark ? '#10233b' : '#fff' }]}>
              <Text style={[styles.renameTitle, isDark ? styles.textLight : styles.textDark]}>
                {t('scans.renameTitle')}
              </Text>
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
                  <Text style={[styles.renameBtnText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.renameBtn, styles.renameBtnSave]} onPress={confirmRename}>
                  <Text style={[styles.renameBtnText, { color: '#fff', fontWeight: '700' }]}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Предпросмотр PDF прямо в приложении */}
        <Modal visible={!!previewFile} animationType="slide" onRequestClose={() => setPreviewFile(null)}>
          <SafeAreaView style={[styles.previewContainer, { backgroundColor: isDark ? '#0a1628' : '#fff' }]}>
            <View style={[styles.previewHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]}>
              <TouchableOpacity onPress={() => setPreviewFile(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={26} color={isDark ? '#fff' : '#1a1a1a'} />
              </TouchableOpacity>
              <Text numberOfLines={1} style={[styles.previewTitle, isDark ? styles.textLight : styles.textDark]}>
                {previewFile?.fileName}
              </Text>
              <TouchableOpacity onPress={() => previewFile && shareScan(previewFile)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="share-outline" size={24} color={isDark ? '#90caf9' : '#1976d2'} />
              </TouchableOpacity>
            </View>
            {previewFile && (
              <Pdf
                source={{ uri: previewFile.uri }}
                style={styles.pdf}
                onError={(error) => { console.log('PDF preview error:', error); }}
              />
            )}
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sharkBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 12,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statsDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statsLight: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // ↓ НОВЫЕ СТИЛИ iPad
  statsContainerTablet: { alignSelf: 'center', width: '100%', maxWidth: 700 },
  listContentTablet: { paddingBottom: 8 },
  gridTablet: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  scanItemTablet: { flex: 1, minWidth: 280, maxWidth: '48%', marginBottom: 0 },
  bottomBarTablet: { alignSelf: 'center', width: '100%', maxWidth: 700 },
  // ↑ КОНЕЦ НОВЫХ СТИЛЕЙ
  scanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  scanItemDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  scanItemLight: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  scanItemSelected: {
    borderWidth: 2,
    borderColor: '#00ffff',
  },
  toggleButtonActive: {
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  toggleButtonInactive: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleInactiveDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  toggleInactiveLight: {
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  scanInfo: {
    flex: 1,
  },
  scanFileName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  scanDocument: {
    fontSize: 13,
    marginBottom: 2,
  },
  scanMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  scanMetaText: {
    fontSize: 12,
  },
  scanActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scanActionBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  renameBox: {
    borderRadius: 16,
    padding: 20,
  },
  renameTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  renameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
  },
  renameInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  renameInputDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.15)',
    color: '#fff',
  },
  renameInputLight: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderColor: 'rgba(0,0,0,0.12)',
    color: '#1a1a1a',
  },
  renameExt: {
    fontSize: 14,
  },
  renameButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  renameBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  renameBtnSave: {
    backgroundColor: '#1976d2',
  },
  renameBtnText: {
    fontSize: 15,
  },
  previewContainer: {
    flex: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  previewTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  pdf: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  bottomBarDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  bottomBarLight: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    gap: 8,
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  archiveButton: {
    backgroundColor: '#1976d2',
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  textLight: {
    color: '#fff',
  },
  textDark: {
    color: '#333',
  },
  textMuted: {
    color: 'rgba(255,255,255,0.6)',
  },
  textMutedLight: {
    color: 'rgba(0,0,0,0.5)',
  },
});