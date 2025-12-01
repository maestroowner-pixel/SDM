import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../contexts/DataContext';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  onEdit?: () => void;
  onDelete?: () => void;
  statusColor?: string;
}

export const Card: React.FC<Props> = ({ children, style, onEdit, onDelete, statusColor }) => {
  const { state } = useData();
  const isDark = state.theme === 'dark';

  return (
    <View style={[
      styles.card,
      isDark ? styles.cardDark : styles.cardLight,
      style
    ]}>
      {statusColor && <View style={[styles.status, { backgroundColor: statusColor }]} />}
      <View style={styles.content}>
        {children}
      </View>
      {(onEdit || onDelete) && (
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
              <Ionicons name="pencil" size={18} color={isDark ? '#64b5f6' : '#1976d2'} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
              <Ionicons name="trash" size={18} color="#f44336" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  status: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 8,
  },
});
