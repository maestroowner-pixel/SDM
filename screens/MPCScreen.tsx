// screens/MPCScreen.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ImageBackground,
  ActivityIndicator,
  Animated,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import { useTablet } from '../hooks/useTablet';
import { useData } from '../contexts/DataContext';
import SimpleDatePicker from '../components/SimpleDatePicker';
import { t } from '../utils/i18n';

// Локальный словарь — обходим кэш бандла и асинхронную загрузку i18n.locale
import { isInsideTerritorialWaters, formatLat, formatLon, parseDegrees } from '../utils/geoUtils';

import {
  loadMPCRecords, saveMPCRecords,
  loadMPCVesselName, saveMPCVesselName,
} from '../services/mpcStorage';
import { useMidnightTask } from '../hooks/useMidnightTask';

// GeoJSON для UK 12nm зоны
const UK_ZONE = require('../data/uk_12nm_zone.json');

const GHOST_FLAG_BG = require('../assets/images/ghost-flag.png');

// ─── Типы ─────────────────────────────────────────────────────────────────────

export type MPCStatus = 'OUTSIDE' | 'INSIDE';

export interface MPCRecord {
  id: string;       // yyyy-mm-dd (уникальный ключ)
  date: string;     // yyyy-mm-dd
  lat: string;      // '51.5074 N'
  lon: string;      // '000.1278 W'
  status: MPCStatus;
  note?: string;
}

// ─── Хелперы ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function displayDate(iso: string): string {
  if (!iso) return '';
  if (iso.includes('/') && iso.indexOf('/') === 2) return iso;
  if (iso.includes('/')) {
    const [mm, dd, yyyy] = iso.split('/');
    if (mm && dd && yyyy) return `${dd}/${mm}/${yyyy}`;
    return iso;
  }
  const normalized = iso.replace(/\./g, '-');
  const [y, m, d] = normalized.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function monthLabel(iso: string): string {
  if (!iso || iso.length < 7) return '';
  const [y, m] = iso.substring(0, 7).split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function getMonthKey(iso: string): string {
  return iso.substring(0, 7);
}

function groupByMonth(records: MPCRecord[]): Record<string, MPCRecord[]> {
  const groups: Record<string, MPCRecord[]> = {};
  records.forEach(r => {
    const key = getMonthKey(r.date);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return groups;
}

// ─── Цвета ────────────────────────────────────────────────────────────────────

const getTC = (isDark: boolean) => ({
  bg: (isDark
    ? ['#0a1628', '#1a2a4a', '#0d1a2d']
    : ['#F0F7FF', '#E1EFFD', '#D0E7FC']) as [string, string, string],
  sectionBg:  isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.78)',
  text:        isDark ? '#ffffff' : '#1a2a4a',
  sub:         isDark ? 'rgba(255,255,255,0.55)' : '#556B8D',
  accent:      isDark ? '#00BFFF' : '#007AFF',
  accentGlow:  isDark ? 'rgba(0,191,255,0.18)' : 'rgba(0,119,255,0.12)',
  cardBg:      isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.88)',
  cardBorder:  isDark ? 'rgba(0,191,255,0.22)' : 'rgba(0,119,255,0.2)',
  inputBg:     isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
  inputBorder: isDark ? 'rgba(255,255,255,0.15)' : '#d0d8e8',
  inputText:   isDark ? '#ffffff' : '#1a2a4a',
  modalBg:     isDark ? '#0a1628' : '#f0f4f8',
  divider:     isDark ? 'rgba(255,255,255,0.1)' : '#dde3ed',
  outside:     '#3dbd6b',
  inside:      '#FF6B6B',
  outsideGlow: 'rgba(61,189,107,0.15)',
  insideGlow:  'rgba(255,107,107,0.15)',
});

// ─── Компоненты ───────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: MPCStatus; tc: ReturnType<typeof getTC> }> = ({ status, tc }) => (
  <View style={[sb.badge, {
    backgroundColor: status === 'OUTSIDE' ? tc.outsideGlow : tc.insideGlow,
    borderColor:     status === 'OUTSIDE' ? tc.outside : tc.inside,
  }]}>
    <View style={[sb.dot, { backgroundColor: status === 'OUTSIDE' ? tc.outside : tc.inside }]} />
    <Text style={[sb.txt, { color: status === 'OUTSIDE' ? tc.outside : tc.inside }]}>{status}</Text>
  </View>
);
const sb = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  dot:   { width: 6, height: 6, borderRadius: 3 },
  txt:   { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});

const Field: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  tc: ReturnType<typeof getTC>; placeholder?: string;
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  keyboardType?: 'default' | 'decimal-pad';
  rightButton?: React.ReactNode;
}> = ({ label, value, onChange, tc, placeholder, autoCapitalize = 'characters', keyboardType = 'default', rightButton }) => (
  <View style={fi.group}>
    <Text style={[fi.label, { color: tc.sub }]}>{label}</Text>
    <View style={fi.row}>
      <TextInput
        style={[fi.input, { backgroundColor: tc.inputBg, borderColor: tc.inputBorder, color: tc.inputText, flex: 1 }]}
        value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={tc.sub}
        autoCapitalize={autoCapitalize} keyboardType={keyboardType}
      />
      {rightButton}
    </View>
  </View>
);
const fi = StyleSheet.create({
  group: { marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
});

// ─── Главный компонент ────────────────────────────────────────────────────────

const MPCScreen: React.FC = () => {
  const isTablet = useTablet();
  const { state } = useData();
  const isDark = state.theme === 'dark';
  const tc = getTC(isDark);
  const { requestAndStart, stop } = useMidnightTask();

  const personalFullName = [state.personal.firstName, state.personal.lastName].filter(Boolean).join(' ');
  const personalRank = state.personal.appliedPosition === 'Other'
    ? (state.personal.customPosition || '') : (state.personal.appliedPosition || '');

  // ── Состояние ──────────────────────────────────────────────────────────────
  const [records, setRecords]       = useState<MPCRecord[]>([]);
  const [vesselName, setVesselName] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(todayStr().substring(0, 7));
  const [loading, setLoading]       = useState(true);


  // Модалы
  const [addModal, setAddModal]   = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);

  // Форма
  const [formDate, setFormDate]     = useState(todayStr());
  const [formLat, setFormLat]       = useState('');
  const [formLon, setFormLon]       = useState('');
  const [formStatus, setFormStatus] = useState<MPCStatus>('OUTSIDE');
  const [formNote, setFormNote]     = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [londonTime, setLondonTime] = useState('');
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [showLocationDisclosure, setShowLocationDisclosure] = useState(false);
  const [pendingLocationAction, setPendingLocationAction] = useState<'gps' | 'auto' | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const MPC_AUTO_KEY = 'mpc_auto_enabled';

  // London time — обновляется каждую секунду
  useEffect(() => {
    const update = () => {
      const str = new Date().toLocaleTimeString('en-GB', {
        timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      setLondonTime(str);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Pulse animation для GPS иконки
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    if (gpsLoading) pulse.start();
    else { pulse.stop(); pulseAnim.setValue(1); }
    return () => pulse.stop();
  }, [gpsLoading]);

  // ── Загрузка из AsyncStorage ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [recs, vessel, autoVal] = await Promise.all([
        loadMPCRecords(),
        loadMPCVesselName(),
        AsyncStorage.getItem(MPC_AUTO_KEY),
      ]);
      setRecords(recs);
      setVesselName(vessel);
      setAutoEnabled(autoVal === 'true');
      setLoading(false);
    })();
  }, []);

  // ── Сохранение при изменении ───────────────────────────────────────────────
  const saveRecords = useCallback(async (newRecs: MPCRecord[]) => {
    setRecords(newRecs);
    await saveMPCRecords(newRecs);
  }, []);

  const handleAutoToggle = useCallback(async (val: boolean) => {
    if (val) {
      const existing = await Location.getBackgroundPermissionsAsync();
      if (existing.status === 'granted') {
        const started = await requestAndStart();
        if (started) {
          setAutoEnabled(true);
          await AsyncStorage.setItem(MPC_AUTO_KEY, 'true');
          setTimeout(() => Alert.alert(t('mpc.autoTitle'), t('mpc.autoEnabledMsg')), 300);
        }
      } else {
        setPendingLocationAction('auto');
        setShowLocationDisclosure(true);
      }
    } else {
      setAutoEnabled(false);
      await AsyncStorage.setItem(MPC_AUTO_KEY, 'false');
      await stop();
    }
  }, [requestAndStart, stop]);

  const handleVesselChange = useCallback(async (v: string) => {
    setVesselName(v);
    await saveMPCVesselName(v);
  }, []);

  // ── Производные ────────────────────────────────────────────────────────────
  const grouped = groupByMonth(records);
  const monthKeys = Object.keys(grouped).sort().reverse();
  const availableMonths = monthKeys.length > 0 ? monthKeys : [todayStr().substring(0, 7)];
  const currentMonthKey = availableMonths.includes(selectedMonth) ? selectedMonth : availableMonths[0];
  const currentRecords = (grouped[currentMonthKey] || []).sort((a, b) => a.date.localeCompare(b.date));
  const outsideCount = currentRecords.filter(r => r.status === 'OUTSIDE').length;
  const insideCount  = currentRecords.filter(r => r.status === 'INSIDE').length;

  // ── GPS ────────────────────────────────────────────────────────────────────
  const doGetGPSPosition = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', t('mpc.permDeniedGps'));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      setFormLat(formatLat(latitude));
      setFormLon(formatLon(longitude));
      // Автоопределение статуса
      const inside = isInsideTerritorialWaters(latitude, longitude, UK_ZONE);
      setFormStatus(inside ? 'INSIDE' : 'OUTSIDE');
    } catch (e: any) {
      Alert.alert('GPS Error', e?.message || 'Could not get location');
    } finally {
      setGpsLoading(false);
    }
  };

  const getGPSPosition = async () => {
    const existing = await Location.getForegroundPermissionsAsync();
    if (existing.status === 'granted') {
      await doGetGPSPosition();
    } else {
      setPendingLocationAction('gps');
      setShowLocationDisclosure(true);
    }
  };

  const doRequestAndStart = async (): Promise<boolean> => {
    return requestAndStart();
  };

  // Вызывается после согласия пользователя с disclosure
  const onLocationDisclosureAccept = async () => {
    setShowLocationDisclosure(false);
    if (pendingLocationAction === 'gps') {
      await doGetGPSPosition();
    } else if (pendingLocationAction === 'auto') {
      const started = await doRequestAndStart();
      if (started) {
        setAutoEnabled(true);
        await AsyncStorage.setItem(MPC_AUTO_KEY, 'true');
        setTimeout(() => Alert.alert(t('mpc.autoTitle'), t('mpc.autoEnabledMsg')), 300);
      }
    }
    setPendingLocationAction(null);
  };

  const onLocationDisclosureDecline = () => {
    setShowLocationDisclosure(false);
    setPendingLocationAction(null);
  };

  // ── Добавить ───────────────────────────────────────────────────────────────
  const openAdd = () => {
    setFormDate(todayStr());
    setFormLat(''); setFormLon('');
    setFormStatus('OUTSIDE'); setFormNote('');
    setAddModal(true);
  };

  const saveAdd = async () => {
    if (!formLat.trim() || !formLon.trim()) {
      Alert.alert(t('common.error'), t('mpc.errorCoords'));
      return;
    }
    if (records.find(r => r.date === formDate)) {
      Alert.alert(t('common.error'), t('mpc.errorExists'));
      return;
    }
    const rec: MPCRecord = {
      id: formDate, date: formDate,
      lat: formLat.trim().toUpperCase(),
      lon: formLon.trim().toUpperCase(),
      status: formStatus,
      note: formNote.trim(),
    };
    const updated = [...records, rec].sort((a, b) => a.date.localeCompare(b.date));
    await saveRecords(updated);
    setSelectedMonth(getMonthKey(formDate));
    setAddModal(false);
  };

  // ── Редактировать ──────────────────────────────────────────────────────────
  const openEdit = (rec: MPCRecord) => {
    setEditId(rec.id); setFormDate(rec.date);
    setFormLat(rec.lat); setFormLon(rec.lon);
    setFormStatus(rec.status); setFormNote(rec.note || '');
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!formLat.trim() || !formLon.trim()) {
      Alert.alert('Error', 'Please enter latitude and longitude');
      return;
    }
    const updated = records.map(r =>
      r.id === editId ? {
        ...r,
        lat: formLat.trim().toUpperCase(),
        lon: formLon.trim().toUpperCase(),
        status: formStatus,
        note: formNote.trim(),
      } : r
    );
    await saveRecords(updated);
    setEditModal(false); setEditId(null);
  };

  const deleteRecord = (id: string) => {
    Alert.alert(t('mpc.deleteTitle'), t('mpc.deleteMsg'), [
      { text: t('mpc.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        const updated = records.filter(r => r.id !== id);
        await saveRecords(updated);
        setEditModal(false); setEditId(null);
      }},
    ]);
  };

  // ── PDF ────────────────────────────────────────────────────────────────────
  const generatePDF = async () => {
    if (currentRecords.length === 0) {
      Alert.alert(t('common.error'), t('mpc.noDataPdf'));
      return;
    }
    const name   = personalFullName || 'Seafarer';
    const rank   = personalRank || 'Officer';
    const vessel = vesselName || '—';
    const monthStr = monthLabel(currentMonthKey + '-01');
    const today  = displayDate(todayStr());
    const surname = state.personal.lastName || 'Seafarer';

    const rows = currentRecords.map(r => `
      <tr>
        <td>${displayDate(r.date)}</td>
        <td>00:00 UTC</td>
        <td>${r.lat}</td>
        <td>${r.lon}</td>
        <td style="color:${r.status === 'OUTSIDE' ? '#27ae60' : '#e74c3c'};font-weight:bold">${r.status}</td>
        <td style="color:#666;font-size:8.5pt">${r.note || '—'}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; line-height: 1.5; }
  h2 { font-size: 13pt; color: #002147; margin: 0 0 4px; }
  .meta { font-size: 9pt; color: #555; margin-bottom: 14px; }

  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th { background: #002147; color: #fff; padding: 6px 8px; text-align: left; }
  td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; }
  tr:nth-child(even) td { background: #f8f9fa; }
  .footer { margin-top: 20px; font-size: 8pt; color: #aaa; border-top: 1px solid #ddd; padding-top: 8px; }
</style></head><body>
<h2>Midnight Position Check — ${monthStr}</h2>
<div class="meta"><b>${name}</b> · ${rank} · Vessel: <b>${vessel}</b><br>
Generated: ${today} · Territorial Waters Status (12nm / UK)</div>
<table>
  <thead><tr><th>Date</th><th>Time (UTC)</th><th>Latitude</th><th>Longitude</th><th>TW Status</th><th>Note</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">Midnight Position Check · SDM by Kuka Lab · Not for navigational use</div>
</body></html>`;

    try {
      const safeMonth = currentMonthKey.replace('-', '_');
      const fileName = `MPC_${safeMonth}_${surname}.pdf`;
      const { uri } = await Print.printToFileAsync({ html });
      const destUri = uri.substring(0, uri.lastIndexOf('/') + 1) + fileName;
      await FileSystem.deleteAsync(destUri, { idempotent: true });
      await FileSystem.moveAsync({ from: uri, to: destUri });
      await Sharing.shareAsync(destUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } catch (e: any) {
      Alert.alert('PDF Error', e?.message || 'Could not generate PDF');
    }
  };

  // ── Форма (переиспользуется) ───────────────────────────────────────────────
  const renderForm = (isEdit = false) => (
    <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled">

      {/* London time */}
      <View style={[s.londonRow, { backgroundColor: tc.accentGlow, borderColor: tc.cardBorder }]}>
        <Ionicons name="time-outline" size={13} color={tc.accent} />
        <Text style={[s.londonTxt, { color: tc.accent }]}>London  {londonTime}</Text>
        <Text style={[s.londonSub, { color: tc.sub }]}>UTC±0/+1</Text>
      </View>

      {!isEdit
        ? <SimpleDatePicker label="Date" value={formDate} onChange={setFormDate} isDark={isDark} />
        : (
          <View style={s.editDateRow}>
            <Ionicons name="calendar-outline" size={15} color={tc.sub} />
            <Text style={[s.editDateTxt, { color: tc.text }]}>{displayDate(formDate)}</Text>
          </View>
        )
      }

      {/* Latitude + мерцающая GPS иконка */}
      <View style={[fi.group, { marginTop: 8 }]}>
        <Text style={[fi.label, { color: tc.sub }]}>{t('mpc.latitude')}</Text>
        <View style={fi.row}>
          <TextInput
            style={[fi.input, { backgroundColor: tc.inputBg, borderColor: tc.inputBorder, color: tc.inputText, flex: 1 }]}
            value={formLat} onChangeText={setFormLat}
            placeholder="e.g. 51.5074 N" placeholderTextColor={tc.sub}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[s.gpsIconBtn, { backgroundColor: tc.accentGlow, borderColor: tc.accent }]}
            onPress={getGPSPosition}
            disabled={gpsLoading}
            activeOpacity={0.75}
          >
            <Animated.View style={{ opacity: pulseAnim }}>
              <Ionicons name={gpsLoading ? 'locate' : 'locate-outline'} size={20} color={tc.accent} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>

      <Field label={t('mpc.longitude')} value={formLon} onChange={setFormLon}
        tc={tc} placeholder="e.g. 000.1278 W" keyboardType="default" />

      {/* Статус */}
      <Text style={[s.statusLabel, { color: tc.sub }]}>{t('mpc.twStatus')}</Text>
      <View style={s.statusRow}>
        {(['OUTSIDE', 'INSIDE'] as MPCStatus[]).map(st => (
          <TouchableOpacity
            key={st}
            style={[s.statusBtn, {
              backgroundColor: formStatus === st
                ? (st === 'OUTSIDE' ? tc.outside : tc.inside) : tc.sectionBg,
              borderColor: st === 'OUTSIDE' ? tc.outside : tc.inside,
            }]}
            onPress={() => setFormStatus(st)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={st === 'OUTSIDE' ? 'navigate-outline' : 'location-outline'}
              size={16}
              color={formStatus === st ? '#fff' : (st === 'OUTSIDE' ? tc.outside : tc.inside)}
            />
            <Text style={[s.statusBtnTxt, {
              color: formStatus === st ? '#fff' : (st === 'OUTSIDE' ? tc.outside : tc.inside)
            }]}>{st}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field label={t('mpc.note')} value={formNote} onChange={setFormNote}
        tc={tc} placeholder={t('mpc.notePlaceholder')} autoCapitalize="sentences" />

      <View style={{ height: 20 }} />
    </ScrollView>
  );

  // ─── РЕНДЕР ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <LinearGradient colors={getTC(isDark).bg} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={tc.accent} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={tc.bg} style={s.container}>
      <ImageBackground
        source={GHOST_FLAG_BG}
        style={s.container}
        imageStyle={[s.flagImage, { opacity: isDark ? 0.22 : 0.12 }]}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.scroll, isTablet && s.scrollTablet]}>
            <View style={isTablet ? s.center : undefined}>

              {/* Vessel */}
              <View style={[s.vesselBox, { backgroundColor: tc.sectionBg, borderColor: tc.cardBorder }]}>
                <Ionicons name="boat-outline" size={18} color={tc.accent} />
                <TextInput
                  style={[s.vesselInput, { color: tc.text }]}
                  value={vesselName}
                  onChangeText={handleVesselChange}
                  placeholder={t('mpc.vesselPlaceholder')}
                  placeholderTextColor={tc.sub}
                  autoCapitalize="characters"
                />
              </View>

              {/* Auto-record toggle */}
              <View style={[s.autoRow, { backgroundColor: tc.sectionBg, borderColor: tc.cardBorder }]}>
                <Ionicons
                  name={autoEnabled ? 'radio-outline' : 'radio-outline'}
                  size={18}
                  color={autoEnabled ? tc.accent : tc.sub}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[s.autoTitle, { color: tc.text }]}>{t('mpc.autoTitle')}</Text>
                  <Text style={[s.autoSub, { color: tc.sub }]}>{t('mpc.autoSub')}</Text>
                </View>
                <Switch
                  value={autoEnabled}
                  onValueChange={handleAutoToggle}
                  trackColor={{ false: tc.cardBorder, true: tc.accent + '80' }}
                  thumbColor={autoEnabled ? tc.accent : tc.sub}
                  ios_backgroundColor={tc.cardBorder}
                />
              </View>

              {/* Месячные табы */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.tabsRow}>
                {availableMonths.map(mk => (
                  <TouchableOpacity key={mk}
                    style={[s.tab, {
                      backgroundColor: mk === currentMonthKey ? tc.accent : tc.sectionBg,
                      borderColor:     mk === currentMonthKey ? tc.accent : tc.cardBorder,
                    }]}
                    onPress={() => setSelectedMonth(mk)} activeOpacity={0.8}>
                    <Text style={[s.tabTxt, { color: mk === currentMonthKey ? '#fff' : tc.sub }]}>
                      {monthLabel(mk + '-01')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Счётчики в строку */}
              <View style={[s.counterRow, { backgroundColor: tc.sectionBg, borderColor: tc.cardBorder }]}>
                <Ionicons name="navigate-outline" size={13} color={tc.outside} />
                <Text style={[s.counterTxt, { color: tc.outside }]}>{outsideCount} {t('mpc.outside')}</Text>
                <Text style={[s.counterSep, { color: tc.sub }]}>·</Text>
                <Ionicons name="location-outline" size={13} color={tc.inside} />
                <Text style={[s.counterTxt, { color: tc.inside }]}>{insideCount} {t('mpc.inside')}</Text>
                <Text style={[s.counterSep, { color: tc.sub }]}>·</Text>
                <Text style={[s.counterTxt, { color: tc.sub }]}>{currentRecords.length} {t('mpc.total')}</Text>
              </View>

              {/* Добавить вручную */}
              <TouchableOpacity
                style={[s.addBtn, { borderColor: tc.accent, backgroundColor: tc.accentGlow }]}
                onPress={openAdd} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={22} color={tc.accent} />
                <Text style={[s.addBtnTxt, { color: tc.accent }]}>{t('mpc.addBtn')}</Text>
              </TouchableOpacity>

              {/* Список */}
              {currentRecords.length === 0 ? (
                <View style={s.empty}>
                  <Ionicons name="compass-outline" size={48} color={tc.sub} style={{ opacity: 0.4 }} />
                  <Text style={[s.emptyTxt, { color: tc.sub }]}>{t('mpc.noRecords', { month: monthLabel(currentMonthKey + '-01') })}</Text>
                  <Text style={[s.emptyHint, { color: tc.sub }]}>{t('mpc.noRecordsHint')}</Text>
                </View>
              ) : (
                <>
                  {currentRecords.map(rec => (
                    <TouchableOpacity key={rec.id}
                      style={[s.card, {
                        backgroundColor: tc.cardBg,
                        borderColor: rec.status === 'OUTSIDE'
                          ? 'rgba(61,189,107,0.3)' : 'rgba(255,107,107,0.3)',
                      }]}
                      onPress={() => openEdit(rec)} activeOpacity={0.82}>
                      <View style={s.cardHead}>
                        <Text style={[s.cardDate, { color: tc.text }]}>{displayDate(rec.date)}</Text>
                        <StatusBadge status={rec.status} tc={tc} />
                      </View>
                      <View style={s.coordRow}>
                        <Ionicons name="location-outline" size={13} color={tc.sub} />
                        <Text style={[s.coordTxt, { color: tc.accent }]}>{rec.lat}</Text>
                        <Text style={[s.coordSep, { color: tc.sub }]}>/</Text>
                        <Text style={[s.coordTxt, { color: tc.accent }]}>{rec.lon}</Text>
                      </View>
                      {rec.note ? (
                        <Text style={[s.notePreview, { color: tc.sub }]} numberOfLines={1}>{rec.note}</Text>
                      ) : null}
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={[s.pdfBtn, { backgroundColor: tc.accent }]}
                    onPress={generatePDF} activeOpacity={0.85}>
                    <Ionicons name="document-text-outline" size={18} color="#fff" />
                    <Text style={s.pdfTxt}>{t('mpc.pdfBtn')}</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={{ height: 40 }} />
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* ═══ МОДАЛ: Добавить ═══ */}
        <Modal visible={addModal} animationType="slide" presentationStyle="pageSheet"
          onRequestClose={() => setAddModal(false)}>
          <SafeAreaView style={[s.modal, { backgroundColor: tc.modalBg }]} edges={['top', 'bottom']}>
            <View style={[s.mHead, { borderBottomColor: tc.divider }]}>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <Text style={[s.mCancel, { color: tc.accent }]}>{t('mpc.cancel')}</Text>
              </TouchableOpacity>
              <Text style={[s.mTitle, { color: tc.text }]}>{t('mpc.modalAddTitle')}</Text>
              <TouchableOpacity onPress={saveAdd}>
                <Text style={[s.mSave, { color: tc.accent }]}>{t('mpc.add')}</Text>
              </TouchableOpacity>
            </View>
            {renderForm(false)}
          </SafeAreaView>
        </Modal>

        {/* ═══ МОДАЛ: Редактировать ═══ */}
        <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet"
          onRequestClose={() => setEditModal(false)}>
          <SafeAreaView style={[s.modal, { backgroundColor: tc.modalBg }]} edges={['top', 'bottom']}>
            <View style={[s.mHead, { borderBottomColor: tc.divider }]}>
              <TouchableOpacity onPress={() => { setEditModal(false); setEditId(null); }}>
                <Text style={[s.mCancel, { color: tc.accent }]}>{t('mpc.cancel')}</Text>
              </TouchableOpacity>
              <Text style={[s.mTitle, { color: tc.text }]}>{t('mpc.modalEditTitle')}</Text>
              <TouchableOpacity onPress={saveEdit}>
                <Text style={[s.mSave, { color: tc.accent }]}>{t('mpc.save')}</Text>
              </TouchableOpacity>
            </View>
            <View style={[s.deleteRow, { borderBottomColor: tc.divider }]}>
              <TouchableOpacity
                onPress={() => editId && deleteRecord(editId)}
                style={s.deleteBtn}>
                <Ionicons name="trash-outline" size={15} color="#FF6B6B" />
                <Text style={s.deleteTxt}>{t('mpc.deleteRecord')}</Text>
              </TouchableOpacity>
            </View>
            {renderForm(true)}
          </SafeAreaView>
        </Modal>

        {/* ═══ МОДАЛ: Location Disclosure (Google Play Prominent Disclosure) ═══ */}
        <Modal visible={showLocationDisclosure} animationType="fade" transparent
          onRequestClose={onLocationDisclosureDecline}>
          <View style={s.disclosureOverlay}>
            <View style={[s.disclosureBox, { backgroundColor: tc.modalBg, borderColor: tc.accent }]}>
              <Ionicons name="location-outline" size={36} color={tc.accent} style={{ alignSelf: 'center', marginBottom: 12 }} />
              <Text style={[s.disclosureTitle, { color: tc.text }]}>
                {pendingLocationAction === 'auto' ? t('mpc.disclosureAutoTitle') : t('mpc.disclosureGpsTitle')}
              </Text>
              <Text style={[s.disclosureBody, { color: tc.sub }]}>
                {pendingLocationAction === 'auto' ? t('mpc.disclosureAutoBody') : t('mpc.disclosureGpsBody')}
              </Text>
              <View style={s.disclosureButtons}>
                <TouchableOpacity
                  style={[s.disclosureBtnSecondary, { borderColor: tc.accent }]}
                  onPress={onLocationDisclosureDecline}>
                  <Text style={[s.disclosureBtnSecondaryTxt, { color: tc.accent }]}>{t('mpc.disclosureDecline')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.disclosureBtnPrimary, { backgroundColor: tc.accent }]}
                  onPress={onLocationDisclosureAccept}>
                  <Text style={[s.disclosureBtnPrimaryTxt, { color: isDark ? '#000' : '#fff' }]}>{t('mpc.disclosureAllow')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </ImageBackground>
    </LinearGradient>
  );
};

// ─── Стили ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:    { flex: 1 },
  flagImage:    { resizeMode: 'contain', width: '100%', height: '100%', position: 'absolute', right: 0, bottom: 0 },
  scroll:       { padding: 14, paddingTop: 10 },
  scrollTablet: { alignItems: 'center' },
  center:       { width: '100%', maxWidth: 720 },

  vesselBox:    { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, gap: 10 },
  vesselInput:  { flex: 1, fontSize: 15, fontWeight: '600' },
  autoRow:      { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  autoTitle:    { fontSize: 14, fontWeight: '600' },
  autoSub:      { fontSize: 11, marginTop: 1 },

  tabsRow:      { paddingVertical: 6, paddingBottom: 10, gap: 8 },
  tab:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  tabTxt:       { fontSize: 12, fontWeight: '600' },

  counterRow:   { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 12, gap: 6, flexWrap: 'wrap' },
  counterTxt:   { fontSize: 13, fontWeight: '700' },
  counterSep:   { fontSize: 13, marginHorizontal: 2 },
  gpsIconBtn:   { width: 44, height: 44, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  londonRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16 },
  londonTxt:    { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
  londonSub:    { fontSize: 11, marginLeft: 'auto' as any },

  addBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: 12, padding: 14, gap: 8, marginBottom: 16 },
  addBtnTxt:    { fontSize: 15, fontWeight: '700' },


  card:         { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 9 },
  cardHead:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  cardDate:     { fontSize: 16, fontWeight: '700' },
  coordRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  coordTxt:     { fontSize: 13, fontWeight: '600' },
  coordSep:     { fontSize: 13 },
  notePreview:  { fontSize: 12, marginTop: 5, fontStyle: 'italic' },

  pdfBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 14, gap: 8, marginTop: 10 },
  pdfTxt:       { color: '#fff', fontSize: 14, fontWeight: '700' },

  empty:        { alignItems: 'center', paddingVertical: 56, gap: 8 },
  emptyTxt:     { fontSize: 15 },
  emptyHint:    { fontSize: 13, opacity: 0.7 },

  modal:        { flex: 1 },
  mHead:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  mTitle:       { fontSize: 17, fontWeight: '600' },
  mCancel:      { fontSize: 16 },
  mSave:        { fontSize: 16, fontWeight: '600' },
  deleteRow:    { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, alignItems: 'flex-end' },
  deleteBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deleteTxt:    { color: '#FF6B6B', fontSize: 14 },

  formScroll:   { padding: 20 },

  statusLabel:  { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  statusRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statusBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 2, borderRadius: 10, padding: 12 },
  statusBtnTxt: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  editDateRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  editDateTxt:  { fontSize: 17, fontWeight: '700' },

  // ── Location Disclosure Modal ────────────────────────────────────────────────
  disclosureOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  disclosureBox:           { width: '100%', maxWidth: 400, borderRadius: 20, borderWidth: 1.5, padding: 28 },
  disclosureTitle:         { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 14 },
  disclosureBody:          { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 24 },
  disclosureButtons:       { flexDirection: 'row', gap: 12 },
  disclosureBtnPrimary:    { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  disclosureBtnPrimaryTxt: { fontSize: 15, fontWeight: '700' },
  disclosureBtnSecondary:  { flex: 1, borderRadius: 12, borderWidth: 1.5, paddingVertical: 14, alignItems: 'center' },
  disclosureBtnSecondaryTxt: { fontSize: 15, fontWeight: '600' },
});

export default MPCScreen;