import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData, NextOfKin } from '../contexts/DataContext';
import { FormModal } from '../components/FormModal';
import { FormInput } from '../components/FormInput';
import { Button } from '../components/Button';
import { t } from '../utils/i18n'; // Импорт функции локализации
import { useTablet } from '../hooks/useTablet'; // ← ДОБАВЛЕНО

// Импорт фонового изображения анемонов
const GHOST_ANEMON_IMAGE = require('../assets/images/ghost-anemon.png');

export const NextOfKinScreen: React.FC = () => {
  const { state, updateNextOfKin } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<NextOfKin>(state.nextOfKin);
  const isDark = state.theme === 'dark';
  const isTablet = useTablet(); // ← ДОБАВЛЕНО

  const openEditModal = () => {
    setForm(state.nextOfKin);
    setModalVisible(true);
  };

  const handleSave = () => {
    updateNextOfKin(form);
    setModalVisible(false);
  };

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, isDark ? styles.textMuted : styles.textMutedLight]}>{label}</Text>
      <Text style={[styles.infoValue, isDark ? styles.textLight : styles.textDark]}>{value || '-'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Призрачные анемоны на фоне */}
        <Image
          source={GHOST_ANEMON_IMAGE}
          style={[styles.anemonBackground, { opacity: isDark ? 0.08 : 0.18, tintColor: isDark ? '#64b5f6' : '#2B7CC1' }]}
          resizeMode="cover"
        />
        
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={isTablet ? styles.scrollContentTablet : undefined}>
          <View style={isTablet ? styles.centeredContent : undefined}>
          <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
            {/* Локализованный заголовок секции */}
            <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>
              {t('nextOfKin.title')}
            </Text>
            
            {/* Локализованные метки полей */}
            <InfoRow label={t('nextOfKin.fields.name')} value={state.nextOfKin.name} />
            <InfoRow label={t('nextOfKin.fields.relationship')} value={state.nextOfKin.relationship} />
            <InfoRow label={t('nextOfKin.fields.phone')} value={state.nextOfKin.phone} />
            <InfoRow label={t('nextOfKin.fields.email')} value={state.nextOfKin.email} />
            <InfoRow label={t('nextOfKin.fields.address')} value={state.nextOfKin.address} />
          </View>

          {/* Локализованная кнопка редактирования */}
          <Button 
            title={t('nextOfKin.editButton')} 
            onPress={openEditModal} 
            style={{ margin: 16 }} 
          />
          <View style={{ height: 40 }} />
          </View>
        </ScrollView>

        {/* Модальное окно редактирования с локализованными заголовками и полями */}
        <FormModal
          visible={modalVisible}
          title={t('nextOfKin.editTitle')}
          onClose={() => setModalVisible(false)}
        >
          <FormInput
            label={t('nextOfKin.fields.fullName')}
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
          />
          <FormInput
            label={t('nextOfKin.fields.relationship')}
            value={form.relationship}
            onChangeText={(v) => setForm({ ...form, relationship: v })}
          />
          <FormInput
            label={t('nextOfKin.fields.phone')}
            value={form.phone}
            onChangeText={(v) => setForm({ ...form, phone: v })}
            keyboardType="phone-pad"
          />
          <FormInput
            label={t('nextOfKin.fields.email')}
            value={form.email}
            onChangeText={(v) => setForm({ ...form, email: v })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FormInput
            label={t('nextOfKin.fields.address')}
            value={form.address}
            onChangeText={(v) => setForm({ ...form, address: v })}
            multiline
            numberOfLines={2}
          />
          {/* Локализованная кнопка сохранения */}
          <Button 
            title={t('nextOfKin.saveChanges')} 
            onPress={handleSave} 
            style={{ marginTop: 10 }} 
          />
        </FormModal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  anemonBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  // ↓ НОВЫЕ СТИЛИ iPad
  scrollContentTablet: { alignItems: 'center' },
  centeredContent: { width: '100%', maxWidth: 600 },
  // ↑ КОНЕЦ НОВЫХ СТИЛЕЙ
  section: {
    padding: 16,
    borderRadius: 16,
  },
  sectionDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  infoRow: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
    paddingBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  textLight: {
    color: '#fff',
  },
  textDark: {
    color: '#333',
  },
  textMuted: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  textMutedLight: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
});