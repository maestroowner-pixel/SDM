import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useData } from '../contexts/DataContext';

interface Props {
  children: React.ReactNode;
}

export const GradientBackground: React.FC<Props> = ({ children }) => {
  const { state } = useData();
  const isDark = state.theme === 'dark';

  return (
    <LinearGradient
      colors={isDark 
        ? ['#0a1628', '#1a2a4a', '#0d1a2d']
        : ['#e8f4fc', '#d4e8f5', '#c0dced']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
