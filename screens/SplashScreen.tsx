import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { alertMsg, confirmAsync, chooseAsync } from '../utils/dialog';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context'; // Добавлен импорт
import { playShipBellSound } from '../utils/sound';
import { useTablet } from '../hooks/useTablet'; // ← ДОБАВЛЕНО
import Constants from 'expo-constants';

const APP_VERSION = Constants.expoConfig?.version ?? '3.1.5';

const { width } = Dimensions.get('window');

const TERMS_URL = 'https://sdm.free.nf/terms-of-service.php';
const PRIVACY_URL = 'https://sdm.free.nf/privacy-policy.php';
const AGREEMENT_KEY = '@sdm_agreement_accepted';
const SDM_LOGO = require('../assets/images/sdm_adaptive-icon.png');
const SPLASH_ICON = require('../assets/images/sdm_splash-icon.png');

interface Props {
  onFinish: () => void;
}

export const SplashScreen: React.FC<Props> = ({ onFinish }) => {
  const [showAgreement, setShowAgreement] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const isTablet = useTablet(); // ← ДОБАВЛЕНО

  useEffect(() => {
    checkAgreement();
  }, []);

  const checkAgreement = async () => {
    try {
      const agreed = await AsyncStorage.getItem(AGREEMENT_KEY);
      
      if (agreed === 'true') {
        playShipBellSound();
        setInitialLoading(false);
        const timer = setTimeout(() => {
          onFinish();
        }, 2500);
        return () => clearTimeout(timer);
      } else {
        playShipBellSound();
        setInitialLoading(false);
        setShowAgreement(true);
      }
    } catch (error) {
      console.error('Error checking agreement:', error);
      setInitialLoading(false);
      setShowAgreement(true);
    }
  };

  const handleAccept = async () => {
    try {
      await AsyncStorage.setItem(AGREEMENT_KEY, 'true');
      onFinish();
    } catch (error) {
      console.error('Error saving agreement:', error);
      alertMsg('Error', 'Failed to save agreement. Please try again.');
    }
  };

  const openLink = async (url: string, title: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        alertMsg('Error', `Cannot open ${title}`);
      }
    } catch (error) {
      console.error(`Error opening ${title}:`, error);
      alertMsg('Error', `Failed to open ${title}`);
    }
  };

  // Обертка для сохранения градиента на весь экран
  const GradientWrapper = ({ children }: { children: React.ReactNode }) => (
    <LinearGradient
      colors={['#0a1628', '#1a2a4a', '#0d1a2d']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1, width: '100%' }} edges={['top', 'bottom']}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );

  if (initialLoading) {
    // Показываем тёмный градиент без текста — нет мигания "Loading..."
    return (
      <GradientWrapper>
        <View style={styles.content} />
      </GradientWrapper>
    );
  }

  if (showAgreement) {
    return (
      <GradientWrapper>
        <View style={styles.logoContainer}>
          <Image source={SDM_LOGO} style={styles.logoImage} />
          <Text style={styles.title}>Seafarer Documents Manager</Text>
          <Text style={styles.author}>by Mykhaylo Osypov</Text>
          <Text style={styles.company}>Kuka Lab</Text>
        </View>

        <View style={[styles.agreementContainer, isTablet && styles.agreementContainerTablet]}>
          <View style={styles.agreementBox}>
            <Ionicons name="shield-checkmark" size={36} color="#64b5f6" style={styles.shieldIcon} />
            <Text style={styles.agreementText}>
              By clicking OK, you agree to our{' '}
              <Text style={styles.link} onPress={() => openLink(TERMS_URL, 'Terms of Service')}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text style={styles.link} onPress={() => openLink(PRIVACY_URL, 'Privacy Policy')}>
                Privacy Policy
              </Text>
            </Text>
          </View>

          <View style={styles.linksContainer}>
            <TouchableOpacity style={styles.documentButton} onPress={() => openLink(TERMS_URL, 'Terms of Service')}>
              <Ionicons name="document-text-outline" size={20} color="#64b5f6" />
              <Text style={styles.documentButtonText}>Terms of Service</Text>
              <Ionicons name="open-outline" size={16} color="#64b5f6" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.documentButton} onPress={() => openLink(PRIVACY_URL, 'Privacy Policy')}>
              <Ionicons name="lock-closed-outline" size={20} color="#64b5f6" />
              <Text style={styles.documentButtonText}>Privacy Policy</Text>
              <Ionicons name="open-outline" size={16} color="#64b5f6" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.okButton} onPress={handleAccept}>
            <Text style={styles.okButtonText}>OK, I Agree</Text>
          </TouchableOpacity>
          <Text style={styles.versionFooter}>Version {APP_VERSION}</Text>
        </View>
      </GradientWrapper>
    );
  }

  return (
    <GradientWrapper>
      <View style={styles.content}>
        <Image source={SPLASH_ICON} style={{ width: 200, height: 200, marginBottom: 20 }} resizeMode="contain" />
        <Text style={styles.title}>Seafarer Documents Manager</Text>
        <Text style={styles.author}>by Mykhaylo Osypov</Text>
        <Text style={styles.version}>Version {APP_VERSION}</Text>
      </View>
    </GradientWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  author: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  version: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  company: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  agreementContainer: {
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 20,
    width: '100%',
  },
  // ↓ НОВЫЕ СТИЛИ iPad
  agreementContainerTablet: { alignSelf: 'center', maxWidth: 560 },
  // ↑ КОНЕЦ НОВЫХ СТИЛЕЙ
  // ... остальные стили из оригинала
  agreementBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(100, 181, 246, 0.3)',
  },
  shieldIcon: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  agreementText: {
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
  },
  link: {
    color: '#64b5f6',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  linksContainer: {
    marginBottom: 20,
    gap: 12,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(100, 181, 246, 0.2)',
    gap: 10,
  },
  documentButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  okButton: {
    backgroundColor: '#1976d2',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  okButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  versionFooter: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 16,
  },
});