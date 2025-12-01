import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../contexts/DataContext';
import { BlurView } from 'expo-blur';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const FormModal: React.FC<Props> = ({ visible, title, onClose, children }) => {
  const { state } = useData();
  const isDark = state.theme === 'dark';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={[
            styles.modal,
            isDark ? styles.modalDark : styles.modalLight
          ]}>
            <View style={styles.header}>
              <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>
                {title}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={isDark ? '#fff' : '#333'} />
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardView: {
    width: '100%',
    maxHeight: '90%',
  },
  modal: {
    borderRadius: 20,
    maxHeight: '100%',
    width: '100%',
    overflow: 'hidden',
  },
  modalDark: {
    backgroundColor: '#1a2a4a',
  },
  modalLight: {
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  textLight: {
    color: '#fff',
  },
  textDark: {
    color: '#333',
  },
  closeBtn: {
    padding: 4,
  },
  scrollView: {
    padding: 20,
  },
});
