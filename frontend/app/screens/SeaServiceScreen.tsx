import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData, SeaService } from '../contexts/DataContext';
import { Card } from '../components/Card';
import { FormModal } from '../components/FormModal';
import { FormInput } from '../components/FormInput';
import { FormSelect } from '../components/FormSelect';
import { Button } from '../components/Button';
import { generateId, formatDate, vesselTypes, positions } from '../utils/helpers';

export const SeaServiceScreen: React.FC = () => {
  const { state, addSeaService, updateSeaServiceItem, deleteSeaService } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<SeaService | null>(null);
  const [form, setForm] = useState<Partial<SeaService>>({});
  const isDark = state.theme === 'dark';

  const vesselTypeOptions = vesselTypes.map(v => ({ label: v, value: v }));
  const positionOptions = positions.map(p => ({ label: p, value: p }));

  const openAddModal = () => {
    setEditingService(null);
    setForm({});
    setModalVisible(true);
  };

  const openEditModal = (service: SeaService) => {
    setEditingService(service);
    setForm(service);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!form.vesselName || !form.position) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    const serviceData: SeaService = {
      id: editingService?.id || generateId(),
      vesselName: form.vesselName || '',
      vesselType: form.vesselType || '',
      flag: form.flag || '',
      grossTonnage: form.grossTonnage || '',
      engineType: form.engineType || '',
      enginePower: form.enginePower || '',
      position: form.position || '',
      signOn: form.signOn || '',
      signOff: form.signOff || '',
      company: form.company || '',
      dpClass: form.dpClass || '',
      dpSystem: form.dpSystem || '',
      comments: form.comments || '',
    };

    if (editingService) {
      updateSeaServiceItem(serviceData);
    } else {
      addSeaService(serviceData);
    }
    setModalVisible(false);
  };

  const handleDelete = (service: SeaService) => {
    Alert.alert(
      'Delete Sea Service',
      `Are you sure you want to delete "${service.vesselName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteSeaService(service.id) },
      ]
    );
  };

  const calculateDuration = (signOn: string, signOff: string) => {
    if (!signOn || !signOff) return '-';
    const start = new Date(signOn);
    const end = new Date(signOff);
    const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  const sortedServices = [...state.seaService].sort((a, b) => {
    return new Date(b.signOff || b.signOn).getTime() - new Date(a.signOff || a.signOn).getTime();
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {sortedServices.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="boat-outline" size={64} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
            <Text style={[styles.emptyText, isDark ? styles.textMuted : styles.textMutedLight]}>
              No sea service records yet
            </Text>
            <Text style={[styles.emptyHint, isDark ? styles.textMuted : styles.textMutedLight]}>
              Tap the + button to add your service history
            </Text>
          </View>
        ) : (
          sortedServices.map(service => (
            <Card
              key={service.id}
              onEdit={() => openEditModal(service)}
              onDelete={() => handleDelete(service)}
            >
              <View style={styles.serviceHeader}>
                <Text style={[styles.vesselName, isDark ? styles.textLight : styles.textDark]}>
                  {service.vesselName}
                </Text>
                <Text style={[styles.duration, isDark ? styles.textMuted : styles.textMutedLight]}>
                  {calculateDuration(service.signOn, service.signOff)}
                </Text>
              </View>
              <Text style={[styles.position, { color: '#64b5f6' }]}>
                {service.position}
              </Text>
              <Text style={[styles.serviceInfo, isDark ? styles.textMuted : styles.textMutedLight]}>
                {service.vesselType || 'N/A'} • {service.flag || 'N/A'}
              </Text>
              <Text style={[styles.dates, isDark ? styles.textMuted : styles.textMutedLight]}>
                {formatDate(service.signOn)} - {formatDate(service.signOff)}
              </Text>
              {service.company && (
                <Text style={[styles.company, isDark ? styles.textMuted : styles.textMutedLight]}>
                  {service.company}
                </Text>
              )}
            </Card>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <FormModal
        visible={modalVisible}
        title={editingService ? 'Edit Sea Service' : 'Add Sea Service'}
        onClose={() => setModalVisible(false)}
      >
        <FormInput
          label="Vessel Name"
          value={form.vesselName || ''}
          onChangeText={(v) => setForm({ ...form, vesselName: v })}
          required
        />
        <FormSelect
          label="Vessel Type"
          value={form.vesselType || ''}
          options={vesselTypeOptions}
          onChange={(v) => setForm({ ...form, vesselType: v })}
        />
        <FormSelect
          label="Position"
          value={form.position || ''}
          options={positionOptions}
          onChange={(v) => setForm({ ...form, position: v })}
          required
        />
        <FormInput
          label="Flag"
          value={form.flag || ''}
          onChangeText={(v) => setForm({ ...form, flag: v })}
        />
        <FormInput
          label="Gross Tonnage"
          value={form.grossTonnage || ''}
          onChangeText={(v) => setForm({ ...form, grossTonnage: v })}
          keyboardType="numeric"
        />
        <FormInput
          label="Engine Type"
          value={form.engineType || ''}
          onChangeText={(v) => setForm({ ...form, engineType: v })}
        />
        <FormInput
          label="Engine Power (kW)"
          value={form.enginePower || ''}
          onChangeText={(v) => setForm({ ...form, enginePower: v })}
          keyboardType="numeric"
        />
        <FormInput
          label="Sign On Date (YYYY-MM-DD)"
          value={form.signOn || ''}
          onChangeText={(v) => setForm({ ...form, signOn: v })}
        />
        <FormInput
          label="Sign Off Date (YYYY-MM-DD)"
          value={form.signOff || ''}
          onChangeText={(v) => setForm({ ...form, signOff: v })}
        />
        <FormInput
          label="Company"
          value={form.company || ''}
          onChangeText={(v) => setForm({ ...form, company: v })}
        />
        <FormInput
          label="DP Class"
          value={form.dpClass || ''}
          onChangeText={(v) => setForm({ ...form, dpClass: v })}
        />
        <FormInput
          label="DP System"
          value={form.dpSystem || ''}
          onChangeText={(v) => setForm({ ...form, dpSystem: v })}
        />
        <FormInput
          label="Comments"
          value={form.comments || ''}
          onChangeText={(v) => setForm({ ...form, comments: v })}
          multiline
          numberOfLines={3}
        />
        <Button title="Save Sea Service" onPress={handleSave} style={{ marginTop: 10 }} />
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
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vesselName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  duration: {
    fontSize: 12,
  },
  position: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  serviceInfo: {
    fontSize: 13,
    marginTop: 4,
  },
  dates: {
    fontSize: 12,
    marginTop: 2,
  },
  company: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
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
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});
