import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { useData, Education } from '../contexts/DataContext';
import { FormModal } from '../components/FormModal';
import { FormInput } from '../components/FormInput';
import { Button } from '../components/Button';

export const EducationScreen: React.FC = () => {
  const { state, updateEducation } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<Education>(state.education);
  const isDark = state.theme === 'dark';

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
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
          <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Maritime Education</Text>
          <InfoRow label="Institution" value={state.education.institution} />
          <InfoRow label="Degree" value={state.education.degree} />
          <InfoRow label="Specialization" value={state.education.specialization} />
          <InfoRow label="Graduation Year" value={state.education.graduationYear} />
        </View>

        <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
          <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Skills & Languages</Text>
          <InfoRow label="Additional Skills" value={state.education.additionalSkills} />
          <InfoRow label="Languages" value={state.education.languages} />
        </View>

        <Button title="Edit Education" onPress={openEditModal} style={{ margin: 16 }} />
        <View style={{ height: 40 }} />
      </ScrollView>

      <FormModal
        visible={modalVisible}
        title="Edit Education"
        onClose={() => setModalVisible(false)}
      >
        <FormInput
          label="Institution"
          value={form.institution}
          onChangeText={(v) => setForm({ ...form, institution: v })}
          placeholder="Maritime Academy of..."
        />
        <FormInput
          label="Degree"
          value={form.degree}
          onChangeText={(v) => setForm({ ...form, degree: v })}
          placeholder="Bachelor of Science in Marine Transportation"
        />
        <FormInput
          label="Specialization"
          value={form.specialization}
          onChangeText={(v) => setForm({ ...form, specialization: v })}
          placeholder="Navigation, Engineering, etc."
        />
        <FormInput
          label="Graduation Year"
          value={form.graduationYear}
          onChangeText={(v) => setForm({ ...form, graduationYear: v })}
          placeholder="2015"
          keyboardType="numeric"
        />
        <FormInput
          label="Additional Skills"
          value={form.additionalSkills}
          onChangeText={(v) => setForm({ ...form, additionalSkills: v })}
          placeholder="DP certification, ECDIS, etc."
          multiline
          numberOfLines={3}
        />
        <FormInput
          label="Languages"
          value={form.languages}
          onChangeText={(v) => setForm({ ...form, languages: v })}
          placeholder="English (Fluent), Filipino (Native)"
          multiline
          numberOfLines={2}
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
    marginBottom: 16,
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
