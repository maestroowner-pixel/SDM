import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Image, Platform, KeyboardAvoidingView, Animated,
} from 'react-native';
import { FormModal } from '../components/FormModal';
import { FormInput } from '../components/FormInput';
import { FormSelect } from '../components/FormSelect';
import { Button } from '../components/Button';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useData, SeaService } from '../contexts/DataContext';
import SimpleDatePicker from '../components/SimpleDatePicker';
import { VesselTypeInput, VESSEL_TYPES } from '../components/VesselTypeInput';

const getVesselTypeLabel = (value: string): string => {
  const found = VESSEL_TYPES.find(t => t.value === value);
  return found ? found.label : value;
};
import { t } from '../utils/i18n';
import { useTablet } from '../hooks/useTablet'; // ← ДОБАВЛЕНО
import { useSubscription } from '../hooks/useSubscription';
import * as DocumentPicker from 'expo-document-picker';
import { storeUploadedFile } from '../utils/scanUtils';
import { deleteBlob, openAttachment } from '../utils/attachmentStore';
import { alertMsg, confirmAsync } from '../utils/webAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PositionInput } from '../components/PositionInput';

const GHOST_SHIP_IMAGE = require('../assets/images/ghost-ship.png');

interface AttachedFile {
  fileName: string;
  uri: string;
  size: number;
  uploadDate: string;
}

// Компонент кнопки с glow-анимацией
const GlowButton: React.FC<{ onPress: () => void; isDark: boolean }> = ({ onPress, isDark }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
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

const FREE_LIMIT = 6;

interface SeaServiceScreenProps {
  onOpenPaywall?: () => void;
}

export const SeaServiceScreen: React.FC<SeaServiceScreenProps> = ({ onOpenPaywall }) => {
  const { state, addSeaService, updateSeaServiceItem, deleteSeaService } = useData();
  const { isPremium } = useSubscription();

  // Free tier: first FREE_LIMIT records (by insertion order) accessible; extras
  // brought in by cloud sync stay visible but locked (tap → paywall).
  const accessibleIds = React.useMemo(
    () => (isPremium ? null : new Set(state.seaService.slice(0, FREE_LIMIT).map(s => s.id))),
    [isPremium, state.seaService]
  );
  const isLocked = (id: string) => (accessibleIds ? !accessibleIds.has(id) : false);
  const [showModal, setShowModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [editingService, setEditingService] = useState<SeaService | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [serviceAttachments, setServiceAttachments] = useState<{ [key: string]: AttachedFile[] }>({});
  const isDark = state.theme === 'dark';
  const isTablet = useTablet(); // ← ДОБАВЛЕНО
  const insets = useSafeAreaInsets();

  // Web: attachments live in IndexedDB (attachmentStore); no filesystem dir.
  const SCANS_DIR = '';

  useEffect(() => {
    loadServiceAttachments();
  }, []);

  const loadServiceAttachments = async () => {
    try {
      const stored = await AsyncStorage.getItem('service_attachments');
      if (stored) {
        setServiceAttachments(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  };

  const saveServiceAttachments = async (attachments: { [key: string]: AttachedFile[] }) => {
    try {
      await AsyncStorage.setItem('service_attachments', JSON.stringify(attachments));
    } catch (error) {
      console.error('Failed to save attachments:', error);
    }
  };

  const sortedSeaService = [...state.seaService].sort((a, b) => {
    const timeA = a.signOff ? new Date(a.signOff).getTime() : 0;
    const timeB = b.signOff ? new Date(b.signOff).getTime() : 0;
    if (timeA === 0 && timeB === 0) {
      const signOnA = a.signOn ? new Date(a.signOn).getTime() : 0;
      const signOnB = b.signOn ? new Date(b.signOn).getTime() : 0;
      return signOnB - signOnA;
    }
    if (timeA === 0) return -1;
    if (timeB === 0) return 1;
    return timeB - timeA;
  });

  const [formData, setFormData] = useState({
    vesselName: '', vesselType: '', customVesselType: '', flag: '', grossTonnage: '',
    engineType: '', enginePower: '', position: '', customPosition: '', signOn: '',
    signOff: '', company: '', dpClass: '', dpSystem: '', comments: '',
  });

  const resetForm = () => {
    setFormData({
      vesselName: '', vesselType: '', customVesselType: '', flag: '', grossTonnage: '',
      engineType: '', enginePower: '', position: '', customPosition: '', signOn: '',
      signOff: '', company: '', dpClass: '', dpSystem: '', comments: '',
    });
    setEditingService(null);
    setAttachedFiles([]);
  };

  const handleAdd = () => {
    if (!isPremium && state.seaService.length >= FREE_LIMIT) {
      if (onOpenPaywall) onOpenPaywall();
      else alertMsg(t('common.unlimitedOnly'), 'Upgrade to Premium to add more sea service records.');
      return;
    }
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (service: SeaService) => {
    setEditingService(service);
    setFormData({
      vesselName: service.vesselName,
      vesselType: service.vesselType,
      customVesselType: service.customVesselType || '',
      flag: service.flag,
      grossTonnage: service.grossTonnage,
      engineType: service.engineType,
      enginePower: service.enginePower,
      position: service.position,
      customPosition: service.customPosition || '',
      signOn: service.signOn,
      signOff: service.signOff,
      company: service.company,
      dpClass: service.dpClass,
      dpSystem: service.dpSystem,
      comments: service.comments,
    });
    if (serviceAttachments[service.id]) {
      setAttachedFiles(serviceAttachments[service.id]);
    }
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAsync(t('seaService.alerts.deleteTitle'), t('seaService.alerts.deleteMessage'), { confirmText: t('common.delete'), destructive: true }))) return;
    if (serviceAttachments[id]) {
      for (const file of serviceAttachments[id]) {
        try { await deleteBlob(file.uri); } catch (error) { console.error('Error deleting file:', error); }
      }
      const newAttachments = { ...serviceAttachments };
      delete newAttachments[id];
      setServiceAttachments(newAttachments);
      await saveServiceAttachments(newAttachments);
    }
    deleteSeaService(id);
  };

  const handleSave = async () => {
    if (!formData.vesselName || !formData.position) {
      alertMsg(t('seaService.alerts.errorTitle'), t('seaService.alerts.requiredFields'));
      return;
    }

    const serviceData = {
      id: editingService?.id || Date.now().toString(),
      ...formData,
      // FIX: явно переносим optional-поля, чтобы они не потерялись
      customPosition: formData.customPosition || undefined,
      customVesselType: formData.customVesselType || undefined,
      countForRevalidation: editingService?.countForRevalidation !== undefined
        ? editingService.countForRevalidation : true,
    };

    // FIX: сохраняем вложения независимо от их наличия (очищаем если пусто)
    const newAttachments = { ...serviceAttachments };
    if (attachedFiles.length > 0) {
      newAttachments[serviceData.id] = attachedFiles;
    } else if (newAttachments[serviceData.id]) {
      delete newAttachments[serviceData.id];
    }
    setServiceAttachments(newAttachments);
    await saveServiceAttachments(newAttachments);

    if (editingService) {
      updateSeaServiceItem(serviceData);
    } else {
      addSeaService(serviceData);
    }

    setShowModal(false);
    resetForm();
  };

  // Web: attach = upload a file (PDF or image), stored as a blob in IndexedDB.
  const handleAttachFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: false,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      if (file.size && file.size > 10 * 1024 * 1024) {
        alertMsg(t('common.error'), 'File size exceeds 10MB limit. Please choose a smaller file.');
        return;
      }

      const resp = await fetch(file.uri);
      const blob = await resp.blob();
      const stored = await storeUploadedFile(blob, file.name || `attachment_${attachedFiles.length + 1}`, file.size || blob.size);
      setAttachedFiles(prev => [...prev, stored]);
    } catch (error) {
      console.error('Error picking document:', error);
      alertMsg(t('common.error'), 'Failed to attach file. Please try again.');
    }
  };

  const removeAttachedFile = async (index: number) => {
    try {
      const fileToRemove = attachedFiles[index];
      await deleteBlob(fileToRemove.uri);
      setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error removing file:', error);
    }
  };

  const toggleRevalidation = (id: string) => {
    const service = state.seaService.find(s => s.id === id);
    if (service) {
      updateSeaServiceItem({
        ...service,
        countForRevalidation: service.countForRevalidation === false ? true : false,
      });
    }
  };

  const calculateDays = (signOn: string, signOff: string): number => {
    if (!signOn || !signOff) return 0;
    const start = new Date(signOn);
    const end = new Date(signOff);
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const calculateRevalidationService = () => {
    let totalMonths = 0;
    let totalRemainingDays = 0;

    state.seaService.forEach(service => {
      if (service.countForRevalidation === false) return;
      if (!service.signOn || !service.signOff) return;
      
      const start = new Date(service.signOn);
      const end = new Date(service.signOff);
      let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      if (end.getDate() < start.getDate()) months--;
      
      const tempDate = new Date(start);
      tempDate.setMonth(tempDate.getMonth() + months);
      const remainingDays = Math.ceil((end.getTime() - tempDate.getTime()) / (1000 * 60 * 60 * 24));
      
      totalMonths += months;
      totalRemainingDays += remainingDays;
    });

    const additionalMonths = Math.floor(totalRemainingDays / 30);
    const finalRemainingDays = totalRemainingDays % 30;
    totalMonths += additionalMonths;

    return { months: totalMonths, days: finalRemainingDays, totalDays: totalMonths * 30 + finalRemainingDays };
  };

  const calculateMonthsAndDays = (signOn: string, signOff: string) => {
    if (!signOn || !signOff) return { months: 0, days: 0 };
    const start = new Date(signOn);
    const end = new Date(signOff);
    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (end.getDate() < start.getDate()) months--;
    const tempDate = new Date(start);
    tempDate.setMonth(tempDate.getMonth() + months);
    const remainingDays = Math.ceil((end.getTime() - tempDate.getTime()) / (1000 * 60 * 60 * 24));
    return { months, days: remainingDays };
  };

  const revalidationService = calculateRevalidationService();
  const totalDays = state.seaService.reduce((total, service) => {
    return total + calculateDays(service.signOn, service.signOff);
  }, 0);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Image
          source={GHOST_SHIP_IMAGE}
          style={[styles.shipBackground, { opacity: isDark ? 0.08 : 0.22, tintColor: isDark ? '#64b5f6' : '#2B7CC1' }]}
          resizeMode="cover"
        />
        
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>
              {t('seaService.totalTime')}: {totalDays} {t('seaService.days')}
            </Text>
            <View style={styles.revalidationContainer}>
              <Text style={[styles.revalidationLabel, isDark ? styles.textLight : styles.textDark]}>
                {t('seaService.revalidation.title')}:
              </Text>
              <Text style={[styles.revalidationValue, isDark ? styles.textLight : styles.textDark]}>
                {revalidationService.months}m {revalidationService.days}d
              </Text>
              <TouchableOpacity onPress={() => setShowInfoModal(true)} style={styles.infoButtonInline}>
                <Ionicons name="information-circle-outline" size={18} color={isDark ? '#64b5f6' : '#1976d2'} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} 
            onPress={handleAdd}
          >
            <Ionicons name="add" size={28} color={isDark ? '#64b5f6' : '#1976d2'} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={isTablet ? styles.contentTablet : undefined}>
          {sortedSeaService.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="boat-outline" size={64} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
              <Text style={[styles.emptyText, isDark ? styles.textLight : styles.textDark]}>
                {t('seaService.noRecords')}
              </Text>
            </View>
          ) : (
            <View style={isTablet ? styles.gridTablet : undefined}>
            {sortedSeaService.map(service => {
              const { months, days } = calculateMonthsAndDays(service.signOn, service.signOff);
              const totalServiceDays = calculateDays(service.signOn, service.signOff);
              
              const locked = isLocked(service.id);
              return (
                <TouchableOpacity
                  key={service.id}
                  activeOpacity={locked ? 0.7 : 1}
                  onPress={locked ? () => onOpenPaywall?.() : undefined}
                  disabled={!locked}
                  style={[styles.serviceCard, isDark ? styles.cardDark : styles.cardLight, isTablet && styles.serviceCardTablet, locked && { opacity: 0.55 }]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Text style={[styles.vesselName, isDark ? styles.textLight : styles.textDark]}>
                        {service.vesselName}
                      </Text>
                      <Text style={[styles.vesselType, isDark ? styles.textMuted : styles.textMutedLight]}>
                        {getVesselTypeLabel(service.vesselType)} • {service.flag}
                      </Text>
                    </View>
                    {locked ? (
                      <Ionicons name="lock-closed" size={18} color="#FFC107" />
                    ) : (
                    <TouchableOpacity
                      onPress={() => toggleRevalidation(service.id)}
                      style={[
                        styles.revalidationBadge,
                        service.countForRevalidation === false 
                          ? { backgroundColor: 'rgba(255,107,107,0.2)' }
                          : { backgroundColor: 'rgba(76,175,80,0.2)' }
                      ]}
                    >
                      <Text style={[
                        styles.revalidationBadgeText,
                        service.countForRevalidation === false
                          ? { color: '#FF6B6B' }
                          : { color: '#4CAF50' }
                      ]}>
                        R
                      </Text>
                    </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                      <Ionicons name="person" size={16} color={isDark ? '#64b5f6' : '#1976d2'} />
                      <Text style={[styles.infoText, isDark ? styles.textLight : styles.textDark]}>
                        {service.position}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="calendar" size={16} color={isDark ? '#64b5f6' : '#1976d2'} />
                      <Text style={[styles.infoText, isDark ? styles.textLight : styles.textDark]}>
                        {service.signOn} → {service.signOff || 'Onboard'}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="time" size={16} color={isDark ? '#64b5f6' : '#1976d2'} />
                      <Text style={[styles.infoText, isDark ? styles.textLight : styles.textDark]}>
                        {months}m {days}d ({totalServiceDays} {t('seaService.days')})
                      </Text>
                    </View>
                    {service.company && (
                      <View style={styles.infoRow}>
                        <Ionicons name="business" size={16} color={isDark ? '#64b5f6' : '#1976d2'} />
                        <Text style={[styles.infoText, isDark ? styles.textLight : styles.textDark]}>
                          {service.company}
                        </Text>
                      </View>
                    )}
                  </View>

                  {serviceAttachments[service.id] && serviceAttachments[service.id].length > 0 && (
                    <View style={styles.attachmentIndicator}>
                      <Ionicons name="attach" size={16} color="#00BFFF" />
                      <Text style={[styles.attachmentCount, { color: '#00BFFF' }]}>
                        {serviceAttachments[service.id].length} scan{serviceAttachments[service.id].length > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}

                  {!locked && (
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => handleEdit(service)} style={styles.actionButton}>
                        <Ionicons name="create-outline" size={16} color={isDark ? '#64b5f6' : '#1976d2'} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(service.id)} style={styles.actionButton}>
                        <Ionicons name="trash-outline" size={16} color="#f44336" />
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            </View>
          )}
        </ScrollView>

        {/* Form Modal */}
        <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => { setShowModal(false); resetForm(); }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={[styles.modalOverlay, { paddingTop: insets.top + 10 }]}>
              <View style={[styles.modalContainer, isDark ? styles.modalDark : styles.modalLight]}>
              <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                  <Text style={[styles.modalTitle, isDark ? styles.textLight : styles.textDark]}>
                    {editingService ? t('seaService.editTitle') : t('seaService.addTitle')}
                  </Text>
                  <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }} style={styles.closeBtn}>
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
                <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>{t('seaService.form.vesselName')}</Text>
                <TextInput
                  style={[styles.input, isDark ? styles.inputDark : styles.inputLight, isDark ? styles.textLight : styles.textDark]}
                  value={formData.vesselName}
                  onChangeText={(v) => setFormData({ ...formData, vesselName: v })}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                />

                <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>{t('seaService.form.vesselType')}</Text>
                <VesselTypeInput
                  value={formData.vesselType}
                  onChangeText={(v) => setFormData({ ...formData, vesselType: v })}
                  isDark={isDark}
                />

                <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>{t('seaService.form.flag')}</Text>
                <TextInput
                  style={[styles.input, isDark ? styles.inputDark : styles.inputLight, isDark ? styles.textLight : styles.textDark]}
                  value={formData.flag}
                  onChangeText={(v) => setFormData({ ...formData, flag: v })}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                />
                <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>
                  {t('seaService.form.position')}
                 </Text>

                 <PositionInput
                 value={formData.position}
                 onChangeText={(v) => setFormData({ ...formData, position: v })}
                  isDark={isDark}
                  label={t('')}
                 />

                <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>{t('seaService.form.signOn')}</Text>
                <SimpleDatePicker
                  label=""
                  value={formData.signOn}
                  onChange={(date) => setFormData({ ...formData, signOn: date })}
                  isDark={isDark}
                />

                <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>{t('seaService.form.signOff')}</Text>
                <SimpleDatePicker
                  label=""
                  value={formData.signOff}
                  onChange={(date) => setFormData({ ...formData, signOff: date })}
                  isDark={isDark}
                />

                <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>{t('seaService.form.company')}</Text>
                <TextInput
                  style={[styles.input, isDark ? styles.inputDark : styles.inputLight, isDark ? styles.textLight : styles.textDark]}
                  value={formData.company}
                  onChangeText={(v) => setFormData({ ...formData, company: v })}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                />

                <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>{t('seaService.form.grtPlaceholder')}</Text>
                <TextInput
                  style={[styles.input, isDark ? styles.inputDark : styles.inputLight, isDark ? styles.textLight : styles.textDark]}
                  value={formData.grossTonnage}
                  onChangeText={(v) => setFormData({ ...formData, grossTonnage: v })}
                  keyboardType="numeric"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                />

                <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>{t('seaService.form.engineType')}</Text>
                <TextInput
                  style={[styles.input, isDark ? styles.inputDark : styles.inputLight, isDark ? styles.textLight : styles.textDark]}
                  value={formData.engineType}
                  onChangeText={(v) => setFormData({ ...formData, engineType: v })}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                />

                <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>{t('seaService.form.enginePower')}</Text>
                <TextInput
                  style={[styles.input, isDark ? styles.inputDark : styles.inputLight, isDark ? styles.textLight : styles.textDark]}
                  value={formData.enginePower}
                  onChangeText={(v) => setFormData({ ...formData, enginePower: v })}
                  keyboardType="numeric"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                />

                <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>{t('seaService.form.dpClass')}</Text>
                <TextInput
                  style={[styles.input, isDark ? styles.inputDark : styles.inputLight, isDark ? styles.textLight : styles.textDark]}
                  value={formData.dpClass}
                  onChangeText={(v) => setFormData({ ...formData, dpClass: v })}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                />

                <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>{t('seaService.sections.dpSystem')}</Text>
                <TextInput
                  style={[styles.input, isDark ? styles.inputDark : styles.inputLight, isDark ? styles.textLight : styles.textDark]}
                  value={formData.dpSystem}
                  onChangeText={(v) => setFormData({ ...formData, dpSystem: v })}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                />

                <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>{t('seaService.form.comments')}</Text>
                <TextInput
                  style={[styles.input, styles.textArea, isDark ? styles.inputDark : styles.inputLight, isDark ? styles.textLight : styles.textDark]}
                  value={formData.comments}
                  onChangeText={(v) => setFormData({ ...formData, comments: v })}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                />

                {/* Attached Files Section */}
                <View style={styles.attachedFilesSection}>
                  <View style={styles.attachedFilesHeader}>
                    <Text style={[styles.attachedFilesTitle, isDark ? styles.textLight : styles.textDark]}>
                      Attached Scans ({attachedFiles.length})
                    </Text>
                    <GlowButton onPress={handleAttachFile} isDark={isDark} />
                  </View>
                  
                  {attachedFiles.length > 0 && (
                    <View style={styles.attachedFilesList}>
                      {attachedFiles.map((file, index) => (
                        <View key={index} style={[styles.attachedFileItem, isDark ? styles.fileItemDark : styles.fileItemLight]}>
                          <TouchableOpacity style={styles.fileInfo} onPress={() => openAttachment(file.uri)} activeOpacity={0.7}>
                            <Ionicons name="document" size={20} color="#00BFFF" />
                            <View style={styles.fileDetails}>
                              <Text style={[styles.fileName, isDark ? styles.textLight : styles.textDark]} numberOfLines={1}>
                                {file.fileName}
                              </Text>
                              <Text style={[styles.fileSize, styles.textMuted]}>
                                {(file.size / 1024).toFixed(1)} KB
                              </Text>
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => removeAttachedFile(index)}>
                            <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>

                {/* Кнопки Cancel и Save внизу */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]} 
                    onPress={() => { setShowModal(false); resetForm(); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.saveButton]} 
                    onPress={handleSave}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Info Modal */}
        <Modal visible={showInfoModal} transparent animationType="fade" onRequestClose={() => setShowInfoModal(false)}>
          <TouchableOpacity style={styles.infoModalOverlay} activeOpacity={1} onPress={() => setShowInfoModal(false)}>
            <View style={[styles.infoModalContent, isDark ? styles.infoModalDark : styles.infoModalLight]}>
              <Text style={[styles.infoModalTitle, isDark ? styles.textLight : styles.textDark]}>
                {t('seaService.revalidation.infoTitle')}
              </Text>
              <Text style={[styles.infoModalText, isDark ? styles.textLight : styles.textDark]}>
                {t('seaService.revalidation.infoText')}
              </Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)} style={styles.infoModalButton}>
                <Text style={styles.infoModalButtonText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  shipBackground: { position: 'absolute', width: '100%', height: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  revalidationContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  revalidationLabel: { fontSize: 14, fontWeight: '500' },
  revalidationValue: { fontSize: 14, fontWeight: '700' },
  infoButtonInline: { padding: 2, marginLeft: 2 },
  addButton: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 16 },
  // ↓ НОВЫЕ СТИЛИ iPad
  contentTablet: { paddingBottom: 8 },
  gridTablet: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  serviceCardTablet: { flex: 1, minWidth: 300, maxWidth: '48%' },
  // ↑ КОНЕЦ НОВЫХ СТИЛЕЙ
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 16, marginTop: 16, textAlign: 'center' },
  serviceCard: { marginBottom: 12, borderRadius: 12, padding: 16, borderWidth: 1 },
  cardDark: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  cardLight: { backgroundColor: '#FFFFFF', borderColor: '#E0E0E0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardHeaderLeft: { flex: 1 },
  vesselName: { fontSize: 18, fontWeight: '600' },
  vesselType: { fontSize: 14, marginTop: 4 },
  revalidationBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  revalidationBadgeText: { fontSize: 16, fontWeight: '700' },
  cardBody: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, flex: 1 },
  attachmentIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: 'rgba(0,191,255,0.1)', borderRadius: 12, alignSelf: 'flex-start' },
  attachmentCount: { fontSize: 12, fontWeight: '500' },
  cardActions: { flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.2)' },
  actionButton: { padding: 8 },
  closeBtn: { padding: 4 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  modalContainer: {
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
  modalForm: { paddingHorizontal: 20, paddingTop: 10 },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(128,128,128,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#1976d2',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8, marginTop: 8 },
  input: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  inputDark: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  inputLight: { backgroundColor: '#FFFFFF', borderColor: '#E0E0E0' },
  textArea: { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  glowButtonContainer: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  glowButton: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(0,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#00ffff' },
  attachedFilesSection: { marginTop: 16, marginBottom: 8 },
  attachedFilesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  attachedFilesTitle: { fontSize: 16, fontWeight: '600' },
  attachedFilesList: { gap: 8 },
  attachedFileItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8, borderWidth: 1 },
  fileItemDark: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  fileItemLight: { backgroundColor: '#FFFFFF', borderColor: '#E0E0E0' },
  fileInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileDetails: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '500' },
  fileSize: { fontSize: 12, marginTop: 2 },
  textLight: { color: '#FFFFFF' },
  textDark: { color: '#333' },
  textMuted: { color: 'rgba(128,128,128,0.7)' },
  textMutedLight: { color: 'rgba(0,0,0,0.5)' },
  infoModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  infoModalContent: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 20 },
  infoModalDark: { backgroundColor: '#1a2a4a' },
  infoModalLight: { backgroundColor: '#FFFFFF' },
  infoModalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  infoModalText: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  infoModalButton: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#00BFFF', borderRadius: 8 },
  infoModalButtonText: { color: '#FFFFFF', fontWeight: '600' },
});