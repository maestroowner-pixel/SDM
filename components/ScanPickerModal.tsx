import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../utils/i18n';
import type { AttachedFile } from '../utils/scanUtils';

interface Props {
  visible: boolean;
  scans: AttachedFile[];
  isDark: boolean;
  onSelect: (scan: AttachedFile) => void;
  onClose: () => void;
}

const formatSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

export const ScanPickerModal: React.FC<Props> = ({ visible, scans, isDark, onSelect, onClose }) => {
  const bg = isDark ? '#10233b' : '#fff';
  const text = isDark ? '#fff' : '#1a1a1a';
  const sub = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const rowBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';

  // Оверлей-View (НЕ RN Modal): чтобы корректно показываться поверх уже открытой
  // модалки редактирования Documents/Sea Service на iOS (modal-over-modal там не работает).
  if (!visible) return null;
  return (
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bg }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: text }]}>{t('attach.pickerTitle')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={sub} />
            </TouchableOpacity>
          </View>

          {scans.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="scan-outline" size={48} color={sub} />
              <Text style={[styles.emptyText, { color: sub }]}>{t('attach.noScans')}</Text>
            </View>
          ) : (
            <FlatList
              data={scans}
              keyExtractor={(item, i) => item.uri + i}
              contentContainerStyle={{ paddingBottom: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.row, { backgroundColor: rowBg }]}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text-outline" size={22} color="#00bcd4" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: text }]} numberOfLines={1}>{item.fileName}</Text>
                    <Text style={[styles.meta, { color: sub }]}>
                      {formatSize(item.size)} · {new Date(item.uploadDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color="#00bcd4" />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
  );
};

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 1000, elevation: 1000 },
  sheet: { maxHeight: '70%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, marginBottom: 8 },
  name: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 2 },
});
