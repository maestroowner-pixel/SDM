// screens/DPScreen.tsx
import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useTablet } from '../hooks/useTablet';
import { useData } from '../contexts/DataContext';
import type { DPScreenInfo, DPDayRecord, DPSlotValue } from '../contexts/DataContext';
import SimpleDatePicker from '../components/SimpleDatePicker';
import { t } from '../utils/i18n';

const GHOST_DIVER_BG = require('../assets/images/ghost-diver.png');

// ─── Алиасы типов из DataContext ─────────────────────────────────────────────
type SlotValue = DPSlotValue;
type DPDay = DPDayRecord;

// ─── Хелперы ─────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function createEmptyDay(date: string): DPDay {
  return { id: date, date, slots: Array(48).fill(0) as SlotValue[] };
}

function calcHours(slots: SlotValue[], type: 1 | 2 | 'all'): number {
  return slots.filter(s => type === 'all' ? s > 0 : s === type).length * 0.5;
}

// Валидный день — ≥ 2h суммарно
function isValid(slots: SlotValue[]): boolean {
  return calcHours(slots, 'all') >= 2;
}

// dd/mm/yyyy из yyyy-mm-dd или mm/dd/yyyy
function displayDate(iso: string): string {
  if (!iso) return '';
  // Уже dd/mm/yyyy (первые 2 символа — день)
  if (iso.includes('/') && iso.indexOf('/') === 2) return iso;
  // Формат mm/dd/yyyy
  if (iso.includes('/')) {
    const [mm, dd, yyyy] = iso.split('/');
    if (mm && dd && yyyy) return `${dd}/${mm}/${yyyy}`;
    return iso;
  }
  // Формат yyyy-mm-dd
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

// ─── Цвета ───────────────────────────────────────────────────────────────────

const getTC = (isDark: boolean) => ({
  bg: (isDark
    ? ['#0a1628', '#1a2a4a', '#0d1a2d']
    : ['#F0F7FF', '#E1EFFD', '#D0E7FC']) as [string, string, string],
  sectionBg:   isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.78)',
  text:         isDark ? '#ffffff' : '#1a2a4a',
  sub:          isDark ? 'rgba(255,255,255,0.55)' : '#556B8D',
  accent:       isDark ? '#00BFFF' : '#007AFF',
  accentGlow:   isDark ? 'rgba(0,191,255,0.18)' : 'rgba(0,119,255,0.12)',
  cellEmpty:    isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,33,71,0.07)',
  cellA:        isDark ? '#00BFFF' : '#007AFF',    // голубой — Active
  cellP:        '#c8964a',                           // янтарный — Passive
  cellBorder:   isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,33,71,0.13)',
  cardBg:       isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.88)',
  cardBorder:   isDark ? 'rgba(0,191,255,0.22)' : 'rgba(0,119,255,0.2)',
  hourBg:       isDark ? 'rgba(0,191,255,0.14)' : 'rgba(0,119,255,0.1)',
  inputBg:      isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
  inputBorder:  isDark ? 'rgba(255,255,255,0.15)' : '#d0d8e8',
  inputText:    isDark ? '#ffffff' : '#1a2a4a',
  modalBg:      isDark ? '#0a1628' : '#f0f4f8',
  divider:      isDark ? 'rgba(255,255,255,0.1)' : '#dde3ed',
  validGreen:   '#3dbd6b',
  invalidRed:   '#FF6B6B',
});

// ─── DayGrid — сердце экрана ─────────────────────────────────────────────────
// 4 колонки × 6 часов по вертикали
// Каждый час = метка (0000…2300) + 2 ячейки (:00 и :30)

interface DayGridProps {
  day: DPDay;
  tc: ReturnType<typeof getTC>;
  onToggle: (i: number) => void;
}

const DayGrid = React.memo(({ day, tc, onToggle }: DayGridProps) => {
  // 4 колонки: 00-05 | 06-11 | 12-17 | 18-23
  const COLS: number[][] = [
    [0, 1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10, 11],
    [12, 13, 14, 15, 16, 17],
    [18, 19, 20, 21, 22, 23],
  ];

  const cellColor = (v: SlotValue) =>
    v === 1 ? tc.cellA : v === 2 ? tc.cellP : tc.cellEmpty;

  return (
    <View style={g.wrapper}>
      {COLS.map((hours, ci) => (
        <View key={ci} style={g.col}>
          {hours.map(h => {
            const iA = h * 2;      // :00
            const iB = h * 2 + 1;  // :30
            const vA = day.slots[iA];
            const vB = day.slots[iB];
            const label = `${String(h).padStart(2, '0')}00`;

            return (
              <View key={h} style={g.hourBlock}>
                {/* Метка часа */}
                <View style={[g.hourLabel, { backgroundColor: tc.hourBg }]}>
                  <Text style={[g.hourLabelTxt, { color: tc.accent }]}>{label}</Text>
                </View>

                {/* Ячейки :00 и :30 */}
                <View style={g.slotPair}>
                  <TouchableOpacity
                    style={[g.slot, { backgroundColor: cellColor(vA), borderColor: tc.cellBorder }]}
                    onPress={() => onToggle(iA)}
                    activeOpacity={0.65}
                  >
                    {vA > 0 && <Text style={g.slotTxt}>{vA === 1 ? 'A' : 'P'}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[g.slot, { backgroundColor: cellColor(vB), borderColor: tc.cellBorder }]}
                    onPress={() => onToggle(iB)}
                    activeOpacity={0.65}
                  >
                    {vB > 0 && <Text style={g.slotTxt}>{vB === 1 ? 'A' : 'P'}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
});

// ─── Поле ввода для формы DPO ─────────────────────────────────────────────────

const InfoField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  tc: ReturnType<typeof getTC>;
  multiline?: boolean;
}> = ({ label, value, onChange, tc, multiline }) => (
  <View style={f.group}>
    <Text style={[f.label, { color: tc.sub }]}>{label}</Text>
    <TextInput
      style={[f.input, {
        backgroundColor: tc.inputBg,
        borderColor: tc.inputBorder,
        color: tc.inputText,
        height: multiline ? 72 : 42,
      }]}
      value={value}
      onChangeText={onChange}
      multiline={multiline}
      placeholderTextColor={tc.sub}
    />
  </View>
);

// ─── Главный компонент ────────────────────────────────────────────────────────

const DPScreen: React.FC = () => {
  const isTablet = useTablet();
  const { state, updateDPInfo, updateDPDays } = useData();
  const isDark = state.theme === 'dark';
  const tc = getTC(isDark);

  // Данные из контекста (персистентные)
  const info = state.dpInfo;
  const days = state.dpDays;

  const setInfo = (updater: DPScreenInfo | ((prev: DPScreenInfo) => DPScreenInfo)) => {
    const next = typeof updater === 'function' ? updater(info) : updater;
    updateDPInfo(next);
  };

  const setDays = (updater: DPDay[] | ((prev: DPDay[]) => DPDay[])) => {
    const next = typeof updater === 'function' ? updater(days) : updater;
    updateDPDays(next);
  };

  // Данные личной карточки из PersonalScreen (state.personal)
  const personalFullName = [state.personal.firstName, state.personal.lastName].filter(Boolean).join(' ');
  const personalDOB      = state.personal.birthDate || '';
  const personalRank     = state.personal.appliedPosition === 'Other'
    ? (state.personal.customPosition || '')
    : (state.personal.appliedPosition || '');

  // Модалы
  const [infoModal, setInfoModal] = useState(false);
  const [addModal, setAddModal]   = useState(false);
  const [editModal, setEditModal] = useState(false);

  const [newDate, setNewDate]       = useState(todayStr());
  const [editDayId, setEditDayId]   = useState<string | null>(null);
  // editDay — дериватив от days, всегда актуален, нет рассинхронизации
  const editDay = editDayId ? (days.find(d => d.id === editDayId) ?? null) : null;

  // ── Добавить день ──────────────────────────────────────────────────────────

  const addDay = () => {
    if (days.find(d => d.date === newDate)) {
      Alert.alert('Error', 'This date already exists in the log');
      return;
    }
    setDays(prev =>
      [...prev, createEmptyDay(newDate)].sort((a, b) => a.date.localeCompare(b.date))
    );
    setAddModal(false);
  };

  // ── Переключить слот: 0 → A(1) → P(2) → 0 ────────────────────────────────

  const toggleSlot = useCallback((dayId: string, i: number) => {
    const cycle = (v: SlotValue): SlotValue => (((v + 1) % 3) as SlotValue);

    updateDPDays(state.dpDays.map(d => {
      if (d.id !== dayId) return d;
      const slots = [...d.slots] as SlotValue[];
      slots[i] = cycle(slots[i]);
      return { ...d, slots };
    }));
  }, [state.dpDays, updateDPDays]);

  // ── Удалить день ───────────────────────────────────────────────────────────

  const deleteDay = (id: string) => {
    Alert.alert('Delete Day', 'Remove this day from the log?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setDays(p => p.filter(d => d.id !== id));
        setEditModal(false);
        setEditDayId(null);
      }},
    ]);
  };

  // ── Итоги ──────────────────────────────────────────────────────────────────

  const totalValid   = days.filter(d => isValid(d.slots)).length;
  const totalActive  = days.reduce((s, d) => s + calcHours(d.slots, 1), 0);
  const totalPassive = days.reduce((s, d) => s + calcHours(d.slots, 2), 0);

  // ── PDF генерация ──────────────────────────────────────────────────────────

  const generatePDF = async (scheme: 'new' | 'old') => {
    const fullName = personalFullName || info.fullName;
    const dob      = personalDOB || info.dob;
    const rank     = personalRank || info.rank;

    if (!fullName || !info.vesselName) {
      Alert.alert('Missing Info', 'Please fill in DPO information first');
      return;
    }
    const validDays = days.filter(d => isValid(d.slots));
    if (validDays.length === 0) {
      Alert.alert('No Data', 'No valid DP days to include in the letter');
      return;
    }

    const today = displayDate(todayStr());
    const activeDates  = days.filter(d => calcHours(d.slots, 1) > 0).map(d => displayDate(d.date)).join(', ');
    const passiveDates = days.filter(d => calcHours(d.slots, 2) > 0 && calcHours(d.slots, 1) === 0).map(d => displayDate(d.date)).join(', ');

    const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  @page { size: A4; margin: 15mm 20mm; }
  body { font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.35; color: #000; margin: 0; }

  /* ── Отступ под фирменный бланк ── */
  .letterhead-space { height: 35mm; }

  p { margin: 4px 0; font-size: 9pt; line-height: 1.35; }

  /* ── Таблица ── */
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 8pt; }
  th { background: #002147; color: #fff; padding: 4px 6px; text-align: left; font-size: 7.5pt; }
  td { border: 1px solid #bbb; padding: 3px 6px; }
  tr:nth-child(even) td { background: #f5f7fa; }

  /* ── Подпись ── */
  .sig { margin-top: 18px; font-size: 9pt; }
  .sig-line { border-top: 1px solid #555; width: 180px; margin: 18px 0 3px; }

  .note { font-size: 7.5pt; color: #555; margin-top: 5px; font-style: italic; }
  h2 { font-size: 10pt; margin: 8px 0 2px; }
</style></head><body>

<!-- ОТСТУП ПОД ФИРМЕННЫЙ БЛАНК -->
<div class="letterhead-space"></div>

<p>DP Department<br>The Nautical Institute<br>202 Lambeth Road<br>LONDON SE1 7LQ<br>United Kingdom</p>
<p style="text-align:right">${today}</p>

<h2>Application for the Revalidation of a DP Certificate – Offshore ${scheme === 'old' ? 'Old' : 'New'} Scheme</h2>
<p style="font-size:7.5pt;color:#555;font-style:italic">(${scheme === 'old'
  ? 'Holders of the original blue/green/black/NI Revalidation logbook issued before 1st January 2015'
  : 'Holders of the grey/NI Revalidation logbook issued after 1st January 2015'})</p>

<p>We hereby certify that <b>${fullName}</b> (DOB: ${displayDate(dob)}) is employed by <b>${info.company}</b> as a <b>${rank} / DPO</b> on board our vessels.</p>
<p>We have checked his/her DP sea time against our records and verify that the entries below meet with the minimum requirements of the DP Offshore ${scheme === 'old' ? 'Old' : 'New'} Scheme; that for each day confirmed as a day on DP, the applicant has performed as a DPO/TDPO for a minimum of 2 hours per day.</p>

${scheme === 'old' ? `
<p><b>NOTES FOR REVALIDATION:</b><br>
Confirmed DP time dated before 01/01/2015 – minimum 1 hour per day<br>
Confirmed DP time dated after 01/01/2015 – minimum 2 hours per day</p>` : ''}

<!-- ТАБЛИЦА -->
<table>
  <thead><tr>
    <th>Vessel Name</th><th>GRT</th><th>IMO No.</th><th>DP Class</th>
    <th>From</th><th>To</th><th>Days on DP</th><th>Rank</th>
  </tr></thead>
  <tbody>
    <tr>
      <td>${info.vesselName}</td><td>${info.grt}</td><td>${info.imo}</td><td>${info.dpClass}</td>
      <td>${displayDate(info.contractStart)}</td><td>${displayDate(info.contractEnd)}</td>
      <td>${validDays.length}</td><td>${rank}</td>
    </tr>
    ${scheme === 'new' ? `
    <tr><td><b>Active Dates on DP</b></td><td colspan="7" style="font-size:7.5pt">${activeDates || '—'}</td></tr>
    <tr><td><b>Passive Dates on DP</b></td><td colspan="7" style="font-size:7.5pt">${passiveDates || '—'}</td></tr>
    ` : ''}
  </tbody>
</table>

${scheme === 'new' ? '<p class="note"><b>NOTE:</b> For revalidation applications, only active DP time can be counted.</p>' : ''}

<p>This letter is provided in support of his/her application for a DP certificate.</p>

<div class="sig">
  <p>Yours faithfully,<br>${info.company}</p>
  <div class="sig-line"></div>
  <p><b>${info.signatoryName}</b><br>${info.signatoryRank}<br>${info.companyContacts}</p>
</div>

</body></html>`;

    try {
      const surname = state.personal.lastName || info.fullName.split(' ').pop() || 'Unknown';
      const position = personalRank || info.rank || 'DPO';
      const safeRank = position.replace(/[\s/]+/g, '_');
      const safeSurname = surname.replace(/[\s/]+/g, '_');
      const genDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const fileName = `Confirmation_letter_${safeRank}_${safeSurname}_${genDate}.pdf`;
      const { uri } = await Print.printToFileAsync({ html });
      const destUri = uri.substring(0, uri.lastIndexOf('/') + 1) + fileName;
      await FileSystem.deleteAsync(destUri, { idempotent: true });
      await FileSystem.moveAsync({ from: uri, to: destUri });
      await Sharing.shareAsync(destUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } catch (e) {
      Alert.alert('Error', 'Could not generate PDF');
    }
  };

  // ─── РЕНДЕР ──────────────────────────────────────────────────────────────

  return (
    <LinearGradient colors={tc.bg} style={s.container}>
      <ImageBackground
        source={GHOST_DIVER_BG}
        style={s.container}
        imageStyle={[s.diverImage, { opacity: isDark ? 0.15 : 0.08, tintColor: isDark ? '#64b5f6' : '#2B7CC1' }]}
      >

      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, isTablet && s.scrollTablet]}>
          <View style={isTablet ? s.center : undefined}>

            {/* ── Кнопка: информация ── */}
            <TouchableOpacity
              style={[s.infoBtn, { backgroundColor: tc.sectionBg, borderColor: tc.cardBorder }]}
              onPress={() => setInfoModal(true)}
              activeOpacity={0.82}
            >
              <Ionicons name="person-circle-outline" size={22} color={tc.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[s.infoBtnTitle, { color: tc.text }]}>
                  {personalFullName || info.fullName || 'Enter DPO Information'}
                </Text>
                {(personalFullName || info.fullName) ? (
                  <Text style={[s.infoBtnSub, { color: tc.sub }]}>
                    {personalRank || info.rank}
                    {info.vesselName ? ` · ${info.vesselName}` : ''}
                    {info.dpClass ? ` · DP Class ${info.dpClass}` : ''}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={tc.sub} />
            </TouchableOpacity>

            {/* ── Статистика ── */}
            <View style={[s.statsRow, { backgroundColor: tc.sectionBg }]}>
              <View style={s.statItem}>
                <Text style={[s.statVal, { color: tc.accent }]}>{totalValid}</Text>
                <Text style={[s.statLbl, { color: tc.sub }]}>Valid Days</Text>
              </View>
              <View style={[s.statDiv, { backgroundColor: tc.cellBorder }]} />
              <View style={s.statItem}>
                <Text style={[s.statVal, { color: tc.cellA }]}>{totalActive.toFixed(1)}h</Text>
                <Text style={[s.statLbl, { color: tc.sub }]}>Active</Text>
              </View>
              <View style={[s.statDiv, { backgroundColor: tc.cellBorder }]} />
              <View style={s.statItem}>
                <Text style={[s.statVal, { color: tc.cellP }]}>{totalPassive.toFixed(1)}h</Text>
                <Text style={[s.statLbl, { color: tc.sub }]}>Passive</Text>
              </View>
              <View style={[s.statDiv, { backgroundColor: tc.cellBorder }]} />
              <View style={s.statItem}>
                <Text style={[s.statVal, { color: tc.text }]}>{(totalActive + totalPassive).toFixed(1)}h</Text>
                <Text style={[s.statLbl, { color: tc.sub }]}>Total</Text>
              </View>
            </View>

            {/* ── Кнопка добавить день ── */}
            <TouchableOpacity
              style={[s.addBtn, { borderColor: tc.accent, backgroundColor: tc.accentGlow }]}
              onPress={() => { setNewDate(todayStr()); setAddModal(true); }}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={24} color={tc.accent} />
              <Text style={[s.addBtnTxt, { color: tc.accent }]}>Add DP Day</Text>
            </TouchableOpacity>

            {/* ── Список дней ── */}
            {days.length === 0 ? (
              <View style={s.empty}>
                <Text style={[s.emptyTxt, { color: tc.sub }]}>No DP days added yet</Text>
                <Text style={[s.emptyHint, { color: tc.sub }]}>Tap "Add DP Day" to start</Text>
              </View>
            ) : (
              <>
                {days.map(day => {
                  const a   = calcHours(day.slots, 1);
                  const p   = calcHours(day.slots, 2);
                  const tot = a + p;
                  const valid = isValid(day.slots);
                  return (
                    <TouchableOpacity key={day.id}
                      style={[s.card, {
                        backgroundColor: tc.cardBg,
                        borderColor: valid ? tc.cardBorder : 'rgba(255,107,107,0.35)',
                      }]}
                      onPress={() => { setEditDayId(day.id); setEditModal(true); }}
                      activeOpacity={0.82}
                    >
                      <View style={s.cardHead}>
                        <Text style={[s.cardDate, { color: tc.text }]}>{displayDate(day.date)}</Text>
                        <View style={[s.badge, { backgroundColor: valid ? tc.validGreen : tc.invalidRed }]}>
                          <Text style={s.badgeTxt}>{valid ? `${tot.toFixed(1)}h ✓` : `${tot.toFixed(1)}h`}</Text>
                        </View>
                      </View>
                      <View style={s.cardStats}>
                        <Text style={[s.cardStat, { color: tc.cellA }]}>A: {a.toFixed(1)}h</Text>
                        <Text style={[s.cardStat, { color: tc.cellP }]}>P: {p.toFixed(1)}h</Text>
                        <Text style={[s.cardStat, { color: tc.sub }]}>Total: {tot.toFixed(1)}h</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* ── PDF кнопки ── */}
                <View style={s.pdfRow}>
                  <TouchableOpacity
                    style={[s.pdfBtn, { backgroundColor: tc.accent }]}
                    onPress={() => generatePDF('new')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#fff" />
                    <Text style={s.pdfTxt}>New Scheme Letter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.pdfBtn, { backgroundColor: isDark ? '#556B8D' : '#4a6a9a' }]}
                    onPress={() => generatePDF('old')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="document-outline" size={18} color="#fff" />
                    <Text style={s.pdfTxt}>Old Scheme Letter</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ═══════════════════════════════════════════
          МОДАЛ: Добавить день
      ═══════════════════════════════════════════ */}
      <Modal visible={addModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => setAddModal(false)}>
        <SafeAreaView style={[s.modal, { backgroundColor: tc.modalBg }]} edges={['top', 'bottom']}>
          <View style={[s.mHead, { borderBottomColor: tc.divider }]}>
            <TouchableOpacity onPress={() => setAddModal(false)}>
              <Text style={[s.mCancel, { color: tc.accent }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[s.mTitle, { color: tc.text }]}>Add DP Day</Text>
            <TouchableOpacity onPress={addDay}>
              <Text style={[s.mSave, { color: tc.accent }]}>Add</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <SimpleDatePicker label="Select Date" value={newDate} onChange={setNewDate} isDark={isDark} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ═══════════════════════════════════════════
          МОДАЛ: Редактирование дня — СЕТКА ЧАСОВ
      ═══════════════════════════════════════════ */}
      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => setEditModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0a1628' : '#eef2f8' }} edges={['top', 'bottom']}>
          <LinearGradient
            colors={isDark ? ['#0a1628', '#1a2a4a', '#0d1a2d'] : ['#eef2f8', '#e4eaf4', '#d8e0ee']}
            style={{ flex: 1 }}
          >
            {/* Заголовок */}
            <View style={[s.mHead, { borderBottomColor: tc.divider }]}>
              <TouchableOpacity onPress={() => { setEditModal(false); setEditDayId(null); }}>
                <Text style={[s.mCancel, { color: tc.accent }]}>Done</Text>
              </TouchableOpacity>
              <Text style={[s.mTitle, { color: tc.text }]}>
                {editDay ? displayDate(editDay.date) : ''}
              </Text>
              <TouchableOpacity onPress={() => editDay && deleteDay(editDay.id)}>
                <Ionicons name="trash-outline" size={22} color={tc.invalidRed} />
              </TouchableOpacity>
            </View>

            {editDay && (() => {
              const a   = calcHours(editDay.slots, 1);
              const p   = calcHours(editDay.slots, 2);
              const tot = a + p;
              const valid = isValid(editDay.slots);

              return (
                <>
                  {/* Статус дня */}
                  <View style={[s.dayBar, { backgroundColor: tc.accentGlow }]}>
                    <View style={[s.badge, { backgroundColor: valid ? tc.validGreen : tc.invalidRed }]}>
                      <Text style={s.badgeTxt}>{valid ? '✓ Valid' : '✗ Min 2h'}</Text>
                    </View>
                    <Text style={[s.dayChip, { color: tc.cellA }]}>A: {a.toFixed(1)}h</Text>
                    <Text style={[s.dayChip, { color: tc.cellP }]}>P: {p.toFixed(1)}h</Text>
                    <Text style={[s.dayChip, { color: tc.text }]}>Total: {tot.toFixed(1)}h</Text>
                  </View>

                  {/* Легенда */}
                  <View style={[s.legend, { backgroundColor: tc.sectionBg }]}>
                    <View style={s.legItem}>
                      <View style={[s.legDot, { backgroundColor: tc.cellEmpty, borderWidth: 1, borderColor: tc.cellBorder }]} />
                      <Text style={[s.legTxt, { color: tc.sub }]}>Empty</Text>
                    </View>
                    <View style={s.legItem}>
                      <View style={[s.legDot, { backgroundColor: tc.cellA }]} />
                      <Text style={[s.legTxt, { color: tc.sub }]}>Active (A)</Text>
                    </View>
                    <View style={s.legItem}>
                      <View style={[s.legDot, { backgroundColor: tc.cellP }]} />
                      <Text style={[s.legTxt, { color: tc.sub }]}>Passive (P)</Text>
                    </View>
                    <Text style={[s.legHint, { color: tc.sub }]}>Tap to cycle →</Text>
                  </View>

                  {/* СЕТКА */}
                  <ScrollView contentContainerStyle={s.gridPad} showsVerticalScrollIndicator={false}>
                    <DayGrid
                      day={editDay}
                      tc={tc}
                      onToggle={i => toggleSlot(editDay.id, i)}
                    />
                  </ScrollView>
                </>
              );
            })()}
          </LinearGradient>
        </SafeAreaView>
      </Modal>

      {/* ═══════════════════════════════════════════
          МОДАЛ: Информация DPO
      ═══════════════════════════════════════════ */}
      <Modal visible={infoModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => setInfoModal(false)}>
        <SafeAreaView style={[s.modal, { backgroundColor: tc.modalBg }]} edges={['top', 'bottom']}>
          <View style={[s.mHead, { borderBottomColor: tc.divider }]}>
            <TouchableOpacity onPress={() => setInfoModal(false)}>
              <Text style={[s.mCancel, { color: tc.accent }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[s.mTitle, { color: tc.text }]}>DPO Information</Text>
            <TouchableOpacity onPress={() => setInfoModal(false)}>
              <Text style={[s.mSave, { color: tc.accent }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.infoScroll}>
            {/* Персональные данные — из PersonalScreen */}
            <Text style={[s.sectionLabel, { color: tc.accent }]}>Personal</Text>
            <View style={[s.infoBlock, { backgroundColor: tc.sectionBg }]}>
              {personalFullName || personalDOB || personalRank ? (
                <>
                  <View style={s.readRow}>
                    <Ionicons name="person-outline" size={16} color={tc.sub} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.readLabel, { color: tc.sub }]}>Full Name</Text>
                      <Text style={[s.readValue, { color: tc.text }]}>{personalFullName || '—'}</Text>
                    </View>
                  </View>
                  <View style={s.readRow}>
                    <Ionicons name="calendar-outline" size={16} color={tc.sub} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.readLabel, { color: tc.sub }]}>Date of Birth</Text>
                      <Text style={[s.readValue, { color: tc.text }]}>{displayDate(personalDOB) || '—'}</Text>
                    </View>
                  </View>
                  <View style={s.readRow}>
                    <Ionicons name="briefcase-outline" size={16} color={tc.sub} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.readLabel, { color: tc.sub }]}>DPO Rank</Text>
                      <Text style={[s.readValue, { color: tc.text }]}>{personalRank || '—'}</Text>
                    </View>
                  </View>
                  <Text style={[s.readHint, { color: tc.sub }]}>
                    <Ionicons name="link-outline" size={11} /> Synced from Personal screen
                  </Text>
                </>
              ) : (
                <View style={s.readRow}>
                  <Ionicons name="alert-circle-outline" size={16} color={tc.invalidRed} />
                  <Text style={[s.readHint, { color: tc.invalidRed }]}>
                    Fill in Full Name, Date of Birth and Position in the Personal screen
                  </Text>
                </View>
              )}
            </View>

            {/* Судно */}
            <Text style={[s.sectionLabel, { color: tc.accent }]}>Vessel & Company</Text>
            <View style={[s.infoBlock, { backgroundColor: tc.sectionBg }]}>
              <InfoField label="Company Name" value={info.company}
                onChange={v => setInfo(p => ({ ...p, company: v }))} tc={tc} />
              <InfoField label="Vessel Name" value={info.vesselName}
                onChange={v => setInfo(p => ({ ...p, vesselName: v }))} tc={tc} />
              <View style={s.twoCol}>
                <View style={{ flex: 1 }}>
                  <InfoField label="GRT" value={info.grt}
                    onChange={v => setInfo(p => ({ ...p, grt: v }))} tc={tc} />
                </View>
                <View style={{ flex: 1 }}>
                  <InfoField label="IMO No." value={info.imo}
                    onChange={v => setInfo(p => ({ ...p, imo: v }))} tc={tc} />
                </View>
              </View>
              <InfoField label="DP Class" value={info.dpClass}
                onChange={v => setInfo(p => ({ ...p, dpClass: v }))} tc={tc} />
            </View>

            {/* Контракт */}
            <Text style={[s.sectionLabel, { color: tc.accent }]}>Contract Period</Text>
            <View style={[s.infoBlock, { backgroundColor: tc.sectionBg }]}>
              <SimpleDatePicker label="Contract Start" value={info.contractStart || todayStr()}
                onChange={v => setInfo(p => ({ ...p, contractStart: v }))} isDark={isDark} />
              <SimpleDatePicker label="Contract End" value={info.contractEnd || todayStr()}
                onChange={v => setInfo(p => ({ ...p, contractEnd: v }))} isDark={isDark} />
            </View>

            {/* Подписант */}
            <Text style={[s.sectionLabel, { color: tc.accent }]}>Signatory</Text>
            <View style={[s.infoBlock, { backgroundColor: tc.sectionBg }]}>
              <InfoField label="Signatory Name" value={info.signatoryName}
                onChange={v => setInfo(p => ({ ...p, signatoryName: v }))} tc={tc} />
              <InfoField label="Signatory Rank" value={info.signatoryRank}
                onChange={v => setInfo(p => ({ ...p, signatoryRank: v }))} tc={tc} />
              <InfoField label="Company Contact Details" value={info.companyContacts}
                onChange={v => setInfo(p => ({ ...p, companyContacts: v }))} tc={tc} multiline />
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      </ImageBackground>
    </LinearGradient>
  );
};

// ─── Стили главного экрана ────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  diverImage: {
    resizeMode: 'contain',
    width: '100%',
    height: '-120%',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  scroll: { padding: 14, paddingTop: 10 },
  scrollTablet: { alignItems: 'center' },
  center: { width: '100%', maxWidth: 720 },

  // Инфо-кнопка
  infoBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 10 },
  infoBtnTitle: { fontSize: 15, fontWeight: '600' },
  infoBtnSub: { fontSize: 12, marginTop: 2 },

  // Статистика
  statsRow: { flexDirection: 'row', borderRadius: 14, padding: 14, marginBottom: 12, alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statDiv: { width: 1, height: 34 },
  statVal: { fontSize: 22, fontWeight: '700' },
  statLbl: { fontSize: 11, marginTop: 2 },

  // Добавить день
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: 12, padding: 14, gap: 8, marginBottom: 16 },
  addBtnTxt: { fontSize: 16, fontWeight: '700' },

  // Карточка
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 9 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  cardDate: { fontSize: 17, fontWeight: '700' },
  cardStats: { flexDirection: 'row', gap: 14 },
  cardStat: { fontSize: 13, fontWeight: '500' },

  // Badge
  badge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Пусто
  empty: { alignItems: 'center', paddingVertical: 56 },
  emptyTxt: { fontSize: 15, marginTop: 14 },
  emptyHint: { fontSize: 13, marginTop: 6, opacity: 0.7 },

  // PDF кнопки
  pdfRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  pdfBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 14, gap: 7 },
  pdfTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Модал
  modal: { flex: 1 },
  mHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  mTitle: { fontSize: 17, fontWeight: '600' },
  mCancel: { fontSize: 16 },
  mSave: { fontSize: 16, fontWeight: '600' },

  // Внутри редактирования дня
  dayBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 12, flexWrap: 'wrap' },
  dayChip: { fontSize: 14, fontWeight: '600' },

  legend: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 10, flexWrap: 'wrap' },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legDot: { width: 14, height: 14, borderRadius: 3 },
  legTxt: { fontSize: 12 },
  legHint: { fontSize: 11, marginLeft: 'auto' as any },

  gridPad: { padding: 10 },

  // Информация DPO
  infoScroll: { padding: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 6 },
  infoBlock: { borderRadius: 14, padding: 14, marginBottom: 16, gap: 4 },
  twoCol: { flexDirection: 'row', gap: 10 },

  // Read-only строки (данные из PersonalScreen)
  readRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7 },
  readLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  readValue: { fontSize: 15, fontWeight: '500' },
  readHint: { fontSize: 11, marginTop: 6, fontStyle: 'italic' },
});

// ─── Стили сетки ─────────────────────────────────────────────────────────────

const g = StyleSheet.create({
  wrapper: { flexDirection: 'row', gap: 5 },

  // Одна колонка (6 часов)
  col: { flex: 1 },

  // Блок одного часа: метка + 2 слота
  hourBlock: { marginBottom: 4 },

  // Метка "0000", "0100"...
  hourLabel: { borderRadius: 5, paddingVertical: 3, alignItems: 'center', marginBottom: 2 },
  hourLabelTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // Пара слотов :00 и :30 рядом
  slotPair: { flexDirection: 'row', gap: 2 },

  // Один слот 30 мин
  slot: { flex: 1, height: 36, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  slotTxt: { color: '#fff', fontSize: 12, fontWeight: '900' },
});

// ─── Стили полей ввода ───────────────────────────────────────────────────────

const f = StyleSheet.create({
  group: { marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, textAlignVertical: 'top' },
});

export default DPScreen;