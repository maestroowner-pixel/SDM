import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { useData, NextOfKin } from '../contexts/DataContext';
import { FormModal } from '../components/FormModal';
import { FormInput } from '../components/FormInput';
import { Button } from '../components/Button';

export const NextOfKinScreen: React.FC = () => {
  const { state, updateNextOfKin } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<NextOfKin>(state.nextOfKin);
  const isDark = state.theme === 'dark';

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
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
          <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Emergency Contact</Text>
          <InfoRow label="Name" value={state.nextOfKin.name} />
          <InfoRow label="Relationship" value={state.nextOfKin.relationship} />
          <InfoRow label="Phone" value={state.nextOfKin.phone} />
          <InfoRow label="Email" value={state.nextOfKin.email} />
          <InfoRow label="Address" value={state.nextOfKin.address} />
        </View>

        <Button title="Edit Next of Kin" onPress={openEditModal} style={{ margin: 16 }} />
        <View style={{ height: 40 }} />
      </ScrollView>

      <FormModal
        visible={modalVisible}
        title="Edit Next of Kin"
        onClose={() => setModalVisible(false)}
      >
        <FormInput
          label="Full Name"
          value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })}
          placeholder="Jane Smith"
        />
        <FormInput
          label="Relationship"
          value={form.relationship}
          onChangeText={(v) => setForm({ ...form, relationship: v })}
          placeholder="Spouse, Parent, Sibling, etc."
        />
        <FormInput
          label="Phone"
          value={form.phone}
          onChangeText={(v) => setForm({ ...form, phone: v })}
          placeholder="+63 912 345 6789"
          keyboardType="phone-pad"
        />
        <FormInput
          label="Email"
          value={form.email}
          onChangeText={(v) => setForm({ ...form, email: v })}
          placeholder="jane.smith@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <FormInput
          label="Address"
          value={form.address}
          onChangeText={(v) => setForm({ ...form, address: v })}
          placeholder="123 Main Street, City, Country"
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
