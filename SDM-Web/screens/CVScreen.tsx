// screens/CVScreen.tsx — Web CV "design constructor".
// Left panel: layout / accent / font / feature toggles. Right: live iframe
// preview that updates as you tweak. Generate → browser print (Save as PDF)
// with the mobile filename rule: CV_<lastName>_<YYYYMMDD>.pdf. Config persists.
import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, TextInput,
  ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useData } from '../contexts/DataContext';
import { useSubscription } from '../hooks/useSubscription';
import { useTablet } from '../hooks/useTablet';
import { t } from '../utils/i18n';
import { formatDateForFilename } from '../utils/helpers';
import { printHtml } from '../utils/webPrint';
import { alertMsg } from '../utils/webAlert';
import { playSuccessSound } from '../utils/sound';
import {
  buildCvHtml, CvDesignConfig, defaultCvConfig, CV_LAYOUTS, ACCENT_PRESETS,
} from '../utils/cvTemplate';

const CONFIG_KEY = 'cv_design_config';

export const CVScreen: React.FC<{ onDisableSwipe?: () => void; onOpenPaywall?: () => void }> = ({ onOpenPaywall }) => {
  const { state, updatePersonal } = useData();
  const { isPremium } = useSubscription();
  const isDark = state.theme === 'dark';
  const isTablet = useTablet();

  const [config, setConfig] = useState<CvDesignConfig>(defaultCvConfig);
  const [hexInput, setHexInput] = useState(defaultCvConfig.accent);
  const [loadedConfig, setLoadedConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastGeneratedDate, setLastGeneratedDate] = useState(state.personal.lastCVGeneratedDate || '');

  // Load persisted config once.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CONFIG_KEY);
        if (raw) {
          const parsed = { ...defaultCvConfig, ...JSON.parse(raw) };
          setConfig(parsed);
          setHexInput(parsed.accent);
        }
      } catch {}
      finally { setLoadedConfig(true); }
    })();
  }, []);

  // Persist config on change (after initial load).
  useEffect(() => {
    if (loadedConfig) AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config)).catch(() => {});
  }, [config, loadedConfig]);

  useEffect(() => {
    if (state.personal.lastCVGeneratedDate && state.personal.lastCVGeneratedDate !== lastGeneratedDate) {
      setLastGeneratedDate(state.personal.lastCVGeneratedDate);
    }
  }, [state.personal.lastCVGeneratedDate]);

  // The design constructor is a Premium feature: free users see a live preview
  // of the default design but any customization opens the paywall.
  const effectiveConfig = isPremium ? config : defaultCvConfig;

  const set = <K extends keyof CvDesignConfig>(key: K, value: CvDesignConfig[K]) => {
    if (!isPremium) { onOpenPaywall?.(); return; }
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const applyHex = (raw: string) => {
    if (!isPremium) { onOpenPaywall?.(); return; }
    setHexInput(raw);
    let v = raw.trim();
    if (!v.startsWith('#')) v = `#${v}`;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) set('accent', v);
  };

  const html = useMemo(() => buildCvHtml(state, isPremium, effectiveConfig), [state, isPremium, effectiveConfig]);

  const hasData = state.personal.firstName || state.seaService.length > 0 || state.documents.length > 0;

  const generatePDF = async () => {
    try {
      setLoading(true);
      const dateStr = formatDateForFilename(new Date());
      const lastName = state.personal.lastName || 'Seaman';
      const fileName = `CV_${lastName}_${dateStr}`;
      printHtml(html, fileName);
      const currentDate = new Date().toISOString();
      updatePersonal({ ...state.personal, lastCVGeneratedDate: currentDate });
      setLastGeneratedDate(currentDate);
      playSuccessSound();
    } catch (error) {
      alertMsg(t('common.error'), t('cv.alerts.errorMessage'));
      console.error('PDF generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const theme = {
    text: isDark ? '#fff' : '#1A3A5C',
    muted: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
    card: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)',
    border: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
    chipInactive: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)',
  };

  const SectionLabel = ({ children }: { children: string }) => (
    <Text style={[styles.sectionLabel, { color: theme.muted }]}>{children}</Text>
  );

  const controls = (
    <ScrollView style={styles.panel} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={[styles.title, { color: theme.text }]}>{t('cv.title')}</Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>{t('cv.subtitle')}</Text>

      {!isPremium && (
        <View style={styles.trialWarning}>
          <Ionicons name="alert-circle" size={18} color="#f44336" />
          <Text style={styles.trialWarningText}>{t('cv.trialNotice')}</Text>
        </View>
      )}

      {/* The design constructor is Premium. Free users see the default design
          preview; tapping any control opens the paywall. */}
      {!isPremium && (
        <TouchableOpacity style={styles.premiumLock} onPress={() => onOpenPaywall?.()} activeOpacity={0.85}>
          <Ionicons name="lock-closed" size={18} color="#FFC107" />
          <Text style={styles.premiumLockText}>Design constructor is a Premium feature — tap to unlock</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.muted} />
        </TouchableOpacity>
      )}

      <View pointerEvents={isPremium ? 'auto' : undefined} style={!isPremium ? { opacity: 0.5 } : undefined}>
      {/* Layout */}
      <SectionLabel>Layout</SectionLabel>
      <View style={styles.chipRow}>
        {CV_LAYOUTS.map(l => {
          const active = effectiveConfig.layout === l.id;
          return (
            <TouchableOpacity
              key={l.id}
              style={[styles.chip, { backgroundColor: active ? effectiveConfig.accent : theme.chipInactive, borderColor: active ? effectiveConfig.accent : theme.border }]}
              onPress={() => set('layout', l.id)}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : theme.text }]}>{l.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Accent */}
      <SectionLabel>Accent color</SectionLabel>
      <View style={styles.swatchRow}>
        {ACCENT_PRESETS.map(p => (
          <TouchableOpacity
            key={p.color}
            style={[styles.swatch, { backgroundColor: p.color }, effectiveConfig.accent.toLowerCase() === p.color.toLowerCase() && styles.swatchActive]}
            onPress={() => { set('accent', p.color); setHexInput(p.color); }}
          >
            {effectiveConfig.accent.toLowerCase() === p.color.toLowerCase() && <Ionicons name="checkmark" size={16} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.hexRow}>
        <View style={[styles.hexPreview, { backgroundColor: effectiveConfig.accent, borderColor: theme.border }]} />
        <TextInput
          style={[styles.hexInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.chipInactive }]}
          value={isPremium ? hexInput : effectiveConfig.accent}
          onChangeText={applyHex}
          placeholder="#1976d2"
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
          maxLength={7}
          editable={isPremium}
        />
        <Text style={[styles.hexHint, { color: theme.muted }]}>custom HEX</Text>
      </View>

      {/* Font */}
      <SectionLabel>Font</SectionLabel>
      <View style={styles.chipRow}>
        {(['sans', 'serif'] as const).map(f => {
          const active = effectiveConfig.font === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.chip, { backgroundColor: active ? effectiveConfig.accent : theme.chipInactive, borderColor: active ? effectiveConfig.accent : theme.border }]}
              onPress={() => set('font', f)}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : theme.text, fontFamily: f === 'serif' ? 'Georgia' : undefined }]}>
                {f === 'sans' ? 'Sans' : 'Serif'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Toggles */}
      <SectionLabel>Elements</SectionLabel>
      {([
        ['showPhoto', 'Photo'],
        ['showAppQr', 'App QR (header)'],
        ['showContactQr', 'Contact vCard QR'],
        ['uppercaseHeadings', 'Uppercase headings'],
        ['zebra', 'Striped tables'],
      ] as [keyof CvDesignConfig, string][]).map(([key, label]) => (
        <View key={key} style={[styles.toggleRow, { borderColor: theme.border }]}>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>{label}</Text>
          <Switch
            value={effectiveConfig[key] as boolean}
            onValueChange={(v) => set(key, v as any)}
            trackColor={{ false: '#999', true: effectiveConfig.accent }}
            thumbColor="#fff"
          />
        </View>
      ))}
      </View>

      <TouchableOpacity
        style={[styles.generateBtn, { backgroundColor: effectiveConfig.accent }, (!hasData || loading) && { opacity: 0.5 }]}
        onPress={generatePDF}
        disabled={!hasData || loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator size="small" color="#fff" />
          : <Ionicons name="document-text" size={20} color="#fff" />}
        <Text style={styles.generateBtnText}>{t('cv.generateButton') !== 'cv.generateButton' ? t('cv.generateButton') : 'Generate CV (PDF)'}</Text>
      </TouchableOpacity>

      {!hasData && (
        <Text style={[styles.hint, { color: theme.muted }]}>{t('cv.subtitle')}</Text>
      )}
      {lastGeneratedDate ? (
        <Text style={[styles.lastGen, { color: theme.muted }]}>
          {t('cv.lastGenerated')}: {new Date(lastGeneratedDate).toLocaleString()}
        </Text>
      ) : null}
    </ScrollView>
  );

  // Live preview via a real DOM iframe (react-dom host under react-native-web).
  const preview = (
    <View style={[styles.previewBox, { borderColor: theme.border }]}>
      {React.createElement('iframe', {
        srcDoc: html,
        title: 'CV preview',
        style: { width: '100%', height: '100%', border: '0', background: '#fff', borderRadius: 10 },
      })}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <View style={[styles.container, isTablet ? styles.row : styles.column]}>
        <View style={isTablet ? styles.controlsCol : styles.controlsFull}>{controls}</View>
        <View style={isTablet ? styles.previewCol : styles.previewFull}>{preview}</View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 20 },
  row: { flexDirection: 'row' },
  column: { flexDirection: 'column' },
  controlsCol: { width: 360 },
  controlsFull: { flex: 1 },
  previewCol: { flex: 1 },
  previewFull: { flex: 1, minHeight: 480 },
  panel: { flex: 1 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '600' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: '#fff', ...(Platform.OS === 'web' ? { boxShadow: '0 0 0 2px rgba(0,0,0,0.25)' } as any : {}) },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  hexPreview: { width: 34, height: 34, borderRadius: 8, borderWidth: 1 },
  hexInput: { width: 110, height: 40, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  hexHint: { fontSize: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  toggleLabel: { fontSize: 15, fontWeight: '500' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 14, marginTop: 24 },
  generateBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  hint: { fontSize: 13, marginTop: 12, textAlign: 'center' },
  lastGen: { fontSize: 12, marginTop: 14, textAlign: 'center' },
  previewBox: { flex: 1, borderRadius: 12, borderWidth: 1, overflow: 'hidden', backgroundColor: '#fff', minHeight: 480 },
  trialWarning: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(244,67,54,0.12)', borderRadius: 10, padding: 10, marginBottom: 4 },
  trialWarningText: { color: '#f44336', fontSize: 12, flex: 1 },
  premiumLock: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,193,7,0.14)', borderColor: 'rgba(255,193,7,0.5)', borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8, marginBottom: 4 },
  premiumLockText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#B8860B' },
});
