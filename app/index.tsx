// app/index.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SubscriptionService } from '../services/subscriptionService';
import Constants from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  FlatList,
  Dimensions, 
  Animated, 
  Modal 
} from 'react-native';
import { 
  GestureHandlerRootView, 
  PanGestureHandler, 
  State,
  HandlerStateChangeEvent,
  PanGestureHandlerEventPayload
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Нативное управление сплеш-скрином
import * as SplashScreenNative from 'expo-splash-screen';

import { t } from '../utils/i18n';
import { useTablet } from '../hooks/useTablet';
import { DataProvider, useData } from '../contexts/DataContext';
import { LanguageProvider } from '../contexts/LanguageContext';

// Удерживаем заставку до команды
SplashScreenNative.preventAutoHideAsync().catch(() => {});

const rgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const UI_THEME = {
  colors: {
    cyanAccent: '#00BFFF',
    cyanGlass: rgba('#00BFFF', 0.15),
    light: {
      primary: '#1565C0',
      background: ['#F0F7FF', '#E1EFFD', '#D0E7FC'],
      headerBg: rgba('#E1EFFD', 0.95),
      headerGradient: [rgba('#E1EFFD', 0.95), rgba('#E1EFFD', 0.85)],
      text: '#1A3A5C',
      textSecondary: '#6B9CC8',
      iconInactive: '#6B9CC8',
      card: rgba('#FFFFFF', 0.5),
      navBg: rgba('#E1EFFD', 0.95),
    },
    dark: {
      primary: '#00BFFF',
      background: ['#0a1628', '#1a2a4a', '#0d1a2d'],
      headerBg: rgba('#1a2a4a', 0.95),
      headerGradient: [rgba('#1a2a4a', 0.95), rgba('#1a2a4a', 0.85)],
      text: '#FFFFFF',
      textSecondary: '#556B8D',
      iconInactive: '#556B8D',
      card: rgba('#1a2a4a', 0.4),
      navBg: rgba('#1a2a4a', 0.95),
    }
  }
};

import { DocumentsScreen } from '../screens/DocumentsScreen';
import { SeaServiceScreen } from '../screens/SeaServiceScreen';
import { PersonalScreen } from '../screens/PersonalScreen';
import { BiometricsScreen } from '../screens/BiometricsScreen';
import { EducationScreen } from '../screens/EducationScreen';
import { NextOfKinScreen } from '../screens/NextOfKinScreen';
import { NotesScreen } from '../screens/NotesScreen';
import { QRScreen } from '../screens/QRScreen';
import { CVScreen } from '../screens/CVScreen';
import { ScansScreen } from '../screens/ScansScreen';
import { SettingsScreen }  from '../screens/SettingsScreen';
import DPScreen from '../screens/DPScreen';
import MPCScreen from '../screens/MPCScreen';
import PaywallScreen from '../screens/PaywallScreen';
import { SplashScreen } from '../screens/SplashScreen';

const isTestVisible = Constants.expoConfig?.extra?.enableTestingScreen;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;
const ICON_SIZE = 26;
const VISIBLE_COUNT = 7; 

let TestingScreen: React.FC<any> = () => null;
if (isTestVisible) {
  TestingScreen = require('../screens/TestingScreen').TestingScreen;
}

type TabType = 'personal' | 'documents' | 'seaService' | 'biometrics' | 'education' | 'nextOfKin' | 'notes' | 'qr' | 'cv' | 'scans' | 'settings' | 'test' | 'dp' | 'mpc';

const allTabs: { id: TabType; icon: string; label: string }[] = [
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
  { id: 'dp',         icon: 'compass',         label: 'DP Log' },
  { id: 'mpc',        icon: 'navigate',        label: 'Midnight Position Check' },
  { id: 'test',       icon: 'flask',           label: 'Test' },
  { id: 'settings',   icon: 'settings',        label: 'settings.title' },
];


const NAV_ITEM_WIDTH = Math.floor(SCREEN_WIDTH / VISIBLE_COUNT);

type NavCarouselProps = {
  tabs: { id: TabType; icon: string; label: string }[];
  activeTab: TabType;
  onTabPress: (id: TabType) => void;
  theme: typeof UI_THEME.colors.dark;
};

const NavCarousel: React.FC<NavCarouselProps> = ({ tabs, activeTab, onTabPress, theme }) => {
  const flatListRef = useRef<FlatList>(null);
  const REPEAT = 3;
  const repeated = React.useMemo(
    () => Array.from({ length: REPEAT }, () => tabs).flat(),
    [tabs]
  );
  const centerOffset = tabs.length;

  useEffect(() => {
    flatListRef.current?.scrollToIndex({ index: centerOffset, animated: false });
  }, [tabs.length]);

  const onScrollEnd = useCallback(({ nativeEvent }: any) => {
    const offsetX = nativeEvent.contentOffset.x;
    const currentIndex = Math.round(offsetX / NAV_ITEM_WIDTH);
    if (currentIndex < centerOffset || currentIndex >= centerOffset + tabs.length) {
      const normalizedIndex = ((currentIndex % tabs.length) + tabs.length) % tabs.length;
      flatListRef.current?.scrollToIndex({
        index: centerOffset + normalizedIndex,
        animated: false,
      });
    }
  }, [tabs.length, centerOffset]);

  const renderItem = ({ item, index }: { item: (typeof tabs)[0]; index: number }) => {
    const isActive = activeTab === item.id;
    return (
      <TouchableOpacity
        style={[styles.navPhoneItem, { width: NAV_ITEM_WIDTH }]}
        onPress={() => onTabPress(item.id)}
        activeOpacity={0.6}
      >
        <Ionicons
          name={item.icon as any}
          size={ICON_SIZE}
          color={isActive ? theme.primary : theme.iconInactive}
        />
        {isActive && (
          <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      data={repeated}
      renderItem={renderItem}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      onScrollEndDrag={onScrollEnd}
      onMomentumScrollEnd={onScrollEnd}
      getItemLayout={(_, index) => ({
        length: NAV_ITEM_WIDTH,
        offset: NAV_ITEM_WIDTH * index,
        index,
      })}
      initialScrollIndex={centerOffset}
      style={styles.navPhoneRow}
    />
  );
};
const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const setActiveTabSafe = (tab: TabType) => { setActiveTab(tab); };
  
  const [showSplash, setShowSplash] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const { state } = useData();
  const insets = useSafeAreaInsets();
  const isDark = state.theme === 'dark';
  const isTablet = useTablet();

  const tabs = React.useMemo(() => {
    let result = isTestVisible ? allTabs : allTabs.filter(t => t.id !== 'test');
    if (!state.showDPScreen)  result = result.filter(t => t.id !== 'dp');
    if (!state.showMPCScreen) result = result.filter(t => t.id !== 'mpc');
    return result;
  }, [state.showDPScreen, state.showMPCScreen]);

  React.useEffect(() => {
    if (!tabs.find(t => t.id === activeTab)) setActiveTabSafe('personal');
  }, [tabs]);

  const theme = isDark ? UI_THEME.colors.dark : UI_THEME.colors.light;
  const accent = UI_THEME.colors.cyanAccent;

  const fadeAnim   = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  const swipeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const disableSwipeTemporarily = () => {
    setSwipeEnabled(false);
    if (swipeTimer.current) clearTimeout(swipeTimer.current);
    swipeTimer.current = setTimeout(() => setSwipeEnabled(true), 700);
  };

  useEffect(() => {
    async function prepare() {
      const startTime = Date.now();
      try {
        await SubscriptionService.initialize();
      } catch (e) {
        console.warn(e);
      } finally {
        // Нативный splash висит минимум 3 секунды
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 3000 - elapsed);
        if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  // ТА САМАЯ ФУНКЦИЯ, КОТОРАЯ СКРЫВАЕТ СПЛЕШ
  const onLayoutRootView = useCallback(async () => {
    if (isReady && !showSplash) {
      // Скрываем нативный splash только когда загружен и кастомный сплеш, и данные
      await SplashScreenNative.hideAsync().catch(() => {});
    }
  }, [isReady, showSplash]);

  // Пока данные не готовы, мы ничего не рендерим (висит нативный Splash)
  if (!isReady) {
    return null;
  }

  // Показываем ваш кастомный SplashScreen.tsx
  if (showSplash) {
    return (
      <View style={{ flex: 1 }} onLayout={() => SplashScreenNative.hideAsync().catch(()=>{})}>
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </View>
    );
  }

  const getTabTitle = () => {
    const tab = tabs.find(t => t.id === activeTab);
    return tab?.id === 'test' ? 'Test' : t(tab?.label || 'personal.title');
  };

  const animateTransition = (slideDirection: number) => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim,   { toValue: 0,  duration: 150, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: slideDirection, duration: 150, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim,   { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
    ]).start();
  };

  const handleTabPress = (tabId: TabType) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.6, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1,   duration: 150, useNativeDriver: true }),
    ]).start();
    setActiveTabSafe(tabId);
  };

  const navigateToTab = (direction: 'next' | 'prev') => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    const newIndex = direction === 'next'
      ? (currentIndex + 1) % tabs.length
      : (currentIndex - 1 + tabs.length) % tabs.length;
    animateTransition(direction === 'next' ? -50 : 50);
    setActiveTabSafe(tabs[newIndex].id);
  };

  const onGestureEvent = ({ nativeEvent }: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
    if (nativeEvent.state === State.END) {
      const { translationX: tx, velocityX: vx } = nativeEvent;
      if (tx > SWIPE_THRESHOLD || vx > 500)  navigateToTab('prev');
      else if (tx < -SWIPE_THRESHOLD || vx < -500) navigateToTab('next');
    }
  };

  const renderContent = () => {
    const screenProps = { theme, accent, onOpenPaywall: () => setShowPaywall(true) };
    switch (activeTab) {
      case 'personal':   return <PersonalScreen   {...screenProps} />;
      case 'documents':  return <DocumentsScreen  {...screenProps} />;
      case 'seaService': return <SeaServiceScreen {...screenProps} />;
      case 'biometrics': return <BiometricsScreen {...screenProps} />;
      case 'education':  return <EducationScreen  {...screenProps} />;
      case 'nextOfKin':  return <NextOfKinScreen  {...screenProps} />;
      case 'notes':      return <NotesScreen      {...screenProps} />;
      case 'qr':         return <QRScreen         {...screenProps} />;
      case 'cv':         return <CVScreen         {...screenProps} onDisableSwipe={disableSwipeTemporarily} />;
      case 'scans':      return <ScansScreen />;
      case 'dp':         return <DPScreen />;
      case 'mpc':        return <MPCScreen />;
      case 'test':       return isTestVisible ? <TestingScreen {...screenProps} /> : null;
      case 'settings':   return <SettingsScreen   {...screenProps} />;
      default:           return <PersonalScreen   {...screenProps} />;
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <LinearGradient colors={theme.background} style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <LinearGradient colors={theme.headerGradient} style={styles.headerGradient}>
            <View style={isTablet ? styles.headerContentTablet : undefined}>
              <Animated.Text style={[styles.headerTitle, { color: theme.text, opacity: fadeAnim }]}>
                {getTabTitle()}
              </Animated.Text>
            </View>
          </LinearGradient>
        </View>

        <PanGestureHandler
          onHandlerStateChange={onGestureEvent}
          activeOffsetX={[-30, 30]}
          failOffsetY={[-15, 15]}
          enabled={swipeEnabled}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateX }] }]}>
            {renderContent()}
          </Animated.View>
        </PanGestureHandler>

        <View style={styles.bottomNav}>
          <View style={[
            styles.navContainerBackground,
            { backgroundColor: theme.navBg, paddingBottom: insets.bottom || 12 }
          ]}>
            {isTablet ? (
              <View style={styles.navTabletRow}>
                {tabs.map((tab) => (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => handleTabPress(tab.id)}
                    style={styles.navItemTablet}
                    activeOpacity={0.6}
                  >
                    <Ionicons
                      name={tab.icon as any}
                      size={ICON_SIZE}
                      color={activeTab === tab.id ? theme.primary : theme.iconInactive}
                    />
                    {activeTab === tab.id && (
                      <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <NavCarousel
                tabs={tabs}
                activeTab={activeTab}
                onTabPress={handleTabPress}
                theme={theme}
              />
            )}
          </View>
        </View>

        <Modal
          visible={showPaywall}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPaywall(false)}
        >
          <PaywallScreen onClose={() => setShowPaywall(false)} />
        </Modal>
      </LinearGradient>
    </GestureHandlerRootView>
  );
};

export default function Index() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <DataProvider>
          <MainApp />
        </DataProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { zIndex: 10 },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle:  { fontSize: 22, fontWeight: '700' },
  headerContentTablet: { maxWidth: 800, alignSelf: 'center', width: '100%' },
  content:      { flex: 1 },
  bottomNav:    { zIndex: 10 },
  navContainerBackground: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  navTabletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly', 
    width: '100%',
    paddingHorizontal: 8,
  },
  navItemTablet: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    minWidth: 44,
  },
  navPhoneRow: {
    width: '100%',
  },
  navPhoneItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  navPhoneItemCenter: {},
  activeIndicator: {
    marginTop: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});