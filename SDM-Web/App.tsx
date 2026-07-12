// SDM Web — desktop shell (sidebar nav), ported/adapted from native app/index.tsx.
// No MPC / 12 nm, no swipe carousel; optimized for 13"+ screens.
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { UI_THEME } from './utils/theme';
import { t } from './utils/i18n';
import { DataProvider, useData } from './contexts/DataContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { SyncProvider } from './contexts/SyncContext';
import { DialogProvider } from './contexts/DialogContext';
import { AuthScreen } from './screens/AuthScreen';
import { PaywallScreen } from './screens/PaywallScreen';
import { PersonalScreen } from './screens/PersonalScreen';
import { DocumentsScreen } from './screens/DocumentsScreen';
import { SeaServiceScreen } from './screens/SeaServiceScreen';
import { BiometricsScreen } from './screens/BiometricsScreen';
import { EducationScreen } from './screens/EducationScreen';
import { NextOfKinScreen } from './screens/NextOfKinScreen';
import { NotesScreen } from './screens/NotesScreen';
import { QRScreen } from './screens/QRScreen';
import { CVScreen } from './screens/CVScreen';
import DPScreen from './screens/DPScreen';
import { ScansScreen } from './screens/ScansScreen';
import { SettingsScreen } from './screens/SettingsScreen';

type TabType =
  | 'personal' | 'documents' | 'seaService' | 'biometrics' | 'education'
  | 'nextOfKin' | 'notes' | 'qr' | 'cv' | 'scans' | 'dp' | 'settings';

const NAV_TABS: { id: TabType; icon: string; label: string; dpOnly?: boolean }[] = [
  { id: 'personal',   icon: 'person',          label: 'personal.title' },
  { id: 'documents',  icon: 'document-text',   label: 'documents.title' },
  { id: 'seaService', icon: 'boat',            label: 'seaService.title' },
  { id: 'biometrics', icon: 'body',            label: 'biometrics.title' },
  { id: 'education',  icon: 'school',          label: 'education.title' },
  { id: 'nextOfKin',  icon: 'people',          label: 'nextOfKin.sections.emergencyContact' },
  { id: 'notes',      icon: 'create',          label: 'notes.title' },
  { id: 'qr',         icon: 'qr-code',         label: 'qr.title' },
  { id: 'cv',         icon: 'document',        label: 'cv.title' },
  { id: 'scans',      icon: 'document-attach', label: 'scans.title' },
  { id: 'dp',         icon: 'compass',         label: 'DP Log', dpOnly: true },
  { id: 'settings',   icon: 'settings',        label: 'settings.title' },
];

const Placeholder: React.FC<{ title: string; theme: any }> = ({ title, theme }) => (
  <View style={styles.placeholder}>
    <Ionicons name="construct-outline" size={64} color={theme.textSecondary} />
    <Text style={[styles.placeholderTitle, { color: theme.text }]}>{title}</Text>
    <Text style={[styles.placeholderSub, { color: theme.textSecondary }]}>
      Screen port in progress
    </Text>
  </View>
);

const Shell: React.FC = () => {
  const { state } = useData();
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [showPaywall, setShowPaywall] = useState(false);
  const openPaywall = () => setShowPaywall(true);
  const isDark = state.theme === 'dark';
  const theme = isDark ? UI_THEME.colors.dark : UI_THEME.colors.light;

  const tabs = React.useMemo(
    () => NAV_TABS.filter(tab => !tab.dpOnly || state.showDPScreen),
    [state.showDPScreen]
  );

  useEffect(() => {
    if (!tabs.find(tab => tab.id === activeTab)) setActiveTab('personal');
  }, [tabs]);

  const activeLabel = () => {
    const tab = NAV_TABS.find(item => item.id === activeTab);
    return tab ? t(tab.label) : '';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'personal':   return <PersonalScreen />;
      case 'documents':  return <DocumentsScreen onOpenPaywall={openPaywall} />;
      case 'seaService': return <SeaServiceScreen />;
      case 'biometrics': return <BiometricsScreen />;
      case 'education':  return <EducationScreen />;
      case 'nextOfKin':  return <NextOfKinScreen />;
      case 'notes':      return <NotesScreen />;
      case 'qr':         return <QRScreen />;
      case 'cv':         return <CVScreen />;
      case 'scans':      return <ScansScreen />;
      case 'dp':         return <DPScreen />;
      case 'settings':   return <SettingsScreen onOpenPaywall={openPaywall} />;
      default:           return <Placeholder title={activeLabel()} theme={theme} />;
    }
  };

  return (
    <LinearGradient colors={theme.background as any} style={styles.root}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.layout}>
        {/* Sidebar */}
        <View style={[styles.sidebar, { backgroundColor: theme.navBg }]}>
          <View style={styles.brand}>
            <Image source={require('./assets/images/sdm_icon.png')} style={styles.brandLogo} resizeMode="contain" />
            <Text style={[styles.brandText, { color: theme.text }]}>SDM Web</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {tabs.map(tab => {
              const active = tab.id === activeTab;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[
                    styles.navItem,
                    active && { backgroundColor: UI_THEME.colors.cyanGlass },
                  ]}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={24}
                    color={active ? theme.primary : theme.iconInactive}
                  />
                  <Text
                    style={[
                      styles.navLabel,
                      { color: active ? theme.primary : theme.text },
                    ]}
                    numberOfLines={1}
                  >
                    {t(tab.label)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Main */}
        <View style={styles.main}>
          <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{activeLabel()}</Text>
          </View>
          <View style={styles.content}>{renderContent()}</View>
        </View>
      </View>

      <Modal visible={showPaywall} animationType="slide" transparent={false} onRequestClose={() => setShowPaywall(false)}>
        <PaywallScreen onClose={() => setShowPaywall(false)} />
      </Modal>
    </LinearGradient>
  );
};

// Auth gate: when Firebase is configured, require a signed-in + verified user;
// otherwise (no config yet) the app runs without a gate.
const AuthGate: React.FC = () => {
  const { initializing, isConfigured, user } = useAuth();
  if (initializing) return null;
  if (isConfigured && (!user || !user.emailVerified)) return <AuthScreen />;
  return <Shell />;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <DataProvider>
          <DialogProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <SyncProvider>
                  <AuthGate />
                </SyncProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </DialogProvider>
        </DataProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  layout: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 260,
    paddingTop: 24,
    paddingHorizontal: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(0,0,0,0.08)',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, marginBottom: 24 },
  brandLogo: { width: 40, height: 40, borderRadius: 9 },
  brandText: { fontSize: 22, fontWeight: '700' },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  navLabel: { fontSize: 17, fontWeight: '600', flexShrink: 1 },
  main: { flex: 1 },
  header: {
    paddingHorizontal: 40,
    paddingVertical: 24,
  },
  headerTitle: { fontSize: 30, fontWeight: '700' },
  content: { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  placeholderTitle: { fontSize: 28, fontWeight: '700' },
  placeholderSub: { fontSize: 18 },
});
