// screens/DocumentsScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, 
  Alert, Modal, ImageBackground, Platform, KeyboardAvoidingView, Animated
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useData, Document } from '../contexts/DataContext';
import SimpleDatePicker from '../components/SimpleDatePicker';
import { t } from '../utils/i18n';
import { useSubscription } from '../hooks/useSubscription';
import { useTablet } from '../hooks/useTablet'; // ← ДОБАВЛЕНО

const GHOST_SPERMWHALE_BG = require('../assets/images/ghost-spermwhale.png');

const CATEGORIES = [
  'Passport',
  "Seaman's Book",
  'Diplomas',
  'Medical Certificates',
  'STCW Certificates',
  'Offshore Certifications',
  'National Endorsements',
  'Other'
];

const getCategoryTranslation = (englishName: string): string => {
  const categoryMap: { [key: string]: string } = {
    'Passport': 'passport',
    "Seaman's Book": 'seamansBook',
    'Diplomas': 'diplomas',
    'Medical Certificates': 'medical',
    'STCW Certificates': 'stcw',
    'Offshore Certifications': 'offshore',
    'National Endorsements': 'national',
    'Other': 'other',
    'Uncategorized': 'uncategorized'
  };
  const key = categoryMap[englishName] || 'other';
  return t(`documents.categories.${key}`);
};

// Интерфейс для прикрепленных файлов
interface AttachedFile {
  fileName: string;
  uri: string;
  size: number;
  uploadDate: string;
}

interface DocumentsScreenProps {
  onOpenPaywall?: () => void;
}

// Компонент кнопки с glow-анимацией
const GlowButton: React.FC<{ onPress: () => void; isDark: boolean }> = ({ onPress, isDark }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[styles.glowButtonContainer, { opacity: glowOpacity }]}>
        <View style={styles.glowButton}>
          <Ionicons name="attach" size={24} color="#00ffff" />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const DocumentsScreen: React.FC<DocumentsScreenProps> = ({ onOpenPaywall }) => {
  const { isPremium } = useSubscription();
  const { state, addDocument, updateDocument, deleteDocument } = useData();
  const isTablet = useTablet(); // ← ДОБАВЛЕНО
  const insets = useSafeAreaInsets();

  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'type' | 'date'>('date');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [documentAttachments, setDocumentAttachments] = useState<{ [key: string]: AttachedFile[] }>({});
  const isDark = state.theme === 'dark';

  // Создание директории для хранения сканов
  const SCANS_DIR = `${FileSystem.documentDirectory}scans/`;

  useEffect(() => {
    initializeScansDirectory();
    loadDocumentAttachments();
  }, []);

  const initializeScansDirectory = async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(SCANS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(SCANS_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error('Failed to create scans directory:', error);
    }
  };

  const loadDocumentAttachments = async () => {
    try {
      const stored = await AsyncStorage.getItem('document_attachments');
      if (stored) {
        setDocumentAttachments(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  };

  const saveDocumentAttachments = async (attachments: { [key: string]: AttachedFile[] }) => {
    try {
      await AsyncStorage.setItem('document_attachments', JSON.stringify(attachments));
    } catch (error) {
      console.error('Failed to save attachments:', error);
    }
  };

  // Загружаем сохранённый режим сортировки при монтировании
  useEffect(() => {
    const loadSortMode = async () => {
      try {
        const savedSortMode = await AsyncStorage.getItem('documents_sort_mode');
        if (savedSortMode === 'type' || savedSortMode === 'date') {
          setSortMode(savedSortMode);
        }
      } catch (error) {
        console.log('Failed to load sort mode:', error);
      }
    };
    loadSortMode();
  }, []);

  // Сохраняем режим сортировки при изменении
  const handleSortModeChange = async () => {
    const newMode = sortMode === 'type' ? 'date' : 'type';
    setSortMode(newMode);
    try {
      await AsyncStorage.setItem('documents_sort_mode', newMode);
    } catch (error) {
      console.log('Failed to save sort mode:', error);
    }
  };

  const [formData, setFormData] = useState({
    category: '',
    name: '',
    number: '',
    issueDate: '',
    expiryDate: '',
    noExpiryDate: false,
    issuePlace: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      category: '',
      name: '',
      number: '',
      issueDate: '',
      expiryDate: '',
      noExpiryDate: false,
      issuePlace: '',
      notes: '',
    });
    setEditingDoc(null);
    setAttachedFiles([]);
    setIsViewMode(false);
  };

  const handleAdd = () => {
    if (!isPremium && state.documents.length >= 5) {
      if (onOpenPaywall) {
        onOpenPaywall();
      } else {
        Alert.alert(t('common.unlimitedOnly'), "Please upgrade to Unlimited to add more documents.");
      }
      return;
    }
    resetForm();
    setIsViewMode(false);
    setShowModal(true);
  };

  const handleView = (doc: Document) => {
    setEditingDoc(doc);
    setFormData({
      category: doc.category,
      name: doc.name,
      number: doc.number,
      issueDate: doc.issueDate,
      expiryDate: doc.expiryDate,
      noExpiryDate: doc.noExpiryDate || false,
      issuePlace: doc.issuePlace,
      notes: doc.notes,
    });
    // Загружаем прикрепленные файлы
    if (documentAttachments[doc.id]) {
      setAttachedFiles(documentAttachments[doc.id]);
    }
    setIsViewMode(true);
    setShowModal(true);
  };

  const handleEdit = (doc: Document) => {
    setEditingDoc(doc);
    setFormData({
      category: doc.category,
      name: doc.name,
      number: doc.number,
      issueDate: doc.issueDate,
      expiryDate: doc.expiryDate,
      noExpiryDate: doc.noExpiryDate || false,
      issuePlace: doc.issuePlace,
      notes: doc.notes,
    });
    // Загружаем прикрепленные файлы для редактируемого документа
    if (documentAttachments[doc.id]) {
      setAttachedFiles(documentAttachments[doc.id]);
    }
    setIsViewMode(false);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('documents.alerts.deleteTitle'), t('documents.alerts.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { 
        text: t('common.delete'), 
        style: 'destructive', 
        onPress: async () => {
          // Удаляем прикрепленные файлы
          if (documentAttachments[id]) {
            for (const file of documentAttachments[id]) {
              try {
                await FileSystem.deleteAsync(file.uri, { idempotent: true });
              } catch (error) {
                console.error('Failed to delete file:', error);
              }
            }
            const newAttachments = { ...documentAttachments };
            delete newAttachments[id];
            setDocumentAttachments(newAttachments);
            await saveDocumentAttachments(newAttachments);
          }
          deleteDocument(id);
        }
      },
    ]);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.category) {
      Alert.alert(t('common.error'), t('documents.alerts.requiredFields'));
      return;
    }
    
    const docId = editingDoc?.id || Date.now().toString();
    const docData = { id: docId, ...formData };
    
    // Сохраняем прикрепленные файлы
    if (attachedFiles.length > 0) {
      const newAttachments = { ...documentAttachments, [docId]: attachedFiles };
      setDocumentAttachments(newAttachments);
      await saveDocumentAttachments(newAttachments);
    }
    
    if (editingDoc) { 
      await updateDocument(docData); 
    } else { 
      await addDocument(docData); 
    }
    
    setShowModal(false);
    resetForm();
  };

  const handleAttachFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      
      // Проверка размера файла (3MB = 3 * 1024 * 1024 bytes)
      if (file.size && file.size > 3 * 1024 * 1024) {
        Alert.alert(
          t('common.error'), 
          'File size exceeds 3MB limit. Please choose a smaller file.'
        );
        return;
      }

      // Генерируем имя файла
      const timestamp = Date.now();
      const index = attachedFiles.length + 1;
      const fileName = `${formData.name || 'Document'}_${formData.expiryDate || 'NoExpiry'}_${index}.pdf`;
      const destinationUri = `${SCANS_DIR}${fileName}`;

      // Копируем файл в директорию приложения
      await FileSystem.copyAsync({
        from: file.uri,
        to: destinationUri,
      });

      const newFile: AttachedFile = {
        fileName,
        uri: destinationUri,
        size: file.size || 0,
        uploadDate: new Date().toISOString(),
      };

      setAttachedFiles([...attachedFiles, newFile]);
      
      Alert.alert('Success', `File "${file.name}" attached successfully`);
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert(t('common.error'), 'Failed to attach file. Please try again.');
    }
  };

  const getDaysUntilExpiry = (expiryDate: string): number => {
    if (!expiryDate) return 9999;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getExpiryColor = (days: number): string => {
    if (days < 60) return '#f44336';
    if (days <= 90) return '#ffc107';
    return '#4caf50';
  };

  const filteredDocs = state.documents.filter(doc => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      doc.name.toLowerCase().includes(query) ||
      doc.category.toLowerCase().includes(query) ||
      doc.number.toLowerCase().includes(query);
    const matchesCategory = selectedCategory === null || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedDocs = filteredDocs.reduce((acc, doc) => {
    const key = sortMode === 'type' ? doc.category : 'all';
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  if (sortMode === 'date') {
    groupedDocs.all?.sort((a, b) => {
      const daysA = getDaysUntilExpiry(a.expiryDate);
      const daysB = getDaysUntilExpiry(b.expiryDate);
      return daysA - daysB;
    });
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground 
        source={GHOST_SPERMWHALE_BG} 
        style={[styles.container, isDark ? styles.backgroundDark : styles.backgroundLight]} 
        imageStyle={[styles.whaleImage, { opacity: isDark ? 0.15 : 0.08, tintColor: isDark ? '#64b5f6' : '#2B7CC1' }]}
      >
        <View style={styles.categoryFilterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.categoryFilterContent, isTablet && styles.categoryFilterContentTablet]}
          >
            <TouchableOpacity
              style={[styles.categoryFilterChip, selectedCategory === null ? styles.categoryFilterChipActive : (isDark ? styles.categoryFilterChipDark : styles.categoryFilterChipLight)]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[styles.categoryFilterChipText, selectedCategory === null ? styles.categoryFilterChipTextActive : (isDark ? styles.textMuted : styles.textMutedLight)]}>
                {t('documents.categories.all')}
              </Text>
            </TouchableOpacity>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryFilterChip, selectedCategory === cat ? styles.categoryFilterChipActive : (isDark ? styles.categoryFilterChipDark : styles.categoryFilterChipLight)]}
                onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              >
                <Text style={[styles.categoryFilterChipText, selectedCategory === cat ? styles.categoryFilterChipTextActive : (isDark ? styles.textMuted : styles.textMutedLight)]}>
                  {getCategoryTranslation(cat)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={isTablet ? styles.searchRowTablet : styles.searchRow}>
          <View style={[styles.searchInputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}>
            <Ionicons name="search" size={20} color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'} style={styles.searchIcon} />
            <TextInput 
              style={[styles.searchInput, { color: isDark ? '#fff' : '#333' }]} 
              placeholder={t('documents.searchPlaceholder')} 
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
            />
          </View>
          <TouchableOpacity 
            style={[styles.sortToggleButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} 
            onPress={handleSortModeChange}
          >
            <Ionicons name={sortMode === 'type' ? 'list' : 'time'} size={22} color={isDark ? '#64b5f6' : '#1976d2'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} 
            onPress={handleAdd}
          >
            <Ionicons name="add" size={28} color={isDark ? '#64b5f6' : '#1976d2'} />
          </TouchableOpacity>
        </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={isTablet ? styles.listContentTablet : undefined}>
        {Object.keys(groupedDocs).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            <Text style={[styles.emptyText, isDark ? styles.textMuted : styles.textMutedLight]}>{t('documents.addDocument')}</Text>
          </View>
        ) : (
          Object.entries(groupedDocs).map(([category, docs]) => (
            <View key={category} style={styles.categoryGroup}>
              {sortMode === 'type' && <Text style={[styles.categoryHeader, isDark ? styles.textLight : styles.textDark]}>{getCategoryTranslation(category)}</Text>}
              <View style={isTablet ? styles.docsGridTablet : undefined}>
              {docs.map((doc) => {
                const days = getDaysUntilExpiry(doc.expiryDate);
                const hasAttachments = documentAttachments[doc.id] && documentAttachments[doc.id].length > 0;
                return (
                  <TouchableOpacity key={doc.id} style={[styles.card, isDark ? styles.cardDark : styles.cardLight, isTablet && styles.cardTablet]} onPress={() => handleView(doc)} activeOpacity={0.7}>
                    <View style={styles.cardRow}>
                      <View style={styles.cardTitleContainer}>
                        <Text style={[styles.cardTitle, isDark ? styles.textLight : styles.textDark]}>{doc.name}</Text>
                      </View>
                      <View style={styles.cardActions}>
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleEdit(doc); }} style={styles.iconButton}>
                          <Ionicons name="pencil" size={20} color="#1976d2" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDelete(doc.id); }} style={styles.iconButton}>
                          <Ionicons name="trash-outline" size={20} color="#f44336" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.cardSubRow}>
                      {hasAttachments && (
                        <Ionicons name="attach" size={16} color="#00ffff" style={{ marginRight: 4 }} />
                      )}
                      {!doc.noExpiryDate && doc.expiryDate && (
                        <View style={[styles.expiryBadgeCompact, { backgroundColor: getExpiryColor(days) }]}>
                          <Text style={styles.expiryTextCompact}>{days}d</Text>
                        </View>
                      )}
                      {doc.number && <Text style={[styles.cardSubText, isDark ? styles.textMuted : styles.textMutedLight]}>№ {doc.number}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={[styles.modalOverlay, { paddingTop: insets.top + 10 }]}>
            <View style={[styles.modalContent, isDark ? styles.modalDark : styles.modalLight, isTablet && styles.modalContentTablet]}>
              <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                <Text style={[styles.modalTitle, isDark ? styles.textLight : styles.textDark]}>
                  {isViewMode ? t('documents.viewDocument') : (editingDoc ? t('documents.editDocument') : t('documents.addDocument'))}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={isDark ? '#fff' : '#333'} />
                </TouchableOpacity>
              </View>
              <ScrollView 
                style={styles.modalForm} 
                showsVerticalScrollIndicator={false} 
                keyboardShouldPersistTaps="handled"
                bounces={false}
                contentContainerStyle={{ paddingBottom: 100 }}
              >
                {/* Форма добавления/редактирования */}
                <Text style={[styles.label, isDark ? styles.textMuted : styles.textMutedLight]}>{t('documents.form.category')}</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.categoryPicker}
                  nestedScrollEnabled={true}
                  directionalLockEnabled={true}
                  scrollEnabled={!isViewMode}
                >
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity 
                      key={`chip-${cat}`} 
                      style={[styles.categoryChip, formData.category === cat ? styles.categoryChipActive : (isDark ? styles.categoryChipInactiveDark : styles.categoryChipInactiveLight)]} 
                      onPress={() => !isViewMode && setFormData({ ...formData, category: cat })}
                      disabled={isViewMode}
                    >
                      <Text style={[styles.categoryChipText, formData.category === cat ? styles.categoryChipTextActive : (isDark ? styles.textMuted : styles.textMutedLight)]}>{getCategoryTranslation(cat)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <Text style={[styles.label, isDark ? styles.textMuted : styles.textMutedLight]}>{t('documents.form.documentName')}</Text>
                <TextInput 
                  style={[styles.input, isDark ? styles.inputDark : styles.inputLight]} 
                  value={formData.name} 
                  onChangeText={(text) => setFormData({ ...formData, name: text })} 
                  placeholder={t('documents.form.namePlaceholder')} 
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} 
                  editable={!isViewMode}
                />
                
                <Text style={[styles.label, isDark ? styles.textMuted : styles.textMutedLight]}>{t('documents.form.documentNumber')}</Text>
                <TextInput 
                  style={[styles.input, isDark ? styles.inputDark : styles.inputLight]} 
                  value={formData.number} 
                  onChangeText={(text) => setFormData({ ...formData, number: text })} 
                  placeholder={t('documents.form.numberPlaceholder')} 
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} 
                  editable={!isViewMode}
                />
                
                <SimpleDatePicker
                  label={t('documents.form.issueDate')} 
                  value={formData.issueDate} 
                  onChange={(date) => {
                    if (!isViewMode) {
                      const issueDate = new Date(date);
                      const expiryDate = new Date(issueDate);
                      expiryDate.setFullYear(expiryDate.getFullYear() + 5);
                      const expiryDateString = expiryDate.toISOString().split('T')[0];
                      setFormData({ ...formData, issueDate: date, expiryDate: formData.noExpiryDate ? '' : expiryDateString });
                    }
                  }} 
                  isDark={isDark}
                  disabled={isViewMode}
                />

                <View style={styles.checkboxContainer}>
                  <TouchableOpacity 
                    style={styles.checkboxRow} 
                    onPress={() => !isViewMode && setFormData({ ...formData, noExpiryDate: !formData.noExpiryDate })} 
                    activeOpacity={0.7}
                    disabled={isViewMode}
                  >
                    <View style={[styles.checkbox, isDark ? styles.checkboxDark : styles.checkboxLight]}>{formData.noExpiryDate && <Ionicons name="checkmark" size={16} color="#1976d2" />}</View>
                    <Text style={[styles.checkboxLabel, isDark ? styles.textLight : styles.textDark]}>{t('documents.form.noExpiryDate')}</Text>
                  </TouchableOpacity>
                </View>

                {!formData.noExpiryDate && (
                  <SimpleDatePicker 
                    label={t('documents.form.expiryDate')} 
                    value={formData.expiryDate} 
                    onChange={(date) => !isViewMode && setFormData({ ...formData, expiryDate: date })} 
                    isDark={isDark}
                    disabled={isViewMode}
                  />
                )}

                <Text style={[styles.label, isDark ? styles.textMuted : styles.textMutedLight]}>{t('documents.form.issuePlace')}</Text>
                <TextInput 
                  style={[styles.input, isDark ? styles.inputDark : styles.inputLight]} 
                  value={formData.issuePlace} 
                  onChangeText={(text) => setFormData({ ...formData, issuePlace: text })} 
                  placeholder={t('documents.form.issuePlaceholder')} 
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} 
                  editable={!isViewMode}
                />
                
                <Text style={[styles.label, isDark ? styles.textMuted : styles.textMutedLight]}>{t('navigation.notes')}</Text>
                <TextInput 
                  style={[styles.input, styles.textArea, isDark ? styles.inputDark : styles.inputLight]} 
                  value={formData.notes} 
                  onChangeText={(text) => setFormData({ ...formData, notes: text })} 
                  placeholder={t('documents.form.additionalNotesPlaceholder')} 
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} 
                  multiline 
                  numberOfLines={4} 
                  editable={!isViewMode}
                />
                
                {/* Отображение прикрепленных файлов */}
                {attachedFiles.length > 0 && (
                  <View style={styles.attachedFilesContainer}>
                    <Text style={[styles.label, isDark ? styles.textMuted : styles.textMutedLight]}>
                      Attached Files ({attachedFiles.length})
                    </Text>
                    {attachedFiles.map((file, index) => (
                      <View key={index} style={[styles.fileItem, isDark ? styles.fileItemDark : styles.fileItemLight]}>
                        <Ionicons name="document-attach" size={20} color="#00ffff" />
                        <Text style={[styles.fileName, isDark ? styles.textLight : styles.textDark]} numberOfLines={1}>
                          {file.fileName}
                        </Text>
                        <Text style={[styles.fileSize, isDark ? styles.textMuted : styles.textMutedLight]}>
                          {(file.size / 1024).toFixed(1)} KB
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.modalButtons}>
                  {!isViewMode && <GlowButton onPress={handleAttachFile} isDark={isDark} />}
                  
                  <TouchableOpacity 
                    style={[styles.button, styles.buttonSecondary]} 
                    onPress={() => setShowModal(false)}
                  >
                    <Text style={styles.buttonSecondaryText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  
                  {isViewMode ? (
                    <TouchableOpacity 
                      style={[styles.button, styles.buttonPrimary]} 
                      onPress={() => setIsViewMode(false)}
                    >
                      <Text style={styles.buttonPrimaryText}>{t('common.edit')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.button, styles.buttonPrimary]} 
                      onPress={handleSave}
                    >
                      <Text style={styles.buttonPrimaryText}>{t('common.save')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  whaleImage: { 
    resizeMode: 'contain', 
    width: '100%', 
    height: '100%', 
    position: 'absolute', 
    right: -10, 
    bottom: -100 
  },
  backgroundDark: { backgroundColor: 'transparent' },
  backgroundLight: { backgroundColor: 'transparent' },
  categoryFilterRow: { height: 40, marginTop: 8, marginBottom: 2, overflow: 'hidden' },
  categoryFilterContent: { paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center', height: 40 },
  categoryFilterContentTablet: { paddingHorizontal: 24 },
  categoryFilterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  categoryFilterChipActive: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  categoryFilterChipDark: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' },
  categoryFilterChipLight: { backgroundColor: 'rgba(255,255,255,0.5)', borderColor: 'rgba(0,0,0,0.1)' },
  categoryFilterChipText: { fontSize: 13 },
  categoryFilterChipTextActive: { color: '#fff', fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, marginBottom: 8, gap: 8 },
  // ↓ НОВЫЕ СТИЛИ iPad
  searchRowTablet: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 8, gap: 8, alignSelf: 'center', width: '100%', maxWidth: 800, paddingHorizontal: 24 },
  listContentTablet: { alignItems: 'center' },
  docsGridTablet: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardTablet: { flex: 1, minWidth: 280, maxWidth: '48%', marginBottom: 0 },
  modalContentTablet: { maxWidth: 680 },
  // ↑ КОНЕЦ НОВЫХ СТИЛЕЙ
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 8, borderWidth: 1, height: 46 },
  addButton: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  sortToggleButton: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  searchIcon: { marginHorizontal: 8 },
  searchInput: { flex: 1, paddingVertical: 6, fontSize: 16 },
  categoryGroup: { marginBottom: 20 },
  categoryHeader: { fontSize: 16, fontWeight: '700', marginBottom: 8, paddingHorizontal: 4 },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 4 },
  card: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  cardDark: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  cardLight: { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardSubRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  cardSubText: { fontSize: 12 },
  cardTitleContainer: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  cardActions: { flexDirection: 'row', gap: 8 },
  iconButton: { padding: 2 },
  expiryBadgeCompact: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, minWidth: 36, alignItems: 'center' },
  expiryTextCompact: { fontSize: 11, fontWeight: '700', color: '#fff' },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, marginTop: 16 },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'flex-start', 
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: { 
    borderRadius: 20, 
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalDark: { backgroundColor: '#1a2a4a' },
  modalLight: { backgroundColor: '#fff' },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: '600' },
  modalForm: { paddingHorizontal: 20, paddingTop: 10 },
  closeBtn: { padding: 4 },
  label: { fontSize: 13, marginBottom: 8, marginTop: 12 },
  input: { borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1 },
  inputDark: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' },
  inputLight: { backgroundColor: '#f9f9f9', borderColor: 'rgba(0,0,0,0.1)', color: '#333' },
  textArea: { height: 100, textAlignVertical: 'top' },
  categoryPicker: { marginBottom: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  categoryChipActive: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  categoryChipInactiveDark: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.2)' },
  categoryChipInactiveLight: { backgroundColor: 'transparent', borderColor: 'rgba(0,0,0,0.1)' },
  categoryChipText: { fontSize: 13 },
  categoryChipTextActive: { color: '#fff', fontWeight: '600' },
  modalButtons: { 
    flexDirection: 'row', 
    gap: 8, 
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: { 
    flex: 1,
    padding: 5, 
    borderRadius: 12, 
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    minWidth: 80,
  },
  buttonPrimary: { backgroundColor: '#1976d2' },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#1976d2' },
  buttonPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonSecondaryText: { color: '#1976d2', fontSize: 16, fontWeight: '600' },
  checkboxContainer: { marginVertical: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#1976d2', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxDark: { backgroundColor: 'transparent' },
  checkboxLight: { backgroundColor: 'transparent' },
  checkboxLabel: { fontSize: 15, fontWeight: '500' },
  textLight: { color: '#fff' },
  textDark: { color: '#333' },
  textMuted: { color: 'rgba(255, 255, 255, 0.6)' },
  textMutedLight: { color: 'rgba(0, 0, 0, 0.5)' },
  
  // Стили для кнопки скрепки с glow-эффектом
  glowButtonContainer: {
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  glowButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: '#00ffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Стили для отображения прикрепленных файлов
  attachedFilesContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  fileItemDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  fileItemLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 12,
  },
});