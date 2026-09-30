// components/OptionWithOtherInput.tsx
// Picker with a preset list plus an "Other" row that switches to free text.
// Like VesselTypeInput, a single string field holds either a preset or the
// user's own text, so the stored value is what the CV prints — no key lookup,
// and a record written with a preset that is later removed still reads fine.
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

interface OptionWithOtherInputProps {
  value: string;
  onChangeText: (text: string) => void;
  isDark: boolean;
  options: readonly string[];
  placeholder: string;
  otherLabel: string;
  clearLabel: string;
}

export const PROPULSION_TYPES = [
  'Diesel Direct Drive',
  'Diesel-Mechanical (CPP)',
  'Diesel-Electric',
  'Azimuth / Z-Drive',
  'Voith Schneider',
  'Waterjet',
  'Gas Turbine',
  'Steam Turbine',
  'Dual-Fuel (LNG)',
  'Hybrid / Battery',
] as const;

export const SAILING_AREAS = [
  'Worldwide',
  'North Sea',
  'Baltic Sea',
  'Mediterranean',
  'Black Sea',
  'Gulf of Mexico',
  'Caribbean',
  'Brazil',
  'West Africa',
  'Persian Gulf',
  'Red Sea',
  'Indian Ocean',
  'South-East Asia',
  'Far East',
  'Australia',
  'Coastal / Near-Coastal',
] as const;

export const OptionWithOtherInput: React.FC<OptionWithOtherInputProps> = ({
  value,
  onChangeText,
  isDark,
  options,
  placeholder,
  otherLabel,
  clearLabel,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [customText, setCustomText] = useState('');
  const [isCustomInput, setIsCustomInput] = useState(false);

  const isPreset = options.includes(value);

  // Opening on a custom value goes straight to the text field, pre-filled.
  useEffect(() => {
    if (showModal) {
      setIsCustomInput(!!value && !isPreset);
      setCustomText(!!value && !isPreset ? value : '');
    }
  }, [showModal, value, isPreset]);

  const close = () => {
    setShowModal(false);
    setIsCustomInput(false);
    setCustomText('');
  };

  const handleSelect = (option: string) => {
    onChangeText(option);
    close();
  };

  const handleClear = () => {
    onChangeText('');
    close();
  };

  const handleCustomSubmit = () => {
    const text = customText.trim();
    if (!text) return;
    onChangeText(text);
    Keyboard.dismiss();
    close();
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
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={isDark ? '#FFFFFF' : '#1A3A5C'} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}
      >
        <View style={[styles.modalContainer, isDark ? styles.modalDark : styles.modalLight]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={close} style={styles.headerButton}>
              <Ionicons name="close" size={28} color={isDark ? '#FFFFFF' : '#1A3A5C'} />
            </TouchableOpacity>
            {isCustomInput && (
              <TouchableOpacity
                onPress={handleCustomSubmit}
                disabled={!customText.trim()}
                style={styles.headerButton}
              >
                <Ionicons
                  name="checkmark"
                  size={28}
                  color={customText.trim() ? '#00BFFF' : 'rgba(128,128,128,0.3)'}
                />
              </TouchableOpacity>
            )}
          </View>

          {isCustomInput ? (
            <View style={styles.customInputContainer}>
              <TextInput
                style={[
                  styles.customInput,
                  isDark ? styles.inputDark : styles.inputLight,
                  isDark ? styles.textLight : styles.textDark,
                ]}
                value={customText}
                onChangeText={setCustomText}
                placeholder={placeholder}
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCustomSubmit}
              />
            </View>
          ) : (
            <ScrollView style={styles.optionsList}>
              {options.map((option) => {
                const selected = value === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.option, selected && styles.optionSelected, isDark && styles.optionDark]}
                    onPress={() => handleSelect(option)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isDark ? styles.textLight : styles.textDark,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={24} color="#00BFFF" />}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.option, !!value && !isPreset && styles.optionSelected, isDark && styles.optionDark]}
                onPress={() => setIsCustomInput(true)}
              >
                <Text style={[styles.optionText, isDark ? styles.textLight : styles.textDark]}>
                  {otherLabel}
                </Text>
                <Ionicons name="create-outline" size={22} color={isDark ? '#FFFFFF' : '#1A3A5C'} />
              </TouchableOpacity>

              {!!value && (
                <TouchableOpacity style={[styles.option, isDark && styles.optionDark]} onPress={handleClear}>
                  <Text style={[styles.optionText, styles.clearText]}>{clearLabel}</Text>
                  <Ionicons name="close-circle-outline" size={22} color="#d32f2f" />
                </TouchableOpacity>
              )}
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
  clearText: {
    color: '#d32f2f',
  },
});
