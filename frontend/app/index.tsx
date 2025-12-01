import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DataProvider, useData } from './contexts/DataContext';
import { DocumentsScreen } from './screens/DocumentsScreen';
import { SeaServiceScreen } from './screens/SeaServiceScreen';
import { PersonalScreen } from './screens/PersonalScreen';
import { BiometricsScreen } from './screens/BiometricsScreen';
import { EducationScreen } from './screens/EducationScreen';
import { NextOfKinScreen } from './screens/NextOfKinScreen';
import { NotesScreen } from './screens/NotesScreen';
import { QRScreen } from './screens/QRScreen';
import { CVScreen } from './screens/CVScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SplashScreen } from './screens/SplashScreen';

const { width } = Dimensions.get('window');

type TabType = 'personal' | 'documents' | 'seaService' | 'biometrics' | 'education' | 'nextOfKin' | 'notes' | 'qr' | 'cv' | 'settings';

interface Tab {
  id: TabType;
  icon: string;
  label: string;
}

const tabs: Tab[] = [
  { id: 'personal', icon: 'person', label: 'Personal' },
  { id: 'documents', icon: 'document-text', label: 'Documents' },
  { id: 'seaService', icon: 'boat', label: 'Sea Service' },
  { id: 'biometrics', icon: 'body', label: 'Biometrics' },
  { id: 'education', icon: 'school', label: 'Education' },
  { id: 'nextOfKin', icon: 'people', label: 'Next of Kin' },
  { id: 'notes', icon: 'create', label: 'Notes' },
  { id: 'qr', icon: 'qr-code', label: 'QR Code' },
  { id: 'cv', icon: 'document', label: 'CV' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
];

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [showSplash, setShowSplash] = useState(true);
  const { state } = useData();
  const insets = useSafeAreaInsets();
  const isDark = state.theme === 'dark';

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  const getTabTitle = () => {
    const tab = tabs.find(t => t.id === activeTab);
    return tab?.label || 'Seafarer Documents';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'personal': return <PersonalScreen />;
      case 'documents': return <DocumentsScreen />;
      case 'seaService': return <SeaServiceScreen />;
      case 'biometrics': return <BiometricsScreen />;
      case 'education': return <EducationScreen />;
      case 'nextOfKin': return <NextOfKinScreen />;
      case 'notes': return <NotesScreen />;
      case 'qr': return <QRScreen />;
      case 'cv': return <CVScreen />;
      case 'settings': return <SettingsScreen />;
      default: return <PersonalScreen />;
    }
  };

  return (
    <LinearGradient
      colors={isDark 
        ? ['#0a1628', '#1a2a4a', '#0d1a2d']
        : ['#e8f4fc', '#d4e8f5', '#c0dced']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <LinearGradient
          colors={isDark 
            ? ['rgba(26, 42, 74, 0.95)', 'rgba(26, 42, 74, 0.8)']
            : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.8)']
          }
          style={styles.headerGradient}
        >
          <Text style={[styles.headerTitle, isDark ? styles.textLight : styles.textDark]}>
            {getTabTitle()}
          </Text>
        </LinearGradient>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
        <LinearGradient
          colors={isDark 
            ? ['rgba(26, 42, 74, 0.95)', 'rgba(26, 42, 74, 0.98)']
            : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.98)']
          }
          style={styles.navGradient}
        >
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navContent}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.navItem,
                    isActive && (isDark ? styles.navItemActiveDark : styles.navItemActiveLight)
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={22}
                    color={isActive 
                      ? (isDark ? '#90caf9' : '#0d47a1')
                      : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)')
                    }
                  />
                  <Text style={[
                    styles.navLabel,
                    isActive 
                      ? (isDark ? styles.navLabelActiveDark : styles.navLabelActiveLight)
                      : (isDark ? styles.navLabelDark : styles.navLabelLight)
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </LinearGradient>
      </View>
    </LinearGradient>
  );
};

export default function Index() {
  return (
    <DataProvider>
      <MainApp />
    </DataProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    zIndex: 10,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    zIndex: 10,
  },
  navGradient: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  navContent: {
    paddingHorizontal: 12,
    gap: 4,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 70,
  },
  navItemActiveDark: {
    backgroundColor: 'rgba(144, 202, 249, 0.2)',
  },
  navItemActiveLight: {
    backgroundColor: 'rgba(13, 71, 161, 0.15)',
  },
  navLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  navLabelDark: {
    color: 'rgba(255,255,255,0.4)',
  },
  navLabelLight: {
    color: 'rgba(0,0,0,0.35)',
  },
  navLabelActiveDark: {
    color: '#90caf9',
  },
  navLabelActiveLight: {
    color: '#0d47a1',
  },
  textLight: {
    color: '#fff',
  },
  textDark: {
    color: '#333',
  },
});
