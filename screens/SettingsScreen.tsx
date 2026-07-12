import React, { useState, useEffect } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Switch, 
  Image, 
  Linking, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard,
  ActivityIndicator,
  Animated,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useSync } from '../contexts/SyncContext';
import { AuthScreen } from './AuthScreen';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useData } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ManualScreen } from './ManualScreen';
import { t, getSystemLanguage } from '../utils/i18n';
import { useTablet } from '../hooks/useTablet'; // ← ДОБАВЛЕНО
import i18n from '../utils/i18n';
import { playSuccessSound } from '../utils/sound';
import Constants from 'expo-constants';
import { NotificationService } from '../utils/NotificationService';
import Purchases from 'react-native-purchases';

const GHOST_STARFISH_BG = require('../assets/images/ghost-starfish.png');
const TERMS_URL = 'https://sdm.kuka-lab.com/terms-of-service.php';
const PRIVACY_URL = 'https://sdm.kuka-lab.com/privacy-policy.php';
const WEBSITE_URL = 'https://sdm.kuka-lab.com';

// 🛡️ Новые константы для Вашей светлости
const SDM_EXTENSION = '.sdm';
const SDM_MIME_TYPE = 'application/octet-stream';

const LANGUAGES = [
  // Первая строка: en - uk - pl - de - es (5 языков)
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'uk', label: 'UK', flag: '🇺🇦' },
  { code: 'pl', label: 'PL', flag: '🇵🇱' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  // Вторая строка: fr - ru - tl - zh - hi (5 языков)
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'ru', label: 'RU', flag: '🇷🇺' },
  { code: 'tl', label: 'TL', flag: '🇵🇭' },
  { code: 'zh', label: 'ZH', flag: '🇨🇳' },
  { code: 'hi', label: 'HI', flag: '🇮🇳' },
];

interface SettingsScreenProps {
  onOpenPaywall: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onOpenPaywall }) => {
  const { state, setTheme, exportData, importData, clearAllData, toggleDPScreen, toggleMPCScreen } = useData();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { isPremium, subscriptionType, loading: subscriptionLoading, refreshStatus: refreshSubscription } = useSubscription();
  const { user, logout, isConfigured: authConfigured } = useAuth();
  const { status: syncStatus, lastSyncAt } = useSync();
  const [showAuth, setShowAuth] = useState(false);

  const syncSubtitle = () => {
    if (!user) return 'Sync your records with the web app';
    if (!user.emailVerified) return 'Verify your email to enable sync';
    if (syncStatus === 'connecting') return 'Connecting…';
    if (syncStatus === 'error') return 'Sync error — check connection';
    return lastSyncAt ? `Synced · ${new Date(lastSyncAt).toLocaleTimeString()}` : 'Synced';
  };

  // Панель языков: показываем только язык системы + английский.
  // Если язык системы не поддерживается (или это английский) — панель скрыта.
  const languagePanel = React.useMemo(() => {
    const sysLang = getSystemLanguage();
    if (!sysLang || sysLang === 'en') return [];
    return [sysLang, 'en']
      .map((code) => LANGUAGES.find((l) => l.code === code))
      .filter(Boolean) as typeof LANGUAGES;
  }, []);
  
  const [exporting, setExporting] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [monthlyPrice, setMonthlyPrice] = useState<string>('');
  const [lifetimePrice, setLifetimePrice] = useState<string>('');
  const isDark = state.theme === 'dark';
  const isTablet = useTablet(); // ← ДОБАВЛЕНО

  // Анимация мерцания для LEGAL секции
  const shimmerAnim = new Animated.Value(0);

  useEffect(() => {
    checkNotificationStatus();
    loadSubscriptionPrices();
    
    // Запуск анимации мерцания
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const loadSubscriptionPrices = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;
      
      if (currentOffering?.availablePackages) {
        const monthlyPackage = currentOffering.availablePackages.find(
          pkg => pkg.packageType === 'MONTHLY'
        );
        const lifetimePackage = currentOffering.availablePackages.find(
          pkg => pkg.packageType === 'LIFETIME'
        );

        if (monthlyPackage) {
          setMonthlyPrice(monthlyPackage.product.priceString);
        }
        if (lifetimePackage) {
          setLifetimePrice(lifetimePackage.product.priceString);
        }
      }
    } catch (error) {
      console.error('Error loading subscription prices:', error);
    }
  };

  const checkNotificationStatus = async () => {
    try {
      const scheduled = await NotificationService.getScheduledNotifications();
      setScheduledCount(scheduled.length);
      setNotificationsEnabled(scheduled.length > 0);
    } catch (error) {
      console.error('Failed to check notifications:', error);
    }
  };

  const openLink = async (url: string, title: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('settings.alerts.cannotOpen', { title }));
      }
    } catch (error) {
      console.error(`Error opening ${title}:`, error);
      Alert.alert(t('common.error'), t('settings.alerts.failedOpen', { title }));
    }
  };

  const handleLanguageChange = async (langCode: string) => {
    if (langCode === currentLanguage) return;
    
    console.log('🌍 Settings: Changing language to:', langCode);
    
    try {
      await changeLanguage(langCode);
      playSuccessSound();
      
      i18n.locale = langCode;
      
      Alert.alert(
        t('settings.language.changed'),
        t('settings.language.restartMessage'),
        [
          {
            text: t('common.ok'),
            style: 'default'
          }
        ]
      );
    } catch (error) {
      console.error('❌ Failed to change language:', error);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    try {
      if (value) {
        const granted = await NotificationService.requestPermissions();
        
        if (granted) {
          await NotificationService.scheduleNotificationsForAllDocuments(state.documents);
          const scheduled = await NotificationService.getScheduledNotifications();
          setScheduledCount(scheduled.length);
          setNotificationsEnabled(true);
          
          Alert.alert(
            t('settings.alerts.notificationsEnabled'),
            scheduled.length > 0 
              ? t('settings.alerts.notificationsMessage', { count: scheduled.length })
              : t('settings.alerts.noExpiringMessage')
          );
        } else {
          Alert.alert(
            t('settings.alerts.permissionDenied'),
            t('settings.alerts.permissionMessage')
          );
          setNotificationsEnabled(false);
        }
      } else {
        await NotificationService.cancelAllNotifications();
        setNotificationsEnabled(false);
        setScheduledCount(0);
        Alert.alert(
          t('settings.alerts.notificationsDisabled'),
          t('settings.alerts.disabledMessage')
        );
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      setNotificationsEnabled(false);
      Alert.alert(
        t('settings.alerts.errorTitle'),
        t('settings.alerts.failedSettings')
      );
    }
  };

  const handleExportBackup = async () => {
    if (!isPremium) {
      Alert.alert(
        t('settings.unlimited.required'),
        t('settings.unlimited.exportImportMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { 
            text: t('settings.unlimited.getUnlimited'), 
            onPress: onOpenPaywall 
          }
        ]
      );
      return;
    }

    try {
      setExporting(true);
      const dataToExport = exportData();
      
      if (!dataToExport || dataToExport === '{}' || dataToExport === 'null') {
        Alert.alert(
          t('settings.alerts.noData'),
          t('settings.alerts.noDataMessage')
        );
        setExporting(false);
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      // 🛡️ ТЕПЕРЬ .sdm
      const fileName = `seafarer_backup_${timestamp}${SDM_EXTENSION}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, dataToExport);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: SDM_MIME_TYPE,
          dialogTitle: fileName,
          UTI: 'com.sdm.backup',
        });
        playSuccessSound();
        Alert.alert(
          t('settings.alerts.backupExported'),
          t('settings.alerts.backupDetails', {
            fileName: fileName,
            size: Math.round(dataToExport.length / 1024)
          })
        );
      } else {
        playSuccessSound();
        Alert.alert(
          t('settings.alerts.successTitle'),
          t('settings.alerts.backupCreated')
        );
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        t('settings.alerts.errorTitle'),
        t('settings.alerts.exportError')
      );
    } finally {
      setExporting(false);
    }
  };

  const handleImportBackup = async () => {
    if (!isPremium) {
      Alert.alert(
        t('settings.unlimited.required'),
        t('settings.unlimited.exportImportMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { 
            text: t('settings.unlimited.getUnlimited'), 
            onPress: onOpenPaywall 
          }
        ]
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [SDM_MIME_TYPE, 'application/json'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedFile = result.assets[0];
        const content = await FileSystem.readAsStringAsync(selectedFile.uri);

        const isOldFormat = selectedFile.name.endsWith('.json');

        const success = await importData(content);

        if (success) {
          playSuccessSound();
          if (isOldFormat) {
            Alert.alert(
              t('settings.alerts.successTitle'),
              "Ваша светлость, старый формат импортирован. Рекомендую создать новый бэкап .sdm для защиты.",
              [{ text: "Создать .sdm", onPress: handleExportBackup }, { text: t('common.ok') }]
            );
          } else {
            Alert.alert(t('settings.alerts.successTitle'), t('settings.alerts.dataRestored'));
          }
        } else {
          Alert.alert(
            t('settings.alerts.errorTitle'),
            t('settings.alerts.invalidBackup')
          );
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert(
        t('settings.alerts.errorTitle'),
        t('settings.alerts.importError')
      );
    }
  };

  const handleClearData = () => {
    Alert.alert(
      t('settings.alerts.clearTitle'),
      t('settings.alerts.clearMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('settings.alerts.deleteEverything'),
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await NotificationService.cancelAllNotifications();
            setScheduledCount(0);
            setNotificationsEnabled(false);
            Alert.alert(
              t('settings.alerts.successTitle'),
              t('settings.alerts.dataCleared')
            );
          },
        },
      ]
    );
  };

  const handleManageSubscription = () => {
    const url = Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url);
  };

  const SettingRow = React.memo(({ icon, title, subtitle, onPress, rightElement, danger }: {
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
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, danger && styles.iconDanger]}>
        <Ionicons 
          name={icon as any} 
          size={22} 
          color={danger ? '#f44336' : (isDark ? '#64b5f6' : '#1976d2')} 
        />
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
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} 
        />
      ))}
    </TouchableOpacity>
  ));

  SettingRow.displayName = 'SettingRow';

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <Image
          source={GHOST_STARFISH_BG}
          style={[
            styles.starfishBackground,
            { opacity: isDark ? 0.08 : 0.22, tintColor: isDark ? '#64b5f6' : '#2B7CC1' }
          ]}
          resizeMode="cover"
        />

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollViewContent, isTablet && styles.scrollViewContentTablet]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={isTablet ? styles.centeredContent : undefined}>
            {/* SUBSCRIPTION SECTION */}
            <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
              <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>
                {t('settings.unlimited.title')}
              </Text>
              
              {subscriptionLoading ? (
                <View style={styles.subscriptionLoading}>
                  <ActivityIndicator color={isDark ? '#64b5f6' : '#1976d2'} />
                </View>
              ) : isPremium ? (
                <View style={styles.premiumCard}>
                  <LinearGradient
                    colors={subscriptionType === 'lifetime' 
                      ? ['rgba(255, 215, 0, 0.15)', 'rgba(255, 160, 0, 0.08)']
                      : ['rgba(79, 195, 247, 0.15)', 'rgba(2, 136, 209, 0.08)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.premiumGradient}
                  >
                    <View style={styles.premiumHeader}>
                      <View style={styles.premiumIconContainer}>
                        <Ionicons 
                          name={subscriptionType === 'lifetime' ? 'trophy' : 'shield-checkmark'} 
                          size={32} 
                          color={subscriptionType === 'lifetime' ? '#FFD700' : '#4FC3F7'} 
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 16 }}>
                        <View style={styles.premiumTitleRow}>
                          <Text style={[styles.premiumTitle, isDark ? styles.textLight : styles.textDark]}>
                            {t('settings.unlimited.active')}
                          </Text>
                          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        </View>
                        <Text style={[styles.premiumType, isDark ? styles.textMuted : styles.textMutedLight]}>
                          {subscriptionType === 'lifetime' 
                            ? t('settings.unlimited.lifetimeAccess')
                            : t('settings.unlimited.monthlySubscription')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.premiumFeatures}>
                      <View style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={[styles.featureText, isDark ? styles.textLight : styles.textDark]}>
                          {t('settings.unlimited.features.unlimitedDocs')}
                        </Text>
                      </View>
                      <View style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={[styles.featureText, isDark ? styles.textLight : styles.textDark]}>
                          {t('settings.unlimited.features.cloudBackup')}
                        </Text>
                      </View>
                      <View style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={[styles.featureText, isDark ? styles.textLight : styles.textDark]}>
                          {t('settings.unlimited.features.advancedAnalytics')}
                        </Text>
                      </View>
                    </View>

                    {subscriptionType === 'monthly' && (
                      <TouchableOpacity 
                        style={styles.manageButton}
                        onPress={handleManageSubscription}
                      >
                        <Ionicons name="settings-outline" size={18} color={isDark ? '#64b5f6' : '#1976d2'} />
                        <Text style={[styles.manageButtonText, isDark ? styles.textLight : styles.textDark]}>
                          {t('settings.unlimited.manageSubscription')}
                        </Text>
                        <Ionicons name="open-outline" size={16} color={isDark ? '#64b5f6' : '#1976d2'} />
                      </TouchableOpacity>
                    )}
                  </LinearGradient>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.upgradeCardWrapper}
                  onPress={onOpenPaywall}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isDark 
                      ? ['rgba(26, 42, 74, 0.95)', 'rgba(13, 26, 45, 0.95)']
                      : ['rgba(30, 58, 95, 0.95)', 'rgba(21, 101, 192, 0.85)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.upgradeGradient}
                  >
                    <View style={styles.upgradeIconContainer}>
                      <Ionicons name="star" size={40} color="#FFD700" />
                    </View>
                    <View style={styles.upgradeContent}>
                      <Text style={styles.upgradeTitle}>{t('settings.unlimited.getUnlimited')}</Text>
                      <Text style={styles.upgradeDescription}>
                        {t('settings.unlimited.description')}
                      </Text>
                      <View style={styles.upgradePricing}>
                        <Text style={styles.priceTag}>
                          {monthlyPrice || t('settings.unlimited.monthlyPrice')}
                        </Text>
                        <Text style={styles.priceOr}>{t('settings.unlimited.or')}</Text>
                        <Text style={styles.priceTag}>
                          {lifetimePrice || t('settings.unlimited.lifetimePrice')}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="arrow-forward" size={24} color="#FFD700" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            {/* LANGUAGE SECTION — показываем только если есть язык системы + английский */}
            {languagePanel.length > 0 && (
              <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight, { padding: 16 }]}>
                <Text style={[styles.sectionTitleHeader, isDark ? styles.textLight : styles.textDark]}>
                  {t('settings.language.title')}
                </Text>

                <View style={styles.languageRow}>
                  {languagePanel.map((lang) => (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.langBtn,
                        isDark ? styles.langBtnDark : styles.langBtnLight,
                        currentLanguage === lang.code && (isDark ? styles.langBtnActiveDark : styles.langBtnActiveLight)
                      ]}
                      onPress={() => handleLanguageChange(lang.code)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.flagSmall}>{lang.flag}</Text>
                      <Text style={[styles.langText, isDark ? styles.textLight : styles.textDark]}>
                        {lang.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* NOTIFICATIONS */}
            <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
              <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>
                {t('settings.notifications.title')}
              </Text>
              <SettingRow
                icon="notifications"
                title={t('settings.notifications.subtitle')}
                subtitle={notificationsEnabled 
                  ? t('settings.notifications.enabled', { count: scheduledCount })
                  : t('settings.notifications.disabled')
                }
                rightElement={
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={handleToggleNotifications}
                    trackColor={{ false: '#767577', true: '#64b5f6' }}
                    thumbColor={notificationsEnabled ? '#1976d2' : '#f4f3f4'}
                  />
                }
              />
            </View>

            {/* ACCOUNT & SYNC (optional — app works fully without signing in) */}
            {authConfigured && (
              <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
                <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>
                  Account & Sync
                </Text>
                {user && user.emailVerified ? (
                  <>
                    <SettingRow
                      icon={syncStatus === 'synced' ? 'cloud-done' : syncStatus === 'error' ? 'cloud-offline' : 'cloud'}
                      title={user.email || 'Signed in'}
                      subtitle={syncSubtitle()}
                    />
                    <SettingRow
                      icon="log-out"
                      title="Sign out"
                      subtitle="Stops syncing. Your data stays on this device."
                      danger
                      onPress={() => Alert.alert(
                        'Sign out',
                        'Stop syncing on this device? Your data stays on the phone.',
                        [
                          { text: t('common.cancel'), style: 'cancel' },
                          { text: 'Sign out', style: 'destructive', onPress: () => logout() },
                        ]
                      )}
                    />
                  </>
                ) : (
                  <SettingRow
                    icon="cloud-outline"
                    title={user ? 'Verify your email' : 'Sign in to sync'}
                    subtitle={syncSubtitle()}
                    onPress={() => setShowAuth(true)}
                  />
                )}
              </View>
            )}

            {/* APPEARANCE */}
            <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
              <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>
                {t('settings.appearance.title')}
              </Text>
              <SettingRow
                icon="moon"
                title={t('settings.appearance.theme')}
                subtitle={state.theme === 'dark' ? t('settings.appearance.dark') : t('settings.appearance.light')}
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

            {/* DP SCREEN TOGGLE */}
            <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
              <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>
                Modules
              </Text>
              <SettingRow
                icon="compass"
                title="DP Log (english only)"
                subtitle={state.showDPScreen ? 'Enabled — restart app to apply' : 'Disabled'}
                rightElement={
                  <Switch
                    value={state.showDPScreen}
                    onValueChange={toggleDPScreen}
                    trackColor={{ false: '#767577', true: '#64b5f6' }}
                    thumbColor={state.showDPScreen ? '#1976d2' : '#f4f3f4'}
                  />
                }
              />
              <SettingRow
                icon="navigate"
                title="MPC — 12nm UK Midnight Position Check (Beta)"
                subtitle={state.showMPCScreen ? 'Enabled — restart app to apply' : 'Disabled'}
                rightElement={
                  <Switch
                    value={state.showMPCScreen}
                    onValueChange={toggleMPCScreen}
                    trackColor={{ false: '#767577', true: '#64b5f6' }}
                    thumbColor={state.showMPCScreen ? '#1976d2' : '#f4f3f4'}
                  />
                }
              />
              {Platform.OS === 'ios' && (
                <Text style={[styles.mpcIosHint, isDark ? styles.textMuted : styles.textMutedLight]}>
                  {t('mpc.iosBackgroundHint')}
                </Text>
              )}
            </View>

            {/* DATA MANAGEMENT */}
            <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
              <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>
                {t('settings.dataManagement.title')}
              </Text>
              <SettingRow
                icon="cloud-upload"
                title={t('settings.dataManagement.export')}
                subtitle={t('settings.dataManagement.exportSubtitle')}
                onPress={handleExportBackup}
              />
              <SettingRow
                icon="cloud-download"
                title={t('settings.dataManagement.import')}
                subtitle={t('settings.dataManagement.importSubtitle')}
                onPress={handleImportBackup}
              />
              <SettingRow
                icon="trash"
                title={t('settings.dataManagement.clear')}
                subtitle={t('settings.dataManagement.clearSubtitle')}
                onPress={handleClearData}
                danger
              />
              <SettingRow
                icon="book-outline"
                title="Seafarer Documents Manager Manual"
                subtitle="Full guide to all features"
                onPress={() => setShowManual(true)}
              />
            </View>

            {/* LEGAL */}
            <Animated.View 
              style={[
                styles.section, 
                isDark ? styles.sectionDark : styles.sectionLight,
                {
                  borderWidth: 1,
                  borderColor: shimmerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#64b5f6', '#64b5f6']
                  }),
                }
              ]}
            >
              <Animated.Text 
                style={[
                  styles.sectionTitle,
                  {
                    color: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['#64b5f6', '#64b5f6']
                    })
                  }
                ]}
              >
                {t('settings.legal.title')}
              </Animated.Text>
              
              <TouchableOpacity 
                style={styles.settingRow} 
                onPress={() => openLink(WEBSITE_URL, t('splash.appTitle'))}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                  <Ionicons 
                    name="information-circle" 
                    size={22} 
                    color="#64b5f6"
                  />
                </View>
                <View style={styles.settingContent}>
                  <Animated.Text 
                    style={[
                      styles.settingTitle,
                      {
                        color: shimmerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['#64b5f6', '#64b5f6']
                        })
                      }
                    ]}
                  >
                    {t('splash.appTitle')}
                  </Animated.Text>
                  <Animated.Text 
                    style={[
                      styles.settingSubtitle,
                      {
                        color: shimmerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['#64b5f6', '#64b5f6']
                        })
                      }
                    ]}
                  >
                    {`by Mykhaylo Osypov\nVersion ${Constants.expoConfig?.version ?? '—'}`}
                  </Animated.Text>
                </View>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color="#64b5f6"
                />
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.legalButtonsContainer}>
              <Animated.View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={[
                    styles.legalButton, 
                    isDark ? styles.legalButtonDark : styles.legalButtonLight
                  ]}
                  onPress={() => openLink(PRIVACY_URL, t('settings.legal.privacy'))}
                >
                  <Ionicons name="lock-closed-outline" size={16} color="#64b5f6" />
                  <Animated.Text 
                    style={[
                      styles.legalButtonText,
                      {
                        color: shimmerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['#64b5f6', '#64b5f6']
                        })
                      }
                    ]}
                  >
                    {t('settings.legal.privacy')}
                  </Animated.Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={[
                    styles.legalButton, 
                    isDark ? styles.legalButtonDark : styles.legalButtonLight
                  ]}
                  onPress={() => openLink(TERMS_URL, t('settings.legal.terms'))}
                >
                  <Ionicons name="document-text-outline" size={16} color="#64b5f6" />
                  <Animated.Text 
                    style={[
                      styles.legalButtonText,
                      {
                        color: shimmerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['#64b5f6', '#64b5f6']
                        })
                      }
                    ]}
                  >
                    {t('settings.legal.terms')}
                  </Animated.Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            <View style={{ height: 40 }} />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <ManualScreen visible={showManual} onClose={() => setShowManual(false)} />

      <Modal
        visible={showAuth}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAuth(false)}
      >
        <AuthScreen onClose={() => setShowAuth(false)} />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    position: 'relative',
  },
  starfishBackground: { 
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
    zIndex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  // ↓ НОВЫЕ СТИЛИ iPad
  scrollViewContentTablet: { alignItems: 'center' },
  centeredContent: { width: '100%', maxWidth: 640 },
  // ↑ КОНЕЦ НОВЫХ СТИЛЕЙ
  section: { 
    borderRadius: 16, 
    marginBottom: 16, 
    overflow: 'hidden' 
  },
  sectionDark: { 
    backgroundColor: 'rgba(255, 255, 255, 0.08)' 
  },
  sectionLight: { 
    backgroundColor: 'rgba(253, 248, 240, 0.3)' 
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    padding: 16, 
    paddingBottom: 8, 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  sectionTitleHeader: { 
    fontSize: 13, 
    fontWeight: '700', 
    marginBottom: 12, 
    textTransform: 'uppercase', 
    opacity: 0.6 
  },
  subscriptionLoading: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  premiumGradient: {
    padding: 20,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  premiumType: {
    fontSize: 14,
  },
  premiumFeatures: {
    gap: 8,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  upgradeCardWrapper: {
    margin: 16,
  },
  upgradeGradient: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 6,
    borderColor: '#FFD700',
  },
  upgradeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeContent: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  upgradeDescription: {
    fontSize: 12,
    color: '#E3F2FD',
    marginBottom: 6,
    lineHeight: 16,
  },
  upgradePricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  priceTag: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  priceOr: {
    fontSize: 11,
    color: '#B3E5FC',
  },
  languageRow: { 
    flexDirection: 'row', 
    gap: 6, 
    justifyContent: 'space-between' 
  },
  langBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 6, 
    paddingVertical: 8, 
    borderRadius: 10, 
    borderWidth: 1, 
    flex: 1, 
    justifyContent: 'center' 
  },
  langBtnDark: { 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  langBtnLight: { 
    backgroundColor: 'rgba(0,0,0,0.02)', 
    borderColor: 'rgba(0,0,0,0.05)' 
  },
  langBtnActiveDark: { 
    backgroundColor: 'rgba(144, 202, 249, 0.2)', 
    borderColor: '#90caf9' 
  },
  langBtnActiveLight: { 
    backgroundColor: 'rgba(13, 71, 161, 0.1)', 
    borderColor: '#0d47a1' 
  },
  flagSmall: { 
    fontSize: 14, 
    marginRight: 4 
  },
  langText: { 
    fontSize: 10, 
    fontWeight: '700' 
  },
  settingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(255, 255, 255, 0.05)' 
  },
  iconContainer: { 
    width: 36, 
    height: 36, 
    borderRadius: 8, 
    backgroundColor: 'rgba(100, 181, 246, 0.15)', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12 
  },
  iconDanger: { 
    backgroundColor: 'rgba(244, 67, 54, 0.15)' 
  },
  settingContent: { 
    flex: 1 
  },
  settingTitle: { 
    fontSize: 16, 
    fontWeight: '500' 
  },
  settingSubtitle: { 
    fontSize: 13, 
    marginTop: 2 
  },
  textLight: { 
    color: '#fff' 
  },
  textDark: { 
    color: '#333' 
  },
  textMuted: {
    color: 'rgba(255, 255, 255, 0.6)'
  },
  mpcIosHint: {
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  textMutedLight: { 
    color: 'rgba(0, 0, 0, 0.5)' 
  },
  textDanger: { 
    color: '#f44336' 
  },
  legalButtonsContainer: { 
    flexDirection: 'row', 
    gap: 12, 
    paddingHorizontal: 0, 
    marginTop: 8, 
    marginBottom: 8 
  },
  legalButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 12, 
    gap: 8, 
    borderWidth: 1 
  },
  legalButtonDark: { 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    borderColor: 'rgba(100, 181, 246, 0.3)' 
  },
  legalButtonLight: { 
    backgroundColor: 'rgba(255, 255, 255, 0.5)', 
    borderColor: 'rgba(25, 118, 210, 0.3)' 
  },
  legalButtonText: { 
    fontSize: 13, 
    fontWeight: '500' 
  },
});