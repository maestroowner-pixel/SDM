import React from 'react';
import { StyleSheet, View, Text, TextInput, TextInputProps } from 'react-native';
import { useData } from '../contexts/DataContext';

interface Props extends TextInputProps {
  label: string;
  required?: boolean;
}

export const FormInput: React.FC<Props> = ({ label, required, ...props }) => {
  const { state } = useData();
  const isDark = state.theme === 'dark';

  return (
    <View style={styles.container}>
      <Text style={[styles.label, isDark ? styles.labelDark : styles.labelLight]}>
        {label}{required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          isDark ? styles.inputDark : styles.inputLight
        ]}
        placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
        {...props}
      />
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
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  inputDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    color: '#fff',
  },
  inputLight: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    color: '#333',
  },
});
