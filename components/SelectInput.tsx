import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SelectInputProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  isDark?: boolean;
  placeholder?: string;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  label,
  value,
  options,
  onChange,
  isDark = true,
  placeholder = 'Select...'
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleSelect = (option: string) => {
    onChange(option);
    setShowModal(false);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, isDark ? styles.labelDark : styles.labelLight]}>
        {label}
      </Text>
      
      <TouchableOpacity
        style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
        onPress={() => setShowModal(true)}
      >
        <View style={styles.inputContent}>
          <Ionicons 
            name="language-outline" 
            size={20} 
            color={isDark ? '#4A90C4' : '#2B7CC1'} 
            style={styles.icon}
          />
          <Text style={[
            styles.inputText,
            isDark ? styles.inputTextDark : styles.inputTextLight,
            !value && styles.placeholderText
          ]}>
            {value || placeholder}
          </Text>
          <Ionicons 
            name="chevron-down" 
            size={20} 
            color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} 
          />
        </View>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={[styles.modalContent, isDark ? styles.modalDark : styles.modalLight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark ? styles.textLight : styles.textDark]}>
                {label}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={isDark ? '#fff' : '#333'} 
                />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item === value && styles.optionSelected
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[
                    styles.optionText,
                    isDark ? styles.textLight : styles.textDark,
                    item === value && styles.optionTextSelected
                  ]}>
                    {item}
                  </Text>
                  {item === value && (
                    <Ionicons name="checkmark" size={20} color="#2B7CC1" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export const ENGLISH_LEVELS = [
  'A1 - Beginner',
  'A2 - Elementary',
  'B1 - Intermediate',
  'B2 - Upper Intermediate',
  'C1 - Advanced',
  'C2 - Proficient',
];

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  labelDark: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  labelLight: {
    color: 'rgba(0, 0, 0, 0.7)',
  },
  input: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  inputDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  inputLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  inputText: {
    fontSize: 16,
    flex: 1,
  },
  inputTextDark: {
    color: '#fff',
  },
  inputTextLight: {
    color: '#1A3A5C',
  },
  placeholderText: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    maxHeight: '70%',
  },
  modalDark: {
    backgroundColor: '#1a2a4a',
  },
  modalLight: {
    backgroundColor: '#F0F7FF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100, 181, 246, 0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100, 181, 246, 0.1)',
  },
  optionSelected: {
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
  },
  optionText: {
    fontSize: 16,
  },
  optionTextSelected: {
    color: '#2B7CC1',
    fontWeight: '600',
  },
  textLight: {
    color: '#fff',
  },
  textDark: {
    color: '#1A3A5C',
  },
});
