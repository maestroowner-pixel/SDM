import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../contexts/DataContext';

interface Option {
  label: string;
  value: string;
}

interface Props {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  required?: boolean;
}

export const FormSelect: React.FC<Props> = ({ label, value, options, onChange, required }) => {
  const [visible, setVisible] = useState(false);
  const { state } = useData();
  const isDark = state.theme === 'dark';

  const selectedOption = options.find(o => o.value === value);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, isDark ? styles.labelDark : styles.labelLight]}>
        {label}{required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity
        style={[
          styles.select,
          isDark ? styles.selectDark : styles.selectLight
        ]}
        onPress={() => setVisible(true)}
      >
        <Text style={[
          styles.selectText,
          isDark ? styles.textLight : styles.textDark,
          !selectedOption && styles.placeholder
        ]}>
          {selectedOption?.label || 'Select...'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={isDark ? '#fff' : '#333'} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={[
            styles.modal,
            isDark ? styles.modalDark : styles.modalLight
          ]}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === value && (isDark ? styles.optionSelectedDark : styles.optionSelectedLight)
                  ]}
                  onPress={() => {
                    onChange(item.value);
                    setVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, isDark ? styles.textLight : styles.textDark]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  labelDark: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  labelLight: {
    color: '#555',
  },
  required: {
    color: '#f44336',
  },
  select: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  selectDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  selectLight: {
    backgroundColor: '#f5f5f5',
    borderColor: 'rgba(139, 90, 43, 0.15)',
  },
  selectText: {
    fontSize: 16,
  },
  textLight: {
    color: '#fff',
  },
  textDark: {
    color: '#1A3A5C',
  },
  placeholder: {
    opacity: 0.5,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modal: {
    borderRadius: 16,
    maxHeight: 400,
    width: '100%',
    overflow: 'hidden',
  },
  modalDark: {
    backgroundColor: '#1a2a4a',
  },
  modalLight: {
    backgroundColor: '#F0F7FF',
  },
  option: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionSelectedDark: {
    backgroundColor: 'rgba(100, 181, 246, 0.2)',
  },
  optionSelectedLight: {
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
  },
  optionText: {
    fontSize: 16,
  },
});
