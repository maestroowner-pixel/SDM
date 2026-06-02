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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { positions } from '../utils/helpers'; //

interface PositionInputProps {
  value: string;
  onChangeText: (text: string) => void;
  isDark: boolean;
  label?: string;
}

export const PositionInput: React.FC<PositionInputProps> = ({ value, onChangeText, isDark, label }) => {
  const [showModal, setShowModal] = useState(false);
  const [customPosition, setCustomPosition] = useState('');
  const [isCustomInput, setIsCustomInput] = useState(false);

  useEffect(() => {
    const isPreset = positions.some(p => p === value); //
    if (!isPreset && value) {
      setCustomPosition(value);
      setIsCustomInput(true);
    } else {
      setIsCustomInput(false);
      setCustomPosition('');
    }
  }, [value]);

  const handleSelect = (pos: string) => {
    if (pos === 'Other') {
      setIsCustomInput(true);
      setCustomPosition('');
    } else {
      onChangeText(pos);
      setIsCustomInput(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.inputTrigger, isDark ? styles.inputDark : styles.inputLight]} //
        onPress={() => setShowModal(true)}
      >
        <Text style={[styles.inputText, isDark ? styles.textLight : styles.textDark, !value && styles.placeholderText]}>
          {value || label || "Select Position"}
        </Text>
        <Ionicons name="chevron-down" size={20} color={isDark ? '#FFFFFF' : '#1A3A5C'} />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, isDark ? styles.modalDark : styles.modalLight]}>
          <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setShowModal(false); setIsCustomInput(false); }}>
                <Ionicons name="close" size={28} color={isDark ? '#FFFFFF' : '#1A3A5C'} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, isDark ? styles.textLight : styles.textDark]}>
                {isCustomInput ? "Custom Position" : "Select Position"}
              </Text>
              {isCustomInput ? (
                <TouchableOpacity onPress={() => { onChangeText(customPosition); setShowModal(false); }}>
                  <Ionicons name="checkmark" size={28} color="#00BFFF" />
                </TouchableOpacity>
              ) : <View style={{ width: 28 }} />}
            </View>

            {isCustomInput ? (
              <View style={styles.customInputContainer}>
                <TextInput
                  style={[styles.inputTrigger, isDark ? styles.inputDark : styles.inputLight, isDark ? styles.textLight : styles.textDark]}
                  value={customPosition}
                  onChangeText={setCustomPosition}
                  autoFocus
                  placeholder="Type position name..."
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} //
                />
              </View>
            ) : (
              <ScrollView bounces={true}>
                {positions.map((pos) => (
                  <TouchableOpacity 
                    key={pos} 
                    style={[styles.option, isDark ? styles.optionDark : styles.optionLight]} 
                    onPress={() => handleSelect(pos)}
                  >
                    <Text style={[styles.optionText, isDark ? styles.textLight : styles.textDark, value === pos && styles.selectedText]}>
                      {pos}
                    </Text>
                    {value === pos && <Ionicons name="checkmark-circle" size={22} color="#00BFFF" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  inputTrigger: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    borderRadius: 12, 
    borderWidth: 1, 
    height: 60 // Высота как у Вашего календаря
  },
  inputDark: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }, //
  inputLight: { backgroundColor: '#FFFFFF', borderColor: '#E0E0E0' }, //
  inputText: { fontSize: 16 },
  placeholderText: { opacity: 0.5 },
  textLight: { color: '#FFFFFF' }, //
  textDark: { color: '#1A3A5C' }, //
  
  modalContainer: { flex: 1 },
  modalDark: { backgroundColor: '#0a1628' }, //
  modalLight: { backgroundColor: '#F5F5F5' }, //
  
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(128,128,128,0.1)' 
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  customInputContainer: { padding: 20 },
  
  option: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 18, 
    borderBottomWidth: 1 
  },
  optionDark: { borderBottomColor: 'rgba(255,255,255,0.05)' },
  optionLight: { borderBottomColor: 'rgba(0,0,0,0.05)' },
  optionText: { fontSize: 16 },
  selectedText: { color: '#00BFFF', fontWeight: '600' }
});