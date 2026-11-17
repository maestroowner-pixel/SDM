// Strip above every screen while the first-launch example data is in place.
// "Delete" empties the records for good (DataContext.removeSampleData); after that
// neither the example nor this banner appears again.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../contexts/DataContext';
import { confirmAsync } from '../utils/dialog';
import { t } from '../utils/i18n';

export const SampleDataBanner: React.FC = () => {
  const { state, removeSampleData } = useData();
  if (!state.sampleSeeded) return null;
  const isDark = state.theme === 'dark';

  const onRemove = async () => {
    const ok = await confirmAsync(
      t('sample.confirmTitle'),
      t('sample.confirmMessage'),
      { confirmText: t('common.delete'), destructive: true }
    );
    if (ok) await removeSampleData();
  };

  return (
    <View style={[styles.banner, isDark ? styles.bannerDark : styles.bannerLight]}>
      <Ionicons name="flask-outline" size={18} color={isDark ? '#64b5f6' : '#1976d2'} />
      <Text style={[styles.text, { color: isDark ? '#fff' : '#1A3A5C' }]} numberOfLines={2}>
        {t('sample.banner')}
      </Text>
      <TouchableOpacity style={styles.button} onPress={onRemove} activeOpacity={0.7}>
        <Text style={styles.buttonText}>{t('common.delete')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 },
  bannerDark: { backgroundColor: 'rgba(100, 181, 246, 0.15)' },
  bannerLight: { backgroundColor: 'rgba(25, 118, 210, 0.1)' },
  text: { flex: 1, fontSize: 13 },
  button: { backgroundColor: '#f44336', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
