import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

  // «Стеклянная» объёмная заливка: светлее сверху, темнее снизу, блик и свечение.
  // Только для залитых вариантов; outline и disabled остаются плоскими.
  const getGlass = (): { colors: [string, string]; glow: string } | null => {
    if (disabled || variant === 'outline') return null;
    switch (variant) {
      case 'secondary':
        return isDark
          ? { colors: ['rgba(156, 127, 214, 0.95)', 'rgba(94, 53, 177, 0.95)'], glow: 'rgba(126, 87, 194, 0.45)' }
          : { colors: ['rgba(66, 165, 245, 0.95)', 'rgba(21, 101, 192, 0.95)'], glow: 'rgba(25, 118, 210, 0.35)' };
      case 'danger':
        return { colors: ['rgba(255, 112, 102, 0.95)', 'rgba(211, 47, 47, 0.95)'], glow: 'rgba(255, 59, 48, 0.4)' };
      default:
        return isDark
          ? { colors: ['rgba(66, 165, 245, 0.95)', 'rgba(21, 101, 192, 0.95)'], glow: 'rgba(25, 118, 210, 0.5)' }
          : { colors: ['rgba(61, 139, 224, 0.95)', 'rgba(13, 71, 161, 0.95)'], glow: 'rgba(21, 101, 192, 0.35)' };
    }
  };
  const glass = getGlass();

  const iconSize = size === 'small' ? 16 : size === 'large' ? 22 : 18;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        styles[size] as ViewStyle,
        glass
          ? {
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.28)',
              borderBottomColor: 'rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              boxShadow: `0 4px 14px ${glass.glow}`,
            }
          : {
              backgroundColor: getBackgroundColor(),
              borderWidth: variant === 'outline' ? 1 : 0,
              borderColor: getBorderColor()
            },
        style,
      ]}
      activeOpacity={0.7}
    >
      {glass && (
        <>
          <LinearGradient colors={glass.colors} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.32)', 'rgba(255, 255, 255, 0.04)']}
            style={styles.sheen}
            pointerEvents="none"
          />
        </>
      )}
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
  // Блик на верхней половине кнопки
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
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