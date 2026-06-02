import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData, Education } from '../contexts/DataContext';
import { FormModal } from '../components/FormModal';
import { FormInput } from '../components/FormInput';
import { Button } from '../components/Button';
import { t } from '../utils/i18n'; // ✅ ДОБАВЛЕНО
import { useTablet } from '../hooks/useTablet'; // ← ДОБАВЛЕНО

// Импорт фонового изображения кальмаров
const GHOST_CALAMARES_IMAGE = require('../assets/images/ghost-calamares.png');

export const EducationScreen: React.FC<any> = ({ theme, accent, onOpenPaywall }) => {
  const { state, updateEducation } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<Education>(state.education);
  const isDark = state.theme === 'dark';
  const isTablet = true; // ← ПРИНУДИТЕЛЬНО для теста (useTablet() заменить обратно после проверки)

  const openEditModal = () => {
    setForm(state.education);
    setModalVisible(true);
  };

  const handleSave = () => {
    updateEducation(form);
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
        {/* Призрачные кальмары на фоне */}
        <Image
          source={GHOST_CALAMARES_IMAGE}
          style={[styles.calamaresBackground, { opacity: isDark ? 0.08 : 0.22, tintColor: isDark ? '#64b5f6' : '#2B7CC1' }]}
          resizeMode="cover"
        />
        
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={isTablet ? styles.scrollContentTablet : undefined}
        >
          <View style={isTablet ? styles.centeredContent : undefined}>
          <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
            <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>
              {t('education.sections.maritimeEducation')}
            </Text>
            <InfoRow label={t('education.fields.institution')} value={state.education.institution} />
            <InfoRow label={t('education.fields.degree')} value={state.education.degree} />
            <InfoRow label={t('education.fields.specialization')} value={state.education.specialization} />
            <InfoRow label={t('education.fields.graduationYear')} value={state.education.graduationYear} />
          </View>

          <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
            <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>
              {t('education.sections.skillsLanguages')}
            </Text>
            <InfoRow label={t('education.fields.additionalSkills')} value={state.education.additionalSkills} />
            <InfoRow label={t('education.fields.languages')} value={state.education.languages} />
          </View>

          <Button title={t('education.editButton')} onPress={openEditModal} style={{ margin: 16 }} />
          <View style={{ height: 40 }} />
          </View>
        </ScrollView>

        <FormModal
          visible={modalVisible}
          title={t('education.editTitle')}
          onClose={() => setModalVisible(false)}
        >
          <FormInput
            label={t('education.fields.institution')}
            value={form.institution}
            onChangeText={(v) => setForm({ ...form, institution: v })}
          />
          <FormInput
            label={t('education.fields.degree')}
            value={form.degree}
            onChangeText={(v) => setForm({ ...form, degree: v })}
          />
          <FormInput
            label={t('education.fields.specialization')}
            value={form.specialization}
            onChangeText={(v) => setForm({ ...form, specialization: v })}
          />
          <FormInput
            label={t('education.fields.graduationYear')}
            value={form.graduationYear}
            onChangeText={(v) => setForm({ ...form, graduationYear: v })}
            keyboardType="numeric"
          />
          <FormInput
            label={t('education.fields.additionalSkills')}
            value={form.additionalSkills}
            onChangeText={(v) => setForm({ ...form, additionalSkills: v })}
            multiline
            numberOfLines={3}
          />
          <FormInput
            label={t('education.fields.languages')}
            value={form.languages}
            onChangeText={(v) => setForm({ ...form, languages: v })}
            multiline
            numberOfLines={2}
          />
          <Button title={t('education.saveChanges')} onPress={handleSave} style={{ marginTop: 10 }} />
        </FormModal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Стиль для фонового изображения кальмаров
  calamaresBackground: {
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
  scrollContentTablet: {
    alignItems: 'center',
  },
  centeredContent: {
    width: '100%',
    maxWidth: 600,
  },
  // ↑ КОНЕЦ НОВЫХ СТИЛЕЙ
  section: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLabel: {
    fontSize: 15,
    flex: 1,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
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