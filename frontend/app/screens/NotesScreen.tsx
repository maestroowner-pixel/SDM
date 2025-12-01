import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
} from 'react-native';
import { useData } from '../contexts/DataContext';
import { Button } from '../components/Button';

export const NotesScreen: React.FC = () => {
  const { state, updateNotes } = useData();
  const isDark = state.theme === 'dark';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
          <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>Notes</Text>
          <Text style={[styles.subtitle, isDark ? styles.textMuted : styles.textMutedLight]}>
            Add any important notes or reminders here
          </Text>
          <TextInput
            style={[
              styles.textArea,
              isDark ? styles.textAreaDark : styles.textAreaLight
            ]}
            value={state.notes}
            onChangeText={updateNotes}
            placeholder="Write your notes here..."
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 16,
    flex: 1,
  },
  sectionDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 300,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
  },
  textAreaDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
  },
  textAreaLight: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    color: '#333',
  },
  textLight: {
    color: '#fff',
  },
  textDark: {
    color: '#333',
  },
  textMuted: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  textMutedLight: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
});
