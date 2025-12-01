import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useData } from '../contexts/DataContext';
import { Button } from '../components/Button';

export const SettingsScreen: React.FC = () => {
  const { state, setTheme, exportData, importData, clearAllData } = useData();
  const [exporting, setExporting] = useState(false);
  const isDark = state.theme === 'dark';

  const handleExportBackup = async () => {
    try {
      setExporting(true);
      const data = exportData();
      const fileName = `seafarer_backup_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, data);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Export Backup',
        });
      } else {
        Alert.alert('Success', 'Backup file created');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export backup');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const handleImportBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
        const success = importData(content);
        
        if (success) {
          Alert.alert('Success', 'Data restored successfully');
        } else {
          Alert.alert('Error', 'Invalid backup file');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import backup');
      console.error(error);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            clearAllData();
            Alert.alert('Success', 'All data has been cleared');
          },
        },
      ]
    );
  };

  const SettingRow = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement,
    danger 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.iconContainer, danger && styles.iconDanger]}>
        <Ionicons name={icon as any} size={22} color={danger ? '#f44336' : (isDark ? '#64b5f6' : '#1976d2')} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, isDark ? styles.textLight : styles.textDark, danger && styles.textDanger]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, isDark ? styles.textMuted : styles.textMutedLight]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement || (onPress && (
        <Ionicons name="chevron-forward" size={20} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} />
      ))}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
          <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Appearance</Text>
          <SettingRow
            icon="moon"
            title="Dark Theme"
            subtitle="Switch between light and dark mode"
            rightElement={
              <Switch
                value={state.theme === 'dark'}
                onValueChange={(v) => setTheme(v ? 'dark' : 'light')}
                trackColor={{ false: '#767577', true: '#64b5f6' }}
                thumbColor={state.theme === 'dark' ? '#1976d2' : '#f4f3f4'}
              />
            }
          />
        </View>

        <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
          <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Backup & Restore</Text>
          <SettingRow
            icon="cloud-upload"
            title="Export Backup"
            subtitle="Save your data to a file"
            onPress={handleExportBackup}
          />
          <SettingRow
            icon="cloud-download"
            title="Import Backup"
            subtitle="Restore data from a backup file"
            onPress={handleImportBackup}
          />
        </View>

        <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
          <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Data</Text>
          <SettingRow
            icon="trash"
            title="Clear All Data"
            subtitle="Delete all data from the app"
            onPress={handleClearData}
            danger
          />
        </View>

        <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
          <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>About</Text>
          <SettingRow
            icon="information-circle"
            title="Seafarer Documents Manager by Mykhaylo Osypov"
            subtitle="Version 0.1.3"
          />
        </View>

        <View style={{ height: 40 }} />
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
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    padding: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(100, 181, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconDanger: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
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
  textDanger: {
    color: '#f44336',
  },
});
