import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { alertMsg, confirmAsync } from '../utils/webAlert';
// Импортируем SafeAreaView для защиты интерфейса
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData, PersonalInfo } from '../contexts/DataContext';
import { FormModal } from '../components/FormModal';
import { FormInput } from '../components/FormInput';
import { FormSelect } from '../components/FormSelect';
import { Button } from '../components/Button';
import  SimpleDatePicker from '../components/SimpleDatePicker';
import { vesselTypes, positions } from '../utils/helpers';
import { playSuccessSound } from '../utils/sound';
import { t } from '../utils/i18n';
import { useTablet } from '../hooks/useTablet'; // ← ДОБАВЛЕНО

const GHOST_OCTOPUS_IMAGE = require('../assets/images/ghost-octopus.png'); 

export const PersonalScreen: React.FC = () => {
  const { state, updatePersonal } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<PersonalInfo>(state.personal); 
  const isDark = state.theme === 'dark';
  const isTablet = useTablet(); // ← ДОБАВЛЕНО

  const vesselTypeOptions = vesselTypes.map(v => ({ label: v, value: v }));
  const positionOptions = positions.map(p => ({ label: p, value: p }));
  
 const safeDate = (dateString: string | undefined): string => {
  // Если строки нет или она пустая — возвращаем пустоту для ячейки
  if (!dateString || dateString.trim() === '') {
    return '';
  }
  
  // Проверяем формат YYYY-MM-DD
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (datePattern.test(dateString)) {
    // Проверяем валидность даты, создавая её как локальную (через компоненты)
    // чтобы избежать смещения часовых поясов
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // +1 день для компенсации смещения
    
    if (!isNaN(date.getTime()) && date.getFullYear() === year && (date.getMonth() + 1) === month) {
      return dateString;
    }
  }
  
  // Если данные некорректны, тоже возвращаем пустоту
  return '';
};

  const currencyOptions = [
    { label: 'EUR (€)', value: '€' },
    { label: 'USD ($)', value: '$' },
    { label: 'GBP (£)', value: '£' },
  ]; 

  const formatDisplayDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const parts = dateString.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; 
    }
    return dateString;
  };

  const openEditModal = () => {
    setForm(state.personal);
    setModalVisible(true);
  };

  const handleSave = () => {
    updatePersonal(form);
    playSuccessSound();
    setModalVisible(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alertMsg('Permission Required', 'Please grant access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [35, 45],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      updatePersonal({ ...state.personal, photo: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const removePhoto = () => {
    if (confirmAsync('Remove Photo', 'Are you sure you want to remove your photo?')) {
      updatePersonal({ ...state.personal, photo: '' });
    }
  };

  const InfoRow = ({ label, value }: { label: string; value: string | undefined }) => (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, isDark ? styles.textMuted : styles.textMutedLight]}>{label}</Text>
      <Text style={[styles.infoValue, isDark ? styles.textLight : styles.textDark]}>{value || '-'}</Text>
    </View>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
      <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>{title}</Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Image
        source={GHOST_OCTOPUS_IMAGE}
        style={[styles.octopusBackground, { opacity: isDark ? 0.08 : 0.15, tintColor: isDark ? '#64b5f6' : '#2B7CC1' }]}
        resizeMode="cover" 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={isTablet ? styles.scrollContentTablet : undefined}>
        <View style={isTablet ? styles.profileHeaderTablet : styles.profileHeader}>
          <TouchableOpacity style={styles.photoContainer} onPress={pickImage} onLongPress={state.personal.photo ? removePhoto : undefined}>
            {state.personal.photo ? (
              <Image source={{ uri: state.personal.photo }} style={styles.photo} />
            ) : (
              <View style={[styles.photoPlaceholder, isDark ? styles.placeholderDark : styles.placeholderLight]}>
                <Ionicons name="person" size={50} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
              </View>
            )}
            <View style={styles.photoOverlay}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.name, isDark ? styles.textLight : styles.textDark]}>
            {`${state.personal.firstName || ''} ${state.personal.lastName || ''}`.trim() || t('personal.yourName')}
          </Text>
          {state.personal.appliedPosition && (
            <Text style={styles.position}>{state.personal.appliedPosition}</Text>
          )}
        </View>

        {isTablet ? (
          // ═══ iPad: 2 колонки ═══
          <>
            <View style={styles.tabletRow}>
              <View style={styles.tabletCol}>
                <Section title={t('personal.sections.personalDetails')}>
                  <InfoRow label={t('personal.fields.firstName')} value={state.personal.firstName} />
                  <InfoRow label={t('personal.fields.middleName')} value={state.personal.middleName} />
                  <InfoRow label={t('personal.fields.lastName')} value={state.personal.lastName} />
                  <InfoRow label={t('personal.fields.dateOfBirth')} value={formatDisplayDate(state.personal.birthDate)} />
                  <InfoRow label={t('personal.fields.placeOfBirth')} value={state.personal.birthPlace} />
                  <InfoRow label={t('personal.fields.nationality')} value={state.personal.nationality} />
                </Section>
                <Section title={t('personal.sections.careerPreferences')}>
                  <InfoRow label={t('personal.fields.appliedPosition')} value={state.personal.appliedPosition === 'Other' && state.personal.customPosition ? state.personal.customPosition : state.personal.appliedPosition} />
                  <InfoRow label={t('seaService.form.vesselType')} value={state.personal.vesselType === 'Other' && state.personal.customVesselType ? state.personal.customVesselType : state.personal.vesselType} />
                  <InfoRow label={t('personal.fields.minDayRate')} value={state.personal.minDayRate ? `${state.personal.minDayRate} ${state.personal.minDayRateCurrency || '€'} ${state.personal.isRateNegotiable ? '(Negotiable)' : ''}`.trim() : '-'} />
                </Section>
              </View>
              <View style={styles.tabletCol}>
                <Section title={t('personal.sections.contactInformation')}>
                  <InfoRow label={t('personal.fields.phone')} value={state.personal.phone} />
                  <InfoRow label={t('personal.fields.email')} value={state.personal.email} />
                  <InfoRow label={t('personal.fields.whatsapp')} value={state.personal.whatsapp} />
                  <InfoRow label={t('personal.fields.telegram')} value={state.personal.telegram} />
                  <InfoRow label={t('personal.fields.msTeams')} value={state.personal.teams} />
                  <InfoRow label={t('personal.fields.address')} value={state.personal.address} />
                  <InfoRow label={t('personal.fields.city')} value={state.personal.city} />
                  <InfoRow label={t('personal.fields.country')} value={state.personal.country} />
                  <InfoRow label={t('personal.fields.postalCode')} value={state.personal.postalCode} />
                  <InfoRow label={t('personal.fields.nearestAirport')} value={state.personal.nearestAirport} />
                  <InfoRow label={t('personal.fields.availabilityDate')} value={formatDisplayDate(state.personal.availabilityDate)} />
                </Section>
              </View>
            </View>
            <Button title={t('personal.editButton')} onPress={openEditModal} style={{ marginHorizontal: 0, marginBottom: 16 }} />
          </>
        ) : (
          // ═══ iPhone: обычный layout ═══
          <>
            <Section title={t('personal.sections.personalDetails')}>
              <InfoRow label={t('personal.fields.firstName')} value={state.personal.firstName} />
              <InfoRow label={t('personal.fields.middleName')} value={state.personal.middleName} />
              <InfoRow label={t('personal.fields.lastName')} value={state.personal.lastName} />
              <InfoRow label={t('personal.fields.dateOfBirth')} value={formatDisplayDate(state.personal.birthDate)} /> 
              <InfoRow label={t('personal.fields.placeOfBirth')} value={state.personal.birthPlace} />
              <InfoRow label={t('personal.fields.nationality')} value={state.personal.nationality} />
            </Section>

            <Section title={t('personal.sections.contactInformation')}>
              <InfoRow label={t('personal.fields.phone')} value={state.personal.phone} />
              <InfoRow label={t('personal.fields.email')} value={state.personal.email} />
              <InfoRow label={t('personal.fields.whatsapp')} value={state.personal.whatsapp} />
              <InfoRow label={t('personal.fields.telegram')} value={state.personal.telegram} />
              <InfoRow label={t('personal.fields.msTeams')} value={state.personal.teams} />
              <InfoRow label={t('personal.fields.address')} value={state.personal.address} />
              <InfoRow label={t('personal.fields.city')} value={state.personal.city} />
              <InfoRow label={t('personal.fields.country')} value={state.personal.country} />
              <InfoRow label={t('personal.fields.postalCode')} value={state.personal.postalCode} />
              <InfoRow label={t('personal.fields.nearestAirport')} value={state.personal.nearestAirport} /> 
              <InfoRow label={t('personal.fields.availabilityDate')} value={formatDisplayDate(state.personal.availabilityDate)} />
            </Section>

            <Section title={t('personal.sections.careerPreferences')}>
              <InfoRow label={t('personal.fields.appliedPosition')} value={state.personal.appliedPosition === 'Other' && state.personal.customPosition ? state.personal.customPosition : state.personal.appliedPosition} />
              <InfoRow label={t('seaService.form.vesselType')} value={state.personal.vesselType === 'Other' && state.personal.customVesselType ? state.personal.customVesselType : state.personal.vesselType} />
              <InfoRow label={t('personal.fields.minDayRate')} value={state.personal.minDayRate ? `${state.personal.minDayRate} ${state.personal.minDayRateCurrency || '€'} ${state.personal.isRateNegotiable ? '(Negotiable)' : ''}`.trim() : '-'} />
            </Section>

            <Button title={t('personal.editButton')} onPress={openEditModal} style={{ margin: 16 }} />
            <View style={{ height: 60 }} />
          </>
        )}
      </ScrollView>

      <FormModal visible={modalVisible} title={t('personal.editTitle')} onClose={() => setModalVisible(false)}>
        {/* Контент модального окна без изменений */}
        <FormInput label={t('personal.fields.firstName')} value={form.firstName} onChangeText={(v) => setForm({ ...form, firstName: v })} />
        <FormInput label={t('personal.fields.middleName')} value={form.middleName} onChangeText={(v) => setForm({ ...form, middleName: v })} />
        <FormInput label={t('personal.fields.lastName')} value={form.lastName} onChangeText={(v) => setForm({ ...form, lastName: v })} />
        <SimpleDatePicker
            label={t('personal.fields.dateOfBirth')}
             value={safeDate(form.birthDate)}
             onChange={(date: string) => setForm({ ...form, birthDate: date })}
             isDark={isDark}
             defaultYear={1985}
        />
        <FormInput label={t('personal.fields.placeOfBirth')} value={form.birthPlace} onChangeText={(v) => setForm({ ...form, birthPlace: v })} />
        <FormInput label={t('personal.fields.nationality')} value={form.nationality} onChangeText={(v) => setForm({ ...form, nationality: v })} />
        <FormInput label={t('personal.fields.phone')} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
        <FormInput label={t('personal.fields.email')} value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" />
        <FormInput label={t('personal.fields.whatsapp')} value={form.whatsapp} onChangeText={(v) => setForm({ ...form, whatsapp: v })} keyboardType="phone-pad" />
        <FormInput label={t('personal.fields.telegram')} value={form.telegram} onChangeText={(v) => setForm({ ...form, telegram: v })} />
        <FormInput label={t('personal.fields.msTeams')} value={form.teams} onChangeText={(v) => setForm({ ...form, teams: v })} autoCapitalize="none" />
        <FormInput label={t('personal.fields.address')} value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} />
        <FormInput label={t('personal.fields.city')} value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} />
        <FormInput label={t('personal.fields.country')} value={form.country} onChangeText={(v) => setForm({ ...form, country: v })} />
        <FormInput label={t('personal.fields.postalCode')} value={form.postalCode} onChangeText={(v) => setForm({ ...form, postalCode: v })} />
        <FormInput label={t('personal.fields.nearestAirport')} value={form.nearestAirport} onChangeText={(v) => setForm({ ...form, nearestAirport: v })} />

        <SimpleDatePicker
           label={t('personal.fields.availabilityDate')}
           value={form.availabilityDate || ''}
           onChange={(date: string) => setForm({ ...form, availabilityDate: date })}
           isDark={isDark}
        />
        
        {/* ... (остальные поля модалки без изменений) */}
        <FormSelect
          label={t('personal.fields.appliedPosition')}
          value={form.appliedPosition}
          options={positionOptions}
          onChange={(v) => setForm({ ...form, appliedPosition: v })}
        />
        {form.appliedPosition === 'Other' && (
          <FormInput label="Specify Position" value={form.customPosition || ''} onChangeText={(v) => setForm({ ...form, customPosition: v })} placeholder="Enter your position" />
        )}
        <FormSelect
          label={t('personal.fields.vesselType')}
          value={form.vesselType}
          options={vesselTypeOptions}
          onChange={(v) => setForm({ ...form, vesselType: v, customVesselType: v === 'Other' ? form.customVesselType : '' })}
        />
        {form.vesselType === 'Other' && (
          <FormInput label="Specify Vessel Type" value={form.customVesselType || ''} onChangeText={(v) => setForm({ ...form, customVesselType: v })} placeholder="Enter vessel type" />
        )}
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 2, marginRight: 8 }}>
            <FormInput
              label={t('personal.fields.minDayRate')}
              value={form.minDayRate}
              onChangeText={(v) => setForm({ ...form, minDayRate: v.replace(/[^0-9]/g, '').substring(0, 4) })}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormSelect
              label={t('personal.fields.currency')}
              value={form.minDayRateCurrency || '€'}
              options={currencyOptions}
              onChange={(v) => setForm({ ...form, minDayRateCurrency: v })}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}
          onPress={() => setForm({ ...form, isRateNegotiable: !form.isRateNegotiable })}
        >
          <Ionicons name={form.isRateNegotiable ? "checkbox" : "square-outline"} size={24} color="#1976d2" />
          <Text style={{ marginLeft: 10, fontSize: 16, color: isDark ? '#fff' : '#333' }}>{t('personal.fields.negotiable')}</Text>
        </TouchableOpacity>

        <Button title={t('personal.saveChanges')} onPress={handleSave} style={{ marginTop: 10 }} />
      </FormModal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  // ↓ НОВЫЕ СТИЛИ iPad
  scrollContentTablet: { paddingHorizontal: 24 },
  profileHeaderTablet: { alignItems: 'center', paddingVertical: 24 },
  tabletRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  tabletCol: { flex: 1 },
  // ↑ КОНЕЦ НОВЫХ СТИЛЕЙ
  octopusBackground: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
    zIndex: -1, 
  },
  profileHeader: { alignItems: 'center', padding: 24 },
  photoContainer: { position: 'relative' },
  photo: { width: 105, height: 135, borderRadius: 8 },
  photoPlaceholder: { width: 105, height: 135, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  placeholderDark: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  placeholderLight: { backgroundColor: 'rgba(230, 221, 192, 0.1)' }, // Убрана лишняя скобка
  photoOverlay: {
    position: 'absolute', bottom: -10, right: -10,
    backgroundColor: '#1976d2', width: 36, height: 36,
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 24, fontWeight: '700', marginTop: 16 },
  position: { fontSize: 20, color: '#3fb4f7', marginTop: 4 },
  section: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16 },
  sectionDark: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  sectionLight: { backgroundColor: 'rgba(240, 233, 208, 0.2)' }, // Убрана лишняя скобка
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  textLight: { color: '#fff' },
  textDark: { color: '#333' },
  textMuted: { color: 'rgba(255, 255, 255, 0.6)' },
  textMutedLight: { color: 'rgba(0, 0, 0, 0.5)' },
});