import React from 'react';
import { StyleSheet, TouchableOpacity, Text, ViewStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

export const Button: React.FC<Props> = ({ 
  title, 
  onPress, 
  style, 
  variant = 'primary',
  loading,
  disabled 
}) => {
  const getColors = () => {
    switch (variant) {
      case 'primary': return ['#1976d2', '#2196f3', '#42a5f5'];
      case 'secondary': return ['#455a64', '#546e7a', '#607d8b'];
      case 'danger': return ['#c62828', '#d32f2f', '#e53935'];
    }
  };

  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={loading || disabled}
      style={[styles.touchable, style]}
    >
      <LinearGradient
        colors={getColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.button, (loading || disabled) && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
