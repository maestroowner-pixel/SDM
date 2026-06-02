import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../contexts/DataContext';
import { Button } from '../components/Button';
import { t } from '../utils/i18n';
import { useTablet } from '../hooks/useTablet'; // ← ДОБАВЛЕНО
import { Ionicons } from '@expo/vector-icons';

const GHOST_SCROLL_IMAGE = require('../assets/images/ghost-scroll.png');

export const NotesScreen: React.FC = () => {
  const { state, updateNotes, toggleIncludeNotesInCV } = useData();
  const isDark = state.theme === 'dark';
  const isTablet = useTablet(); // ← ДОБАВЛЕНО

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Image
          source={GHOST_SCROLL_IMAGE}
          style={[
            styles.scrollBackground, 
            { 
              opacity: isDark ? 0.08 : 0.15, 
              tintColor: isDark ? '#64b5f6' : '#2B7CC1' 
            }
          ]}
          resizeMode="cover"
        />
        
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={isTablet ? styles.scrollContentTablet : undefined}>
          <View style={isTablet ? styles.centeredContent : undefined}>
          <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
            <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>
              {t('notes.title')}
            </Text>
            
            <Text style={[styles.subtitle, isDark ? styles.textMuted : styles.textMutedLight]}>
              {t('notes.subtitle')}
            </Text>

            <TextInput
              style={[
                styles.textArea,
                isDark ? styles.textAreaDark : styles.textAreaLight
              ]}
              value={state.notes}
              onChangeText={updateNotes}
              placeholder={t('notes.placeholder')}
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
              multiline
              textAlignVertical="top"
            />

            {/* Чекбокс для включения в CV */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={toggleIncludeNotesInCV}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                isDark ? styles.checkboxDark : styles.checkboxLight,
                state.includeNotesInCV && styles.checkboxChecked
              ]}>
                {state.includeNotesInCV && (
                  <Ionicons 
                    name="checkmark" 
                    size={18} 
                    color="#fff" 
                  />
                )}
              </View>
              <Text style={[
                styles.checkboxLabel,
                isDark ? styles.textLight : styles.textDark
              ]}>
                {t('notes.includeInCV')}
              </Text>
            </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  // ↓ НОВЫЕ СТИЛИ iPad
  scrollContentTablet: { alignItems: 'center' },
  centeredContent: { width: '100%', maxWidth: 600 },
  // ↑ КОНЕЦ НОВЫХ СТИЛЕЙ
  section: {
    padding: 16,
    borderRadius: 16,
    flex: 1,
  },
  sectionDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxDark: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  checkboxLight: {
    borderColor: 'rgba(0, 0, 0, 0.2)',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#64b5f6',
    borderColor: '#64b5f6',
  },
  checkboxLabel: {
    fontSize: 16,
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