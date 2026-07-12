// screens/SettingsScreen.tsx — Web version.
// Theme, language, DP module toggle, data export/import (.sdm via Blob), clear
// data, premium status (Lemon Squeezy wiring comes in Phase 6), and about links.
import React, { useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, Image, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';
import { useData } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { alertMsg, confirmAsync } from '../utils/webAlert';
import { t } from '../utils/i18n';

const GHOST_STARFISH_BG = require('../assets/images/ghost-starfish.png');
const TERMS_URL = 'https://sdm.kuka-lab.com/terms-of-service';
const PRIVACY_URL = 'https://sdm.kuka-lab.com/privacy-policy';
const WEBSITE_URL = 'https://sdm.kuka-lab.com';

const LANGUAGES = [
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'uk', label: 'UK', flag: '🇺🇦' },
  { code: 'pl', label: 'PL', flag: '🇵🇱' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'ru', label: 'RU', flag: '🇷🇺' },
  { code: 'tl', label: 'TL', flag: '🇵🇭' },
  { code: 'zh', label: 'ZH', flag: '🇨🇳' },
  { code: 'hi', label: 'HI', flag: '🇮🇳' },
];

interface SettingsScreenProps {
  onOpenPaywall?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onOpenPaywall }) => {
  const { state, setTheme, exportData, importData, clearAllData, toggleDPScreen } = useData();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { isConfigured: authConfigured, user, logout } = useAuth();
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const isDark = state.theme === 'dark';

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const cardStyle = [styles.card, isDark ? styles.cardDark : styles.cardLight];
  const titleColor = isDark ? '#fff' : '#1A3A5C';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';

  const handleExport = () => {
    try {
      setExporting(true);
      const data = exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `SDM_backup_${date}.sdm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      console.error('Export failed:', e);
      alertMsg(t('common.error'), 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: false });
      if (result.canceled || !result.assets?.length) return;
      setImporting(true);

      // Read the picked file directly via the File API (most reliable on web);
      // fall back to fetching the blob URL.
      const asset: any = result.assets[0];
      let text = '';
      if (asset.file && typeof asset.file.text === 'function') {
        text = await asset.file.text();
      } else {
        const resp = await fetch(asset.uri);
        text = await resp.text();
      }

      if (!text || !text.trim()) {
        alertMsg(t('common.error'), 'The selected file is empty.');
        return;
      }

      // Validate JSON here so we can surface the actual reason.
      try {
        JSON.parse(text);
      } catch (parseErr: any) {
        console.error('Backup parse error:', parseErr, 'first 100 chars:', text.slice(0, 100));
        alertMsg(t('common.error'), `Not a valid backup file (${parseErr?.message || 'parse error'}).`);
        return;
      }

      const ok = await importData(text);
      alertMsg(
        ok ? t('common.success') : t('common.error'),
        ok ? (t('settings.alerts.dataRestored') !== 'settings.alerts.dataRestored' ? t('settings.alerts.dataRestored') : 'Data restored') : 'Could not import this backup.'
      );
    } catch (e: any) {
      console.error('Import failed:', e);
      alertMsg(t('common.error'), `Import failed: ${e?.message || e}`);
    } finally {
      setImporting(false);
    }
  };

  const handleClear = () => {
    if (confirmAsync(t('settings.clearData') || 'Clear all data', 'This will permanently erase all your data on this device. Continue?')) {
      clearAllData();
    }
  };

  const openUrl = (url: string) => Linking.openURL(url).catch(() => {});

  const version = (Constants.expoConfig?.version as string) || '1.0.0';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <Image source={GHOST_STARFISH_BG} style={[styles.bg, { opacity: isDark ? 0.07 : 0.1 }]} resizeMode="cover" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.centered}>

          {/* Account */}
          {authConfigured && user && (
            <>
              <Text style={[styles.sectionTitle, { color: mutedColor }]}>Account</Text>
              <View style={cardStyle}>
                <View style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="person-circle-outline" size={22} color={isDark ? '#64b5f6' : '#1976d2'} />
                    <Text style={[styles.rowLabel, { color: titleColor }]} numberOfLines={1}>{user.email}</Text>
                  </View>
                  <TouchableOpacity style={styles.signOutBtn} onPress={() => logout()}>
                    <Ionicons name="log-out-outline" size={18} color="#f44336" />
                    <Text style={styles.signOutText}>Sign out</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* Appearance */}
          <Text style={[styles.sectionTitle, { color: mutedColor }]}>{t('settings.appearance') !== 'settings.appearance' ? t('settings.appearance') : 'Appearance'}</Text>
          <View style={cardStyle}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={isDark ? '#64b5f6' : '#1976d2'} />
                <Text style={[styles.rowLabel, { color: titleColor }]}>{t('settings.darkMode') !== 'settings.darkMode' ? t('settings.darkMode') : 'Dark mode'}</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(v) => setTheme(v ? 'dark' : 'light')}
                trackColor={{ false: '#ccc', true: '#1976d2' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Language */}
          <Text style={[styles.sectionTitle, { color: mutedColor }]}>{t('settings.language') !== 'settings.language' ? t('settings.language') : 'Language'}</Text>
          <View style={cardStyle}>
            <View style={styles.langGrid}>
              {LANGUAGES.map((lang) => {
                const active = currentLanguage === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langChip, active ? styles.langChipActive : (isDark ? styles.langChipDark : styles.langChipLight)]}
                    onPress={() => changeLanguage(lang.code)}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <Text style={[styles.langLabel, { color: active ? '#fff' : titleColor }]}>{lang.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Modules */}
          <Text style={[styles.sectionTitle, { color: mutedColor }]}>{t('settings.modules') !== 'settings.modules' ? t('settings.modules') : 'Modules'}</Text>
          <View style={cardStyle}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="compass" size={22} color={isDark ? '#64b5f6' : '#1976d2'} />
                <Text style={[styles.rowLabel, { color: titleColor }]}>DP Log</Text>
              </View>
              <Switch
                value={state.showDPScreen}
                onValueChange={toggleDPScreen}
                trackColor={{ false: '#ccc', true: '#1976d2' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Premium */}
          <Text style={[styles.sectionTitle, { color: mutedColor }]}>Premium</Text>
          <View style={cardStyle}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name={isPremium ? 'star' : 'star-outline'} size={22} color="#FFC107" />
                <Text style={[styles.rowLabel, { color: titleColor }]}>
                  {subscriptionLoading ? '…' : isPremium ? (t('settings.premiumActive') !== 'settings.premiumActive' ? t('settings.premiumActive') : 'Premium active') : 'Free plan'}
                </Text>
              </View>
              {!isPremium && (
                <TouchableOpacity
                  style={styles.upgradeBtn}
                  onPress={() => (onOpenPaywall ? onOpenPaywall() : alertMsg('Premium', 'Checkout will be available soon.'))}
                >
                  <Text style={styles.upgradeBtnText}>{t('settings.upgrade') !== 'settings.upgrade' ? t('settings.upgrade') : 'Upgrade'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Data */}
          <Text style={[styles.sectionTitle, { color: mutedColor }]}>{t('settings.data') !== 'settings.data' ? t('settings.data') : 'Data'}</Text>
          <View style={cardStyle}>
            <TouchableOpacity style={styles.actionRow} onPress={handleExport} disabled={exporting}>
              <View style={styles.rowLeft}>
                <Ionicons name="download-outline" size={22} color={isDark ? '#64b5f6' : '#1976d2'} />
                <Text style={[styles.rowLabel, { color: titleColor }]}>{t('settings.exportData') !== 'settings.exportData' ? t('settings.exportData') : 'Export backup (.sdm)'}</Text>
              </View>
              {exporting ? <ActivityIndicator size="small" color="#1976d2" /> : <Ionicons name="chevron-forward" size={20} color={mutedColor} />}
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.actionRow} onPress={handleImport} disabled={importing}>
              <View style={styles.rowLeft}>
                <Ionicons name="cloud-upload-outline" size={22} color={isDark ? '#64b5f6' : '#1976d2'} />
                <Text style={[styles.rowLabel, { color: titleColor }]}>{t('settings.importData') !== 'settings.importData' ? t('settings.importData') : 'Import backup'}</Text>
              </View>
              {importing ? <ActivityIndicator size="small" color="#1976d2" /> : <Ionicons name="chevron-forward" size={20} color={mutedColor} />}
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.actionRow} onPress={handleClear}>
              <View style={styles.rowLeft}>
                <Ionicons name="trash-outline" size={22} color="#f44336" />
                <Text style={[styles.rowLabel, { color: '#f44336' }]}>{t('settings.clearData') !== 'settings.clearData' ? t('settings.clearData') : 'Clear all data'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={mutedColor} />
            </TouchableOpacity>
          </View>

          {/* About */}
          <Text style={[styles.sectionTitle, { color: mutedColor }]}>{t('settings.about') !== 'settings.about' ? t('settings.about') : 'About'}</Text>
          <View style={cardStyle}>
            <TouchableOpacity style={styles.actionRow} onPress={() => openUrl(WEBSITE_URL)}>
              <View style={styles.rowLeft}><Ionicons name="globe-outline" size={22} color={isDark ? '#64b5f6' : '#1976d2'} /><Text style={[styles.rowLabel, { color: titleColor }]}>Website</Text></View>
              <Ionicons name="open-outline" size={18} color={mutedColor} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.actionRow} onPress={() => openUrl(TERMS_URL)}>
              <View style={styles.rowLeft}><Ionicons name="document-text-outline" size={22} color={isDark ? '#64b5f6' : '#1976d2'} /><Text style={[styles.rowLabel, { color: titleColor }]}>{t('settings.terms') !== 'settings.terms' ? t('settings.terms') : 'Terms of Service'}</Text></View>
              <Ionicons name="open-outline" size={18} color={mutedColor} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.actionRow} onPress={() => openUrl(PRIVACY_URL)}>
              <View style={styles.rowLeft}><Ionicons name="shield-checkmark-outline" size={22} color={isDark ? '#64b5f6' : '#1976d2'} /><Text style={[styles.rowLabel, { color: titleColor }]}>{t('settings.privacy') !== 'settings.privacy' ? t('settings.privacy') : 'Privacy Policy'}</Text></View>
              <Ionicons name="open-outline" size={18} color={mutedColor} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.version, { color: mutedColor }]}>SDM Web v{version}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  scroll: { padding: 24, paddingBottom: 60 },
  centered: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 24, marginBottom: 10, marginLeft: 4 },
  card: { borderRadius: 16, paddingHorizontal: 18, paddingVertical: 6 },
  cardDark: { backgroundColor: 'rgba(255,255,255,0.08)' },
  cardLight: { backgroundColor: 'rgba(255,255,255,0.6)' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1 },
  rowLabel: { fontSize: 17, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(128,128,128,0.3)' },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 12 },
  langChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  langChipActive: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  langChipDark: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' },
  langChipLight: { backgroundColor: 'rgba(255,255,255,0.5)', borderColor: 'rgba(0,0,0,0.1)' },
  langFlag: { fontSize: 20 },
  langLabel: { fontSize: 15, fontWeight: '600' },
  upgradeBtn: { backgroundColor: '#1976d2', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 10 },
  upgradeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(244,67,54,0.5)' },
  signOutText: { color: '#f44336', fontSize: 14, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 13, marginTop: 30 },
});
