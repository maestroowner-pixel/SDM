// Paywall / premium management (Lemon Squeezy, client-only license keys).
// Buy → hosted checkout (new tab) → paste the emailed license key → activate.
import React, { useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Linking, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { UI_THEME } from '../utils/theme';
import { t } from '../utils/i18n';
import { alertMsg } from '../utils/webAlert';
import {
  isLemonConfigured, buildCheckoutUrl, activateLicense, deactivateLicense,
} from '../utils/lemon';

const BENEFITS = [
  'Full document details & dates in CV PDF',
  'Unlimited documents & sea service records',
  'All CV designs and the design constructor',
  'Full next-of-kin details in CV',
  'Priority support',
];

export const PaywallScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { state } = useData();
  const isDark = state.theme === 'dark';
  const theme = isDark ? UI_THEME.colors.dark : UI_THEME.colors.light;
  const { user } = useAuth();
  const { isPremium, refreshStatus } = useSubscription();

  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);

  const email = user?.email || state.personal.email || undefined;

  const openCheckout = () => {
    if (!isLemonConfigured) { alertMsg('Premium', 'Checkout is not configured yet.'); return; }
    Linking.openURL(buildCheckoutUrl(email)).catch(() => {});
  };

  const activate = async () => {
    setBusy(true);
    try {
      const res = await activateLicense(key, email);
      if (res.ok) {
        await refreshStatus();
        alertMsg('Premium', 'Premium activated. Thank you!');
        onClose();
      } else {
        alertMsg('Activation failed', res.message || 'Please check your license key.');
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deactivateLicense();
      await refreshStatus();
      alertMsg('Premium', 'Premium removed from this device.');
    } finally {
      setBusy(false);
    }
  };

  const card = [styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)', borderColor: theme.iconInactive }];

  return (
    <LinearGradient colors={theme.background as any} style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={26} color={theme.text} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Ionicons name="star" size={48} color="#FFC107" />
          <Text style={[styles.title, { color: theme.text }]}>SDM Web Premium</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Unlock the full CV export and all features.
          </Text>
        </View>

        {isPremium ? (
          <View style={card}>
            <View style={styles.activeRow}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={[styles.activeText, { color: theme.text }]}>Premium is active on this device</Text>
            </View>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: '#f44336' }]} onPress={remove} disabled={busy}>
              {busy ? <ActivityIndicator color="#f44336" /> : <Text style={[styles.secondaryBtnText, { color: '#f44336' }]}>Remove from this device</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={card}>
              {BENEFITS.map((b, i) => (
                <View key={i} style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                  <Text style={[styles.benefitText, { color: theme.text }]}>{b}</Text>
                </View>
              ))}
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} onPress={openCheckout}>
                <Ionicons name="cart" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Get Premium</Text>
              </TouchableOpacity>
              {!isLemonConfigured && (
                <Text style={[styles.note, { color: theme.textSecondary }]}>Checkout link not configured yet.</Text>
              )}
            </View>

            <View style={card}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Already purchased?</Text>
              <Text style={[styles.note, { color: theme.textSecondary }]}>
                Enter the license key from your purchase email.
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.iconInactive, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)' }]}
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                placeholderTextColor={theme.textSecondary}
                value={key}
                onChangeText={setKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} onPress={activate} disabled={busy || !key.trim()}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Activate</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', padding: 20, paddingBottom: 0 },
  scroll: { alignItems: 'center', padding: 24, paddingTop: 8 },
  hero: { alignItems: 'center', marginBottom: 20, gap: 6 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 15, textAlign: 'center' },
  card: { width: '100%', maxWidth: 520, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 24, marginBottom: 18 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  benefitText: { fontSize: 15, flex: 1 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 14, marginTop: 10 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondaryBtn: { height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  secondaryBtnText: { fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  note: { fontSize: 13, marginBottom: 12, textAlign: 'center' },
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, marginBottom: 12, marginTop: 6 },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeText: { fontSize: 16, fontWeight: '600', flex: 1 },
});
