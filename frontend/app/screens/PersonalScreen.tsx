import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useData, PersonalInfo } from '../contexts/DataContext';
import { FormModal } from '../components/FormModal';
import { FormInput } from '../components/FormInput';
import { FormSelect } from '../components/FormSelect';
import { Button } from '../components/Button';
import { vesselTypes, positions } from '../utils/helpers';

export const PersonalScreen: React.FC = () => {
  const { state, updatePersonal } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<PersonalInfo>(state.personal);
  const isDark = state.theme === 'dark';

  const vesselTypeOptions = vesselTypes.map(v => ({ label: v, value: v }));
  const positionOptions = positions.map(p => ({ label: p, value: p }));

  const openEditModal = () => {
    setForm(state.personal);
    setModalVisible(true);
  };

  const handleSave = () => {
    updatePersonal(form);
    setModalVisible(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant access to your photos');
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
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => updatePersonal({ ...state.personal, photo: '' }) },
      ]
    );
  };

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
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
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
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
            {state.personal.firstName || state.personal.lastName 
              ? `${state.personal.firstName} ${state.personal.lastName}`.trim()
              : 'Your Name'}
          </Text>
          {state.personal.appliedPosition && (
            <Text style={styles.position}>{state.personal.appliedPosition}</Text>
          )}
        </View>

        <Section title="Personal Details">
          <InfoRow label="First Name" value={state.personal.firstName} />
          <InfoRow label="Middle Name" value={state.personal.middleName} />
          <InfoRow label="Last Name" value={state.personal.lastName} />
          <InfoRow label="Date of Birth" value={state.personal.birthDate} />
          <InfoRow label="Place of Birth" value={state.personal.birthPlace} />
          <InfoRow label="Nationality" value={state.personal.nationality} />
        </Section>

        <Section title="Contact Information">
          <InfoRow label="Phone" value={state.personal.phone} />
          <InfoRow label="Email" value={state.personal.email} />
          <InfoRow label="Address" value={state.personal.address} />
          <InfoRow label="City" value={state.personal.city} />
          <InfoRow label="Country" value={state.personal.country} />
          <InfoRow label="Postal Code" value={state.personal.postalCode} />
        </Section>

        <Section title="Visa Status">
          <InfoRow label="USA Visa" value={state.personal.visaUSA} />
          <InfoRow label="Schengen Visa" value={state.personal.visaSchengen} />
          <InfoRow label="Australia Visa" value={state.personal.visaAustralia} />
        </Section>

        <Section title="Career Preferences">
          <InfoRow label="Applied Position" value={state.personal.appliedPosition} />
          <InfoRow label="Vessel Type" value={state.personal.vesselType} />
        </Section>

        <Button title="Edit Personal Information" onPress={openEditModal} style={{ margin: 16 }} />
        <View style={{ height: 40 }} />
      </ScrollView>

      <FormModal
        visible={modalVisible}
        title="Edit Personal Info"
        onClose={() => setModalVisible(false)}
      >
        <FormInput
          label="First Name"
          value={form.firstName}
          onChangeText={(v) => setForm({ ...form, firstName: v })}
        />
        <FormInput
          label="Middle Name"
          value={form.middleName}
          onChangeText={(v) => setForm({ ...form, middleName: v })}
        />
        <FormInput
          label="Last Name"
          value={form.lastName}
          onChangeText={(v) => setForm({ ...form, lastName: v })}
        />
        <FormInput
          label="Date of Birth (YYYY-MM-DD)"
          value={form.birthDate}
          onChangeText={(v) => setForm({ ...form, birthDate: v })}
        />
        <FormInput
          label="Place of Birth"
          value={form.birthPlace}
          onChangeText={(v) => setForm({ ...form, birthPlace: v })}
        />
        <FormInput
          label="Nationality"
          value={form.nationality}
          onChangeText={(v) => setForm({ ...form, nationality: v })}
        />
        <FormInput
          label="Phone"
          value={form.phone}
          onChangeText={(v) => setForm({ ...form, phone: v })}
          keyboardType="phone-pad"
        />
        <FormInput
          label="Email"
          value={form.email}
          onChangeText={(v) => setForm({ ...form, email: v })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <FormInput
          label="Address"
          value={form.address}
          onChangeText={(v) => setForm({ ...form, address: v })}
        />
        <FormInput
          label="City"
          value={form.city}
          onChangeText={(v) => setForm({ ...form, city: v })}
        />
        <FormInput
          label="Country"
          value={form.country}
          onChangeText={(v) => setForm({ ...form, country: v })}
        />
        <FormInput
          label="Postal Code"
          value={form.postalCode}
          onChangeText={(v) => setForm({ ...form, postalCode: v })}
        />
        <FormInput
          label="USA Visa"
          value={form.visaUSA}
          onChangeText={(v) => setForm({ ...form, visaUSA: v })}
        />
        <FormInput
          label="Schengen Visa"
          value={form.visaSchengen}
          onChangeText={(v) => setForm({ ...form, visaSchengen: v })}
        />
        <FormInput
          label="Australia Visa"
          value={form.visaAustralia}
          onChangeText={(v) => setForm({ ...form, visaAustralia: v })}
        />
        <FormSelect
          label="Applied Position"
          value={form.appliedPosition}
          options={positionOptions}
          onChange={(v) => setForm({ ...form, appliedPosition: v })}
        />
        <FormSelect
          label="Vessel Type Preference"
          value={form.vesselType}
          options={vesselTypeOptions}
          onChange={(v) => setForm({ ...form, vesselType: v })}
        />
        <Button title="Save Changes" onPress={handleSave} style={{ marginTop: 10 }} />
      </FormModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 105,
    height: 135,
    borderRadius: 8,
  },
  photoPlaceholder: {
    width: 105,
    height: 135,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  placeholderLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    backgroundColor: '#1976d2',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  position: {
    fontSize: 16,
    color: '#64b5f6',
    marginTop: 4,
  },
  section: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
  },
  sectionDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
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
