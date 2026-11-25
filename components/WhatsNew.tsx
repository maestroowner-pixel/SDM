// "What's new" window: shown once after the app is updated to a version that has
// notes here (WHATS_NEW_VERSIONS). Not shown on a fresh install — a new user has
// nothing to compare with. Closed with the "Got it" button.
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useData } from '../contexts/DataContext';
import { t } from '../utils/i18n';
import { installedVersion } from '../utils/storeUpdate';
import { Button } from './Button';

const SEEN_KEY = 'whats_new_seen_version';
// Same key as in SplashScreen: set once the user accepted the terms on first launch.
const AGREEMENT_KEY = '@sdm_agreement_accepted';

// Versions that have notes in locales → whatsNew.v<major>_<minor>_<patch>
const WHATS_NEW_VERSIONS = ['3.3.0'];

const ITEMS: { key: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'fillPhoto', icon: 'scan-outline' },
  { key: 'fileNames', icon: 'document-text-outline' },
  { key: 'design', icon: 'sparkles-outline' },
  { key: 'fixes', icon: 'construct-outline' },
];

// Read at app start — before the first-launch consent can write the key — so that
// "no agreement yet" reliably means a fresh install, not an update.
const wasInstalledBefore = AsyncStorage.getItem(AGREEMENT_KEY).then(v => !!v).catch(() => false);

export const WhatsNew: React.FC = () => {
  const { state } = useData();
  const isDark = state.theme === 'dark';
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const current = installedVersion();
      const seen = await AsyncStorage.getItem(SEEN_KEY).catch(() => null);
      if (seen === current) return;
      const existingUser = await wasInstalledBefore;
      if (existingUser && WHATS_NEW_VERSIONS.includes(current)) {
        setVersion(current);
      } else {
        // Fresh install or a version without notes: remember it and stay quiet.
        AsyncStorage.setItem(SEEN_KEY, current).catch(() => {});
      }
    })();
  }, []);

  if (!version) return null;

  const close = () => {
    AsyncStorage.setItem(SEEN_KEY, version).catch(() => {});
    setVersion(null);
  };
  const ns = `whatsNew.v${version.replace(/\./g, '_')}`;

  const c = {
    card: isDark ? '#1a2a4a' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A3A5C',
    sub: isDark ? 'rgba(255,255,255,0.72)' : '#4A6A8C',
    accent: isDark ? '#00BFFF' : '#1565C0',
    iconBg: isDark ? 'rgba(0,191,255,0.14)' : 'rgba(21,101,192,0.1)',
    border: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(21,101,192,0.15)',
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.title, { color: c.text }]}>{t('whatsNew.title', { version })}</Text>
          <ScrollView style={styles.list} contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
            {ITEMS.map(it => (
              <View key={it.key} style={styles.row}>
                <View style={[styles.icon, { backgroundColor: c.iconBg }]}>
                  <Ionicons name={it.icon} size={22} color={c.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: c.text }]}>{t(`${ns}.${it.key}.title`)}</Text>
                  <Text style={[styles.itemText, { color: c.sub }]}>{t(`${ns}.${it.key}.text`)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <Button title={t('whatsNew.ok')} onPress={close} size="large" style={{ marginTop: 20 }} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 460, maxHeight: '85%', borderRadius: 20, borderWidth: 1, padding: 22 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 18 },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  itemText: { fontSize: 14, lineHeight: 20 },
});
