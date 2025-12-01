import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { useData, Biometrics } from '../contexts/DataContext';
import { FormModal } from '../components/FormModal';
import { FormInput } from '../components/FormInput';
import { FormSelect } from '../components/FormSelect';
import { Button } from '../components/Button';

export const BiometricsScreen: React.FC = () => {
  const { state, updateBiometrics } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<Biometrics>(state.biometrics);
  const isDark = state.theme === 'dark';

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => ({ label: b, value: b }));
  const eyeColors = ['Brown', 'Blue', 'Green', 'Hazel', 'Gray', 'Amber'].map(c => ({ label: c, value: c }));
  const hairColors = ['Black', 'Brown', 'Blonde', 'Red', 'Gray', 'White', 'Bald'].map(c => ({ label: c, value: c }));

  const openEditModal = () => {
    setForm(state.biometrics);
    setModalVisible(true);
  };

  const handleSave = () => {
    updateBiometrics(form);
    setModalVisible(false);
  };

  const InfoRow = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, isDark ? styles.textMuted : styles.textMutedLight]}>{label}</Text>
      <Text style={[styles.infoValue, isDark ? styles.textLight : styles.textDark]}>
        {value ? `${value}${unit ? ` ${unit}` : ''}` : '-'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
          <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Physical Data</Text>
          <InfoRow label="Height" value={state.biometrics.height} unit="cm" />
          <InfoRow label="Weight" value={state.biometrics.weight} unit="kg" />
          <InfoRow label="Shoe Size" value={state.biometrics.shoeSize} />
          <InfoRow label="Overall Size" value={state.biometrics.overallSize} />
          <InfoRow label="Eye Color" value={state.biometrics.eyeColor} />
          <InfoRow label="Hair Color" value={state.biometrics.hairColor} />
          <InfoRow label="Blood Type" value={state.biometrics.bloodType} />
        </View>

        <Button title="Edit Biometrics" onPress={openEditModal} style={{ margin: 16 }} />
        <View style={{ height: 40 }} />
      </ScrollView>

      <FormModal
        visible={modalVisible}
        title="Edit Biometrics"
        onClose={() => setModalVisible(false)}
      >
        <FormInput
          label="Height (cm)"
          value={form.height}
          onChangeText={(v) => setForm({ ...form, height: v })}
          placeholder="175"
          keyboardType="numeric"
        />
        <FormInput
          label="Weight (kg)"
          value={form.weight}
          onChangeText={(v) => setForm({ ...form, weight: v })}
          placeholder="75"
          keyboardType="numeric"
        />
        <FormInput
          label="Shoe Size (EU)"
          value={form.shoeSize}
          onChangeText={(v) => setForm({ ...form, shoeSize: v })}
          placeholder="42"
        />
        <FormInput
          label="Overall Size"
          value={form.overallSize}
          onChangeText={(v) => setForm({ ...form, overallSize: v })}
          placeholder="M, L, XL, etc."
        />
        <FormSelect
          label="Eye Color"
          value={form.eyeColor}
          options={eyeColors}
          onChange={(v) => setForm({ ...form, eyeColor: v })}
        />
        <FormSelect
          label="Hair Color"
          value={form.hairColor}
          options={hairColors}
          onChange={(v) => setForm({ ...form, hairColor: v })}
        />
        <FormSelect
          label="Blood Type"
          value={form.bloodType}
          options={bloodTypes}
          onChange={(v) => setForm({ ...form, bloodType: v })}
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
    padding: 16,
  },
  section: {
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
