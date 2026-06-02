// components/VesselTypeInput.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VesselTypeInputProps {
  value: string;
  onChangeText: (text: string) => void;
  isDark: boolean;
}

export const VESSEL_TYPES = [
  { value: 'bulk_carrier', label: 'Bulk Carrier' },
  { value: 'container_ship', label: 'Container Ship' },
  { value: 'tanker', label: 'Tanker' },
  { value: 'oil_tanker', label: 'Oil Tanker' },
  { value: 'chemical_tanker', label: 'Chemical Tanker' },
  { value: 'gas_carrier', label: 'Gas Carrier (LNG/LPG)' },
  { value: 'passenger_ship', label: 'Passenger Ship' },
  { value: 'cruise_ship', label: 'Cruise Ship' },
  { value: 'ro_ro', label: 'Ro-Ro (Roll-on/Roll-off)' },
  { value: 'general_cargo', label: 'General Cargo Ship' },
  { value: 'reefer', label: 'Reefer (Refrigerated Cargo)' },
  { value: 'fishing_vessel', label: 'Fishing Vessel' },
  { value: 'research_vessel', label: 'Research Vessel' },
  { value: 'offshore_vessel', label: 'Offshore Support Vessel' },
  { value: 'tugboat', label: 'Tugboat' },
  { value: 'dredger', label: 'Dredger' },
  { value: 'yacht', label: 'Yacht' },
  { value: 'naval_ship', label: 'Naval Ship' },
  { value: 'other', label: 'Other' },
];

export const VesselTypeInput: React.FC<VesselTypeInputProps> = ({
  value,
  onChangeText,
  isDark,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [customType, setCustomType] = useState('');
  const [isCustomInput, setIsCustomInput] = useState(false);

  useEffect(() => {
    const isPreset = VESSEL_TYPES.some(type => type.value === value);
    if (!isPreset && value) {
      setCustomType(value);
      setIsCustomInput(true);
    } else {
      setIsCustomInput(false);
      setCustomType('');
    }
  }, [value]);

  const handleSelectType = (vesselValue: string) => {
    if (vesselValue === 'other') {
      setIsCustomInput(true);
      setCustomType('');
    } else {
      onChangeText(vesselValue);
      setIsCustomInput(false);
      setShowModal(false);
    }
  };

  const handleCustomInputSubmit = () => {
    if (customType.trim()) {
      onChangeText(customType.trim());
      setShowModal(false);
      setIsCustomInput(false);
      Keyboard.dismiss();
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setIsCustomInput(false);
    setCustomType('');
  };

  const getDisplayValue = () => {
    if (!value) return 'Vessel Type';
    const preset = VESSEL_TYPES.find(type => type.value === value);
    return preset ? preset.label : value;
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
        onPress={() => setShowModal(true)}
      >
        <Text
          style={[
            styles.inputText,
            isDark ? styles.textLight : styles.textDark,
            !value && styles.placeholderText,
          ]}
        >
          {getDisplayValue()}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color={isDark ? '#FFFFFF' : '#1A3A5C'}
        />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancel}
      >
        <View style={[styles.modalContainer, isDark ? styles.modalDark : styles.modalLight]}>
          {/* Header - только крестик и галочка */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
              <Ionicons name="close" size={28} color={isDark ? '#FFFFFF' : '#1A3A5C'} />
            </TouchableOpacity>
            {isCustomInput && (
              <TouchableOpacity
                onPress={handleCustomInputSubmit}
                disabled={!customType.trim()}
                style={styles.headerButton}
              >
                <Ionicons
                  name="checkmark"
                  size={28}
                  color={customType.trim() ? '#00BFFF' : 'rgba(128,128,128,0.3)'}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Кастомный ввод */}
          {isCustomInput && (
            <View style={styles.customInputContainer}>
              <TextInput
                style={[
                  styles.customInput,
                  isDark ? styles.inputDark : styles.inputLight,
                  isDark ? styles.textLight : styles.textDark,
                ]}
                value={customType}
                onChangeText={setCustomType}
                placeholder="Vessel Type"
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCustomInputSubmit}
              />
            </View>
          )}

          {/* List */}
          {!isCustomInput && (
            <ScrollView style={styles.optionsList}>
              {VESSEL_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.option,
                    value === type.value && styles.optionSelected,
                    isDark && styles.optionDark,
                  ]}
                  onPress={() => handleSelectType(type.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isDark ? styles.textLight : styles.textDark,
                      value === type.value && styles.optionTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                  {value === type.value && (
                    <Ionicons name="checkmark" size={24} color="#00BFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  inputDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
  },
  placeholderText: {
    opacity: 0.5,
  },
  textLight: {
    color: '#FFFFFF',
  },
  textDark: {
    color: '#1A3A5C',
  },
  modalContainer: {
    flex: 1,
    paddingTop: 20,
  },
  modalDark: {
    backgroundColor: '#0a1628',
  },
  modalLight: {
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customInputContainer: {
    padding: 20,
  },
  customInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  optionsList: {
    flex: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  optionDark: {
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  optionSelected: {
    backgroundColor: 'rgba(0,191,255,0.1)',
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: '#00BFFF',
  },
});