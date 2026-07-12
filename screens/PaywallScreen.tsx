// src/screens/PaywallScreen.tsx
// ✅ ИСПРАВЛЕНО: Поддержка как Google Play так и App Store продуктов

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { DialogHost } from '../contexts/DialogContext';
import { alertMsg, confirmAsync, chooseAsync } from '../utils/dialog';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SubscriptionService } from '../services/subscriptionService';
import { useData } from '../contexts/DataContext';
import { t } from '../utils/i18n';
import { useTablet } from '../hooks/useTablet'; // ← ДОБАВЛЕНО

const GHOST_ANCHOR_BG = require('../assets/images/ghost-anchor.png');
const SDM_LOGO = require('../assets/images/sdm_icon.png');

interface PaywallScreenProps {
  onClose: () => void;
}

export default function PaywallScreen({ onClose }: PaywallScreenProps) {
  const { state } = useData();
  const isDark = state.theme === 'dark';
  const isTablet = useTablet(); // ← ДОБАВЛЕНО
  
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<'monthly' | 'lifetime'>('lifetime');
  const [prices, setPrices] = useState({ monthly: '', lifetime: '' });

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offerings = await SubscriptionService.getOfferings();
      
      console.log('📦 [Paywall] Offerings received:', offerings);
      console.log('📱 [Paywall] Platform:', Platform.OS);
      
      if (!offerings || offerings.length === 0) {
        console.error('❌ [Paywall] No offerings available');
        alertMsg(
          t('paywall.alerts.errorTitle'),
          t('paywall.alerts.noOfferingsMessage')
        );
        setLoading(false);
        return;
      }

      setPackages(offerings);
      
      // ✅ ИСПРАВЛЕНО: Поддержка продуктов для обеих платформ
      const monthlyPkg = offerings.find((p: any) => {
        const productId = p.product?.identifier || '';
        const identifier = p.identifier || '';
        const packageType = p.packageType || '';
        
        console.log('🔍 Checking monthly package:', {
          identifier,
          packageType,
          productId,
        });
        
        return (
          // RevenueCat default identifiers
          identifier === '$rc_monthly' ||
          packageType === 'MONTHLY' ||
          // Google Play
          productId === 'sdm_unlim_subs:seafarer-documents-manager-subscription' ||
          // App Store
          productId === 'sdm_appstore_subscribe'
        );
      });
      
      const lifetimePkg = offerings.find((p: any) => {
        const productId = p.product?.identifier || '';
        const identifier = p.identifier || '';
        const packageType = p.packageType || '';
        
        console.log('🔍 Checking lifetime package:', {
          identifier,
          packageType,
          productId,
        });
        
        return (
          // RevenueCat default identifiers
          identifier === '$rc_lifetime' ||
          packageType === 'LIFETIME' ||
          // Google Play
          productId === 'sdm_seafarer_documents_manager_unlim_lifetime' ||
          // App Store
          productId === 'sdm_Premium'
        );
      });
      
      console.log('💰 [Paywall] Packages found:', {
        monthly: monthlyPkg ? {
          identifier: monthlyPkg.identifier,
          productId: monthlyPkg.product.identifier,
          price: monthlyPkg.product.priceString,
        } : 'NOT FOUND',
        lifetime: lifetimePkg ? {
          identifier: lifetimePkg.identifier,
          productId: lifetimePkg.product.identifier,
          price: lifetimePkg.product.priceString,
        } : 'NOT FOUND',
      });
      
      setPrices({
        monthly: monthlyPkg?.product?.priceString || t('paywall.pricing.monthly.price'),
        lifetime: lifetimePkg?.product?.priceString || t('paywall.pricing.lifetime.price'),
      });

      if (!monthlyPkg && !lifetimePkg) {
        console.error('❌ [Paywall] No packages found!');
        console.log('Available packages:', offerings.map((p: any) => ({
          identifier: p.identifier,
          packageType: p.packageType,
          productId: p.product?.identifier,
        })));
        
        alertMsg(
          t('paywall.alerts.errorTitle'),
          Platform.OS === 'ios'
            ? t('paywall.alerts.noPackagesIos')
            : t('paywall.alerts.noPackagesAndroid')
        );
      }
      
    } catch (error) {
      console.error('❌ [Paywall] Error loading offerings:', error);
      alertMsg(t('paywall.alerts.errorTitle'), t('paywall.alerts.noOfferingsMessage'));
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageType: 'monthly' | 'lifetime') => {
    if (!packages || packages.length === 0) {
      alertMsg(t('paywall.alerts.errorTitle'), t('paywall.alerts.packagesUnavailable'));
      return;
    }

    setPurchasing(true);

    try {
      const packageToBuy = packages.find((pkg: any) => {
        const productId = pkg.product?.identifier || '';
        const identifier = pkg.identifier || '';
        const pkgType = pkg.packageType || '';
        
        if (packageType === 'lifetime') {
          return (
            identifier === '$rc_lifetime' ||
            pkgType === 'LIFETIME' ||
            productId === 'sdm_seafarer_documents_manager_unlim_lifetime' ||
            productId === 'sdm_Premium'
          );
        } else {
          return (
            identifier === '$rc_monthly' ||
            pkgType === 'MONTHLY' ||
            productId === 'sdm_unlim_subs:seafarer-documents-manager-subscription' ||
            productId === 'sdm_appstore_subscribe'
          );
        }
      });

      if (!packageToBuy) {
        console.error(`❌ [Paywall] Package ${packageType} not found`);
        console.log('Available packages:', packages.map((p: any) => ({
          identifier: p.identifier,
          packageType: p.packageType,
          productId: p.product?.identifier,
        })));
        alertMsg(t('paywall.alerts.errorTitle'), t('paywall.alerts.errorPackage'));
        setPurchasing(false);
        return;
      }

      console.log(`🚀 [Paywall] Purchasing:`, {
        identifier: packageToBuy.identifier,
        productId: packageToBuy.product.identifier,
        price: packageToBuy.product.priceString,
      });
      
      const customerInfo = await SubscriptionService.purchasePackage(packageToBuy);

      if (customerInfo) {
        await chooseAsync(
          t('paywall.alerts.successTitle'),
          t('paywall.alerts.successMessage'),
          [{ text: t('paywall.alerts.successButton'), value: 'ok', style: 'primary' }]
        );
        onClose();
      }
    } catch (error: any) {
      console.error('❌ [Paywall] Purchase error:', error);
      
      if (!error.userCancelled) {
        alertMsg(
          t('paywall.alerts.errorPurchase'),
          error.message || t('paywall.alerts.purchaseErrorFallback')
        );
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    
    try {
      const customerInfo = await SubscriptionService.restorePurchases();
      
      if (customerInfo && customerInfo.entitlements.active['premium']) {
        await chooseAsync(
          t('paywall.alerts.restoreSuccessTitle'),
          t('paywall.alerts.restoreSuccessMessage'),
          [{ text: t('common.ok'), value: 'ok', style: 'primary' }]
        );
        onClose();
      } else {
        alertMsg(
          t('paywall.alerts.restoreFailTitle'),
          t('paywall.alerts.restoreFailMessage')
        );
      }
    } catch (error) {
      console.error('❌ [Paywall] Restore error:', error);
      alertMsg(
        t('paywall.alerts.restoreFailTitle'),
        t('paywall.alerts.restoreFailMessage')
      );
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, isDark ? styles.backgroundDark : styles.backgroundLight]}>
        <Image
          source={GHOST_ANCHOR_BG}
          style={[styles.anchorBackground, { opacity: isDark ? 0.08 : 0.22, tintColor: isDark ? '#64b5f6' : '#2B7CC1' }]}
          resizeMode="cover"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#64b5f6' : '#2B7CC1'} />
          <Text style={[styles.loadingText, isDark ? styles.textLight : styles.textDark]}>
            {t('paywall.loading')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark ? styles.backgroundDark : styles.backgroundLight]}>
      <Image
        source={GHOST_ANCHOR_BG}
        style={[styles.anchorBackground, { opacity: isDark ? 0.15 : 0.22, tintColor: isDark ? '#64b5f6' : '#2B7CC1' }]}
        resizeMode="cover"
      />

      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={isDark ? '#fff' : '#1A3A5C'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark ? styles.textLight : styles.textDark]}>
          {t('paywall.title')}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={isTablet ? styles.scrollContentTablet : undefined}>
        <View style={isTablet ? styles.centeredContent : undefined}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, isDark ? styles.iconCircleDark : styles.iconCircleLight]}>
            <Image source={SDM_LOGO} style={styles.logoImage} resizeMode="contain" />
          </View>
        </View>

        <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>
          {t('paywall.headerTitle')}
        </Text>
        <Text style={[styles.subtitle, isDark ? styles.textMuted : styles.textMutedLight]}>
          {t('paywall.subtitle')}
        </Text>

        <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
          <Feature icon="infinite" title={t('paywall.features.unlimitedDocs')} isDark={isDark} />
          <Feature icon="cloud-upload-outline" title={t('paywall.features.cloudBackup')} isDark={isDark} />
          <Feature icon="document-text-outline" title={t('paywall.features.cvUnlocked')} isDark={isDark} />
        </View>

        <View style={styles.pricingSection}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedPackage('lifetime')}>
            <View style={[
              styles.priceCard,
              isDark ? styles.priceCardDark : styles.priceCardLight,
              selectedPackage === 'lifetime' && styles.priceCardSelected
            ]}>
              <View style={styles.priceCardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.priceCardTitleRow}>
                    <Ionicons name="trophy" size={20} color="#FFD700" />
                    <Text style={[styles.priceCardTitle, isDark ? styles.textLight : styles.textDark]}>
                      {t('paywall.pricing.lifetime.title')}
                    </Text>
                  </View>
                  <Text style={[styles.priceCardSubtitle, isDark ? styles.textMuted : styles.textMutedLight]}>
                    {t('paywall.pricing.lifetime.subtitle')}
                  </Text>
                </View>
                {selectedPackage === 'lifetime' && <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />}
              </View>
              <View style={styles.priceCardAmount}>
                <Text style={[styles.priceAmount, isDark ? styles.textLight : styles.textDark]}>
                  {prices.lifetime}
                </Text>
              </View>
              <View style={[styles.recommendedBadge, { backgroundColor: '#FFD700' + '20' }]}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={[styles.recommendedText, { color: '#FFD700' }]}>
                  {t('paywall.pricing.lifetime.badge')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedPackage('monthly')}>
            <View style={[
              styles.priceCard,
              isDark ? styles.priceCardDark : styles.priceCardLight,
              selectedPackage === 'monthly' && styles.priceCardSelected
            ]}>
              <View style={styles.priceCardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.priceCardTitleRow}>
                    <Ionicons name="calendar" size={20} color={isDark ? '#64b5f6' : '#2B7CC1'} />
                    <Text style={[styles.priceCardTitle, isDark ? styles.textLight : styles.textDark]}>
                      {t('paywall.pricing.monthly.title')}
                    </Text>
                  </View>
                  <Text style={[styles.priceCardSubtitle, isDark ? styles.textMuted : styles.textMutedLight]}>
                    {t('paywall.pricing.monthly.subtitle')}
                  </Text>
                </View>
                {selectedPackage === 'monthly' && <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />}
              </View>
              <View style={styles.priceCardAmount}>
                <Text style={[styles.priceAmount, isDark ? styles.textLight : styles.textDark]}>
                  {prices.monthly}
                </Text>
                <Text style={[styles.priceUnit, isDark ? styles.textMuted : styles.textMutedLight]}>
                  {t('paywall.pricing.monthly.unit')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handlePurchase(selectedPackage)}
          disabled={purchasing}
          style={styles.purchaseButtonContainer}
        >
          <LinearGradient
            colors={purchasing ? ['#9E9E9E', '#757575'] : ['#1e88e5', '#1565c0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.purchaseButton}
          >
            {purchasing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={20} color="#fff" />
                <Text style={styles.purchaseButtonText}>
                  {selectedPackage === 'lifetime' ? t('paywall.buttons.buyLifetime') : t('paywall.buttons.subscribe')}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRestore} disabled={purchasing} style={styles.restoreButton}>
          <Ionicons name="refresh" size={16} color={isDark ? '#64b5f6' : '#2B7CC1'} />
          <Text style={[styles.restoreText, isDark ? styles.textLight : styles.textDark]}>
            {t('paywall.buttons.restore')}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.legalText, isDark ? styles.textMuted : styles.textMutedLight]}>
          {t('paywall.legal')}
        </Text>

        <View style={{ height: 40 }} />
        </View>
      </ScrollView>
      {/* Paywall itself lives inside a Modal → dialogs must render here */}
      <DialogHost />
    </View>
  );
}

function Feature({ icon, title, isDark, isLast }: { 
  icon: any; 
  title: string; 
  isDark: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.feature, !isLast && styles.featureBorder, isLast && { borderBottomWidth: 0 }]}>
      <View style={[styles.featureIcon, { backgroundColor: isDark ? 'rgba(100, 181, 246, 0.15)' : 'rgba(25, 118, 210, 0.1)' }]}>
        <Ionicons name={icon} size={20} color={isDark ? '#64b5f6' : '#2B7CC1'} />
      </View>
      <Text style={[styles.featureText, isDark ? styles.textLight : styles.textDark]}>
        {title}
      </Text>
      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundDark: { backgroundColor: '#0a1628' },
  backgroundLight: { backgroundColor: '#F0F7FF' },
  anchorBackground: { position: 'absolute', width: '100%', height: '100%' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  closeButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 16 },
  // ↓ НОВЫЕ СТИЛИ iPad
  scrollContentTablet: { alignItems: 'center' },
  centeredContent: { width: '100%', maxWidth: 560 },
  // ↑ КОНЕЦ НОВЫХ СТИЛЕЙ
  iconContainer: { alignItems: 'center', marginTop: 20, marginBottom: 24 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center' },
  iconCircleDark: { backgroundColor: 'rgba(100, 181, 246, 0.15)' },
  iconCircleLight: { backgroundColor: 'rgba(139, 90, 43, 0.1)' },
  logoImage: { width: 130, height: 130 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  section: { borderRadius: 16, marginBottom: 24, overflow: 'hidden' },
  sectionDark: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  sectionLight: { backgroundColor: 'rgba(253, 248, 240, 0.14)' },
  feature: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  featureBorder: { borderBottomWidth: 1 },
  featureIcon: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  featureText: { flex: 1, fontSize: 15 },
  pricingSection: { gap: 12, marginBottom: 24 },
  priceCard: { borderRadius: 16, padding: 20, borderWidth: 2, borderColor: 'transparent' },
  priceCardDark: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  priceCardLight: { backgroundColor: 'rgba(253, 248, 240, 0.14)' },
  priceCardSelected: { borderColor: '#4CAF50' },
  priceCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  priceCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  priceCardTitle: { fontSize: 18, fontWeight: '600' },
  priceCardSubtitle: { fontSize: 13 },
  priceCardAmount: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  priceAmount: { fontSize: 36, fontWeight: 'bold' },
  priceUnit: { fontSize: 16, marginLeft: 4 },
  recommendedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  recommendedText: { fontSize: 12, fontWeight: '600' },
  purchaseButtonContainer: { marginBottom: 16 },
  purchaseButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8 },
  purchaseButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  restoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, marginBottom: 24 },
  restoreText: { fontSize: 15, fontWeight: '500' },
  legalText: { fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: 20 },
  textLight: { color: '#fff' },
  textDark: { color: '#1A3A5C' },
  textMuted: { color: 'rgba(255, 255, 255, 0.6)' },
  textMutedLight: { color: '#8B7355' },
});