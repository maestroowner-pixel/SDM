import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../contexts/DataContext';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
  disabled = false,
  loading = false,
  icon,
}) => {
  const { state } = useData();
  const isDark = state.theme === 'dark';

  const getBackgroundColor = () => {
    if (disabled) return isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    switch (variant) {
      case 'primary':
        return isDark ? '#1976D2' : '#1565C0';
      case 'secondary':
        return isDark ? '#7E57C2' : '#1976D2';
      case 'danger': 
        return 'rgba(255, 59, 48, 0.9)'; 
      case 'outline': 
        return 'transparent';
      default: 
        return isDark ? '#1976D2' : '#1565C0';
    }
  };

  const getTextColor = () => {
    if (variant === 'outline') {
      return isDark ? '#64B5F6' : '#1565C0';
    }
    return '#FFFFFF';
  };

  const getBorderColor = () => {
    if (variant === 'outline') {
      return isDark ? '#64B5F6' : '#1565C0';
    }
    return 'transparent';
  };

  const iconSize = size === 'small' ? 16 : size === 'large' ? 22 : 18;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        styles[size] as ViewStyle,
        {
          backgroundColor: getBackgroundColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: getBorderColor()
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={getTextColor()} style={styles.leading} />
        ) : icon ? (
          <Ionicons name={icon} size={iconSize} color={getTextColor()} style={styles.leading} />
        ) : null}
        <Text style={[
          styles.text,
          styles[`${size}Text` as keyof typeof styles] as TextStyle,
          { color: getTextColor() },
          textStyle
        ]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: { borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  leading: { marginRight: 8 },
  text: { fontWeight: '600' },
  small: { paddingVertical: 6, paddingHorizontal: 12 },
  medium: { paddingVertical: 12, paddingHorizontal: 24 },
  large: { paddingVertical: 16, paddingHorizontal: 32 },
  smallText: { fontSize: 14 },
  mediumText: { fontSize: 16 },
  largeText: { fontSize: 18 },
});