// src/components/PremiumBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface PremiumBadgeProps {
  size?: 'small' | 'medium' | 'large';
  type?: 'monthly' | 'lifetime';
}

export default function PremiumBadge({ size = 'medium', type = 'lifetime' }: PremiumBadgeProps) {
  const sizes = {
    small: { container: 60, icon: 16, text: 10 },
    medium: { container: 80, icon: 20, text: 11 },
    large: { container: 100, icon: 24, text: 12 },
  };

  const colors = type === 'lifetime' 
    ? ['#FFD700', '#FFA000']
    : ['#4FC3F7', '#0288D1'];

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, { width: sizes[size].container, height: sizes[size].container }]}
    >
      <Ionicons 
        name={type === 'lifetime' ? 'trophy' : 'shield-checkmark'} 
        size={sizes[size].icon} 
        color="#fff" 
      />
      <Text style={[styles.text, { fontSize: sizes[size].text }]}>
        {type === 'lifetime' ? 'LIFETIME' : 'PREMIUM'}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 4,
    fontFamily: 'Inter-Bold',
  },
});