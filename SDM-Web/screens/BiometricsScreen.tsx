import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData, Biometrics } from '../contexts/DataContext';
import { FormModal } from '../components/FormModal';
import { FormInput } from '../components/FormInput';
import { FormSelect } from '../components/FormSelect';
import { Button } from '../components/Button';
import { t } from '../utils/i18n';
import { useTablet } from '../hooks/useTablet'; // ← ДОБАВЛЕНО

const GHOST_MARLIN_IMAGE = require('../assets/images/ghost-marlin.png');

export const BiometricsScreen: React.FC = () => {
  const { state, updateBiometrics } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<Biometrics>(state.biometrics);
  const isDark = state.theme === 'dark';
  const isTablet = useTablet(); // ← ДОБАВЛЕНО

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => ({ label: b, value: b }));
  
  const eyeColors = [
    { label: t('biometrics.eyeColors.brown'), value: 'Brown' },
    { label: t('biometrics.eyeColors.blue'), value: 'Blue' },
    { label: t('biometrics.eyeColors.green'), value: 'Green' },
    { label: t('biometrics.eyeColors.hazel'), value: 'Hazel' },
    { label: t('biometrics.eyeColors.gray'), value: 'Gray' },
    { label: t('biometrics.eyeColors.amber'), value: 'Amber' },
  ];

  const hairColors = [
    { label: t('biometrics.hairColors.black'), value: 'Black' },
    { label: t('biometrics.hairColors.brown'), value: 'Brown' },
    { label: t('biometrics.hairColors.blonde'), value: 'Blonde' },
    { label: t('biometrics.hairColors.red'), value: 'Red' },
    { label: t('biometrics.hairColors.gray'), value: 'Gray' },
    { label: t('biometrics.hairColors.white'), value: 'White' },
    { label: t('biometrics.hairColors.bald'), value: 'Bald' },
  ];

  const openEditModal = () => {
    setForm(state.biometrics);
    setModalVisible(true);
  };

  const handleSave = () => {
    updateBiometrics(form);
    setModalVisible(false);
  };

  const InfoRow = ({ label, value, unit }: { label: string; value: string | number; unit?: string }) => (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, isDark ? styles.textMuted : styles.textMutedLight]}>{label}</Text>
      <Text style={[styles.infoValue, isDark ? styles.textLight : styles.textDark]}>
        {value ? `${value}${unit ? ` ${unit}` : ''}` : '-'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <Image
              source={GHOST_MARLIN_IMAGE}
              style={[styles.marlinBackground, { opacity: isDark ? 0.08 : 0.22, tintColor: isDark ? '#64b5f6' : '#2B7CC1' }]}
              resizeMode="cover"
            />
            
            {/* ↓ ИЗМЕНЕНО: добавлен contentContainerStyle для центрирования на iPad */}
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={isTablet ? styles.scrollContentTablet : styles.scrollContentPhone}
            >
              {/* ↓ ИЗМЕНЕНО: обёртка с maxWidth для iPad */}
              <View style={isTablet ? styles.centeredContent : undefined}>
                <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
                  <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>
                    {t('biometrics.title')}
                  </Text>
                  
                  <InfoRow label={t('biometrics.fields.height')} value={state.biometrics.height} unit="cm" />
                  <InfoRow label={t('biometrics.fields.weight')} value={state.biometrics.weight} unit="kg" />
                  <InfoRow label={t('biometrics.fields.shoeSize')} value={state.biometrics.shoeSize} />
                  <InfoRow label={t('biometrics.fields.overallSize')} value={state.biometrics.overallSize} />
                  <InfoRow label={t('biometrics.fields.eyeColor')} value={state.biometrics.eyeColor ? t(`biometrics.eyeColors.${state.biometrics.eyeColor.toLowerCase()}`) : '-'} />
                  <InfoRow label={t('biometrics.fields.hairColor')} value={state.biometrics.hairColor ? t(`biometrics.hairColors.${state.biometrics.hairColor.toLowerCase()}`) : '-'} />
                  <InfoRow label={t('biometrics.fields.bloodType')} value={state.biometrics.bloodType} />
                </View>

                <Button title={t('common.edit') || 'Edit'} onPress={openEditModal} style={{ margin: 16 }} />
                <View style={{ height: 40 }} />
              </View>
            </ScrollView>

            <FormModal
              visible={modalVisible}
              title={t('biometrics.editTitle')}
              onClose={() => setModalVisible(false)}
            >
              <FormInput
                label={t('biometrics.fields.height')}
                value={form.height}
                onChangeText={(v) => setForm({ ...form, height: v })}
                keyboardType="numeric"
              />
              <FormInput
                label={t('biometrics.fields.weight')}
                value={form.weight}
                onChangeText={(v) => setForm({ ...form, weight: v })}
                keyboardType="numeric"
              />
              <FormInput
                label={t('biometrics.fields.shoeSize')}
                value={form.shoeSize}
                onChangeText={(v) => setForm({ ...form, shoeSize: v })}
              />
              <FormInput
                label={t('biometrics.fields.overallSize')}
                value={form.overallSize}
                onChangeText={(v) => setForm({ ...form, overallSize: v })}
              />
              <FormSelect
                label={t('biometrics.fields.eyeColor')}
                value={form.eyeColor}
                options={eyeColors}
                onChange={(v) => setForm({ ...form, eyeColor: v })}
              />
              <FormSelect
                label={t('biometrics.fields.hairColor')}
                value={form.hairColor}
                options={hairColors}
                onChange={(v) => setForm({ ...form, hairColor: v })}
              />
              <FormSelect
                label={t('biometrics.fields.bloodType')}
                value={form.bloodType}
                options={bloodTypes}
                onChange={(v) => setForm({ ...form, bloodType: v })}
              />
              <Button title={t('personal.saveChanges')} onPress={handleSave} style={{ marginTop: 10 }} />
            </FormModal>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  marlinBackground: {
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
  // ↓ НОВЫЕ СТИЛИ для iPad
  scrollContentPhone: {
    flexGrow: 1,
  },
  scrollContentTablet: {
    flexGrow: 1,
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
  },
  infoValue: {
    fontSize: 15,
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