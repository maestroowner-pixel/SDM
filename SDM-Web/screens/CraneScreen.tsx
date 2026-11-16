// screens/CraneScreen.tsx
// Crane operator hours log, built like the DP log: one day = 48 half-hour slots,
// tap a slot to mark crane operation. The printed log (header + hours per day +
// total) is for the company to sign, as proof of crane hours for certificates
// and the next employer.
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { printHtml } from '../utils/webPrint';
import { alertMsg, confirmAsync } from '../utils/webAlert';
import { useTablet } from '../hooks/useTablet';
import { useData } from '../contexts/DataContext';
import type { CraneLogInfo, DPDayRecord, DPSlotValue } from '../contexts/DataContext';
import SimpleDatePicker from '../components/SimpleDatePicker';
import { OptionWithOtherInput, CRANE_TYPES } from '../components/OptionWithOtherInput';
import { t } from '../utils/i18n';

const CRANE_HOOK_BG = require('../assets/images/ghost-crane-hook.png');

type Day = DPDayRecord;

// ─── Хелперы ─────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function createEmptyDay(date: string): Day {
  return { id: date, date, slots: Array(48).fill(0) as DPSlotValue[] };
}

function calcHours(slots: DPSlotValue[]): number {
  return slots.filter(s => s > 0).length * 0.5;
}

// dd/mm/yyyy из yyyy-mm-dd
function displayDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

// Marked slots as time ranges: «06:00–10:30, 13:00–15:00».
function periods(slots: DPSlotValue[]): string {
  const hhmm = (i: number) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
  const out: string[] = [];
  let start = -1;
  for (let i = 0; i <= slots.length; i++) {
    const on = i < slots.length && slots[i] > 0;
    if (on && start < 0) start = i;
    if (!on && start >= 0) { out.push(`${hhmm(start)}–${i === 48 ? '24:00' : hhmm(i)}`); start = -1; }
  }
  return out.join(', ');
}

const esc = (v: any): string => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Bare number → «250 t».
const swlText = (v: string): string => {
  const s = String(v || '').trim();
  return /^[\d\s.,]+$/.test(s) ? `${s} t` : s;
};

// ─── Цвета ───────────────────────────────────────────────────────────────────

const getTC = (isDark: boolean) => ({
  bg: (isDark
    ? ['#0a1628', '#1a2a4a', '#0d1a2d']
    : ['#F0F7FF', '#E1EFFD', '#D0E7FC']) as [string, string, string],
  sectionBg:   isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.78)',
  text:         isDark ? '#ffffff' : '#1a2a4a',
  sub:          isDark ? 'rgba(255,255,255,0.55)' : '#556B8D',
  accent:       isDark ? '#FFB300' : '#E08E00',
  accentGlow:   isDark ? 'rgba(255,179,0,0.16)' : 'rgba(224,142,0,0.12)',
  cellEmpty:    isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,33,71,0.07)',
  cellOn:       isDark ? '#FFB300' : '#E08E00',     // работа на кране
  cellBorder:   isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,33,71,0.13)',
  cardBg:       isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.88)',
  cardBorder:   isDark ? 'rgba(255,179,0,0.25)' : 'rgba(224,142,0,0.25)',
  hourBg:       isDark ? 'rgba(255,179,0,0.14)' : 'rgba(224,142,0,0.1)',
  inputBg:      isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
  inputBorder:  isDark ? 'rgba(255,255,255,0.15)' : '#d0d8e8',
  inputText:    isDark ? '#ffffff' : '#1a2a4a',
  modalBg:      isDark ? '#0a1628' : '#f0f4f8',
  divider:      isDark ? 'rgba(255,255,255,0.1)' : '#dde3ed',
  danger:       '#FF6B6B',
});

// ─── DayGrid: 4 колонки × 6 часов, каждый час = метка + :00 и :30 ───────────

interface DayGridProps {
  day: Day;
  tc: ReturnType<typeof getTC>;
  onToggle: (i: number) => void;
}

const DayGrid = React.memo(({ day, tc, onToggle }: DayGridProps) => {
  const COLS: number[][] = [
    [0, 1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10, 11],
    [12, 13, 14, 15, 16, 17],
    [18, 19, 20, 21, 22, 23],
  ];
  const slot = (i: number) => (
    <TouchableOpacity
      style={[g.slot, { backgroundColor: day.slots[i] ? tc.cellOn : tc.cellEmpty, borderColor: tc.cellBorder }]}
      onPress={() => onToggle(i)}
      activeOpacity={0.65}
    >
      {day.slots[i] > 0 && <Text style={g.slotTxt}>C</Text>}
    </TouchableOpacity>
  );
  return (
    <View style={g.wrapper}>
      {COLS.map((hours, ci) => (
        <View key={ci} style={g.col}>
          {hours.map(h => (
            <View key={h} style={g.hourBlock}>
              <View style={[g.hourLabel, { backgroundColor: tc.hourBg }]}>
                <Text style={[g.hourLabelTxt, { color: tc.accent }]}>{`${String(h).padStart(2, '0')}00`}</Text>
              </View>
              <View style={g.slotPair}>
                {slot(h * 2)}
                {slot(h * 2 + 1)}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
});

// ─── Поле ввода ──────────────────────────────────────────────────────────────

const InfoField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  tc: ReturnType<typeof getTC>;
  multiline?: boolean;
  placeholder?: string;
}> = ({ label, value, onChange, tc, multiline, placeholder }) => (
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
      placeholder={placeholder}
      placeholderTextColor={tc.sub}
    />
  </View>
);

// ─── Главный компонент ────────────────────────────────────────────────────────

const CraneScreen: React.FC = () => {
  const isTablet = useTablet();
  const { state, updateCraneInfo, updateCraneDays } = useData();
  const isDark = state.theme === 'dark';
  const tc = getTC(isDark);

  const info = state.craneInfo;
  const days = useMemo(
    () => [...state.craneDays].sort((a, b) => a.date.localeCompare(b.date)),
    [state.craneDays]
  );

  const setInfo = (updater: (prev: CraneLogInfo) => CraneLogInfo) => updateCraneInfo(updater(info));

  // Оператор — из личной карточки (PersonalScreen)
  const fullName = [state.personal.firstName, state.personal.lastName].filter(Boolean).join(' ');
  const dob = state.personal.birthDate || '';
  const rank = state.personal.appliedPosition === 'Other'
    ? (state.personal.customPosition || '')
    : (state.personal.appliedPosition || '');

  const [infoModal, setInfoModal] = useState(false);
  const [addModal, setAddModal]   = useState(false);
  const [editDayId, setEditDayId] = useState<string | null>(null);
  const [newDate, setNewDate]     = useState(todayStr());
  const editDay = editDayId ? (days.find(d => d.id === editDayId) ?? null) : null;

  const addDay = () => {
    if (days.find(d => d.date === newDate)) {
      alertMsg('Error', 'This date already exists in the log');
      return;
    }
    updateCraneDays([...state.craneDays, createEmptyDay(newDate)]);
    setAddModal(false);
  };

  const toggleSlot = useCallback((dayId: string, i: number) => {
    updateCraneDays(state.craneDays.map(d => {
      if (d.id !== dayId) return d;
      const slots = [...d.slots] as DPSlotValue[];
      slots[i] = slots[i] ? 0 : 1;
      return { ...d, slots };
    }));
  }, [state.craneDays, updateCraneDays]);

  const deleteDay = async (id: string) => {
    if (await confirmAsync('Delete day', 'Remove this day from the log?', { confirmText: 'Delete', destructive: true })) {
      updateCraneDays(state.craneDays.filter(d => d.id !== id));
      setEditDayId(null);
    }
  };

  const workedDays = days.filter(d => calcHours(d.slots) > 0);
  const totalHours = days.reduce((sum, d) => sum + calcHours(d.slots), 0);
  const avg = workedDays.length ? totalHours / workedDays.length : 0;
  const craneLine = [info.craneMake, info.craneType, info.craneSwl ? `SWL ${swlText(info.craneSwl)}` : ''].filter(Boolean).join(' · ');

  // ── PDF ────────────────────────────────────────────────────────────────────

  const generatePDF = () => {
    if (!fullName || !info.vesselName) {
      alertMsg('Missing Info', 'Fill in your name in Personal and the vessel in Log Information first');
      return;
    }
    if (workedDays.length === 0) {
      alertMsg('No Data', 'No crane hours logged yet');
      return;
    }
    const row = (label: string, value: string) => value ? `<tr><th>${label}</th><td>${esc(value)}</td></tr>` : '';
    const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  @page { size: A4; margin: 15mm 18mm; }
  body { font-family: Arial, sans-serif; font-size: 9pt; color: #000; margin: 0; }
  h1 { font-size: 14pt; margin: 0 0 2px; }
  .sub { color: #555; font-size: 8.5pt; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; }
  .head th { width: 32%; text-align: left; background: #f4f6f9; font-weight: 600; }
  .head th, .head td { border: 1px solid #bbb; padding: 3px 6px; font-size: 8.5pt; }
  .log th { background: #002147; color: #fff; padding: 4px 6px; text-align: left; font-size: 8pt; }
  .log td { border: 1px solid #bbb; padding: 3px 6px; font-size: 8.5pt; }
  .log tr:nth-child(even) td { background: #f5f7fa; }
  .log td.h { text-align: right; white-space: nowrap; width: 60px; }
  .log tr.total td { font-weight: 700; background: #e8edf4; }
  .stmt { margin-top: 10px; }
  .sig { margin-top: 26px; display: flex; justify-content: space-between; }
  .sig div { width: 45%; }
  .line { border-top: 1px solid #555; margin: 26px 0 3px; }
</style></head><body>
<h1>Crane Operator Hours Log</h1>
<div class="sub">Generated ${displayDate(todayStr())} · Seafarer Documents Manager</div>
<table class="head">
  ${row('Crane Operator', fullName)}
  ${row('Date of Birth', displayDate(dob))}
  ${row('Rank', rank)}
  ${row('Company', info.company)}
  ${row('Vessel', info.vesselName)}
  ${row('IMO No.', info.imo)}
  ${row('Crane Make / Model', info.craneMake)}
  ${row('Crane Type', info.craneType)}
  ${row('Crane SWL', swlText(info.craneSwl))}
  ${row('Contract Period', info.contractStart || info.contractEnd ? `${displayDate(info.contractStart)} – ${displayDate(info.contractEnd)}` : '')}
</table>
<table class="log">
  <thead><tr><th style="width:80px">Date</th><th>Crane operation (local time)</th><th>Hours</th></tr></thead>
  <tbody>
    ${workedDays.map(d => `<tr><td>${displayDate(d.date)}</td><td>${periods(d.slots)}</td><td class="h">${calcHours(d.slots).toFixed(1)}</td></tr>`).join('')}
    <tr class="total"><td colspan="2">Total: ${workedDays.length} day(s)</td><td class="h">${totalHours.toFixed(1)}</td></tr>
  </tbody>
</table>
<p class="stmt">We confirm that the crane operator named above operated the crane listed for the hours recorded in this log.</p>
<div class="sig">
  <div><div class="line"></div>Crane Operator: ${esc(fullName)}</div>
  <div><div class="line"></div><b>${esc(info.signatoryName)}</b>${info.signatoryRank ? `, ${esc(info.signatoryRank)}` : ''}<br>${esc(info.company)}${info.companyContacts ? `<br>${esc(info.companyContacts).replace(/\n/g, '<br>')}` : ''}</div>
</div>
</body></html>`;
    const surname = (state.personal.lastName || 'Unknown').replace(/[\s/]+/g, '_');
    const genDate = todayStr().replace(/-/g, '');
    printHtml(html, `Crane_log_${surname}_${genDate}`);
  };

  // ─── РЕНДЕР ──────────────────────────────────────────────────────────────

  return (
    <LinearGradient colors={tc.bg} style={s.container}>
      <ImageBackground
        source={CRANE_HOOK_BG}
        style={s.container}
        imageStyle={[s.bgImage, { opacity: isDark ? 0.15 : 0.08, tintColor: isDark ? '#ffcc80' : '#c77700' }]}
      >
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, isTablet && s.scrollTablet]}>
          <View style={isTablet ? s.center : undefined}>

            <TouchableOpacity
              style={[s.infoBtn, { backgroundColor: tc.sectionBg, borderColor: tc.cardBorder }]}
              onPress={() => setInfoModal(true)}
              activeOpacity={0.82}
            >
              <Ionicons name="construct-outline" size={22} color={tc.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[s.infoBtnTitle, { color: tc.text }]}>
                  {info.vesselName || 'Enter Crane Log Information'}
                </Text>
                {craneLine ? <Text style={[s.infoBtnSub, { color: tc.sub }]}>{craneLine}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={tc.sub} />
            </TouchableOpacity>

            <View style={[s.statsRow, { backgroundColor: tc.sectionBg }]}>
              <View style={s.statItem}>
                <Text style={[s.statVal, { color: tc.accent }]}>{workedDays.length}</Text>
                <Text style={[s.statLbl, { color: tc.sub }]}>Days</Text>
              </View>
              <View style={[s.statDiv, { backgroundColor: tc.cellBorder }]} />
              <View style={s.statItem}>
                <Text style={[s.statVal, { color: tc.text }]}>{totalHours.toFixed(1)}h</Text>
                <Text style={[s.statLbl, { color: tc.sub }]}>Total</Text>
              </View>
              <View style={[s.statDiv, { backgroundColor: tc.cellBorder }]} />
              <View style={s.statItem}>
                <Text style={[s.statVal, { color: tc.text }]}>{avg.toFixed(1)}h</Text>
                <Text style={[s.statLbl, { color: tc.sub }]}>Avg / day</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[s.addBtn, { borderColor: tc.accent, backgroundColor: tc.accentGlow }]}
              onPress={() => { setNewDate(todayStr()); setAddModal(true); }}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={24} color={tc.accent} />
              <Text style={[s.addBtnTxt, { color: tc.accent }]}>Add Crane Day</Text>
            </TouchableOpacity>

            {days.length === 0 ? (
              <View style={s.empty}>
                <Text style={[s.emptyTxt, { color: tc.sub }]}>No crane days added yet</Text>
                <Text style={[s.emptyHint, { color: tc.sub }]}>Tap "Add Crane Day" to start</Text>
              </View>
            ) : (
              <>
                {days.map(day => {
                  const h = calcHours(day.slots);
                  const p = periods(day.slots);
                  return (
                    <TouchableOpacity key={day.id}
                      style={[s.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}
                      onPress={() => setEditDayId(day.id)}
                      activeOpacity={0.82}
                    >
                      <View style={s.cardHead}>
                        <Text style={[s.cardDate, { color: tc.text }]}>{displayDate(day.date)}</Text>
                        <View style={[s.badge, { backgroundColor: h > 0 ? tc.accent : tc.sub }]}>
                          <Text style={s.badgeTxt}>{h.toFixed(1)}h</Text>
                        </View>
                      </View>
                      <Text style={[s.cardStat, { color: tc.sub }]}>{p || 'No hours marked'}</Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[s.pdfBtn, { backgroundColor: tc.accent }]}
                  onPress={generatePDF}
                  activeOpacity={0.85}
                >
                  <Ionicons name="document-text-outline" size={18} color="#fff" />
                  <Text style={s.pdfTxt}>Crane Hours Log (PDF)</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ── Добавить день ── */}
      <Modal visible={addModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => setAddModal(false)}>
        <SafeAreaView style={[s.modal, { backgroundColor: tc.modalBg }]} edges={['top', 'bottom']}>
          <View style={[s.mHead, { borderBottomColor: tc.divider }]}>
            <TouchableOpacity onPress={() => setAddModal(false)}>
              <Text style={[s.mCancel, { color: tc.accent }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[s.mTitle, { color: tc.text }]}>Add Crane Day</Text>
            <TouchableOpacity onPress={addDay}>
              <Text style={[s.mSave, { color: tc.accent }]}>Add</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <SimpleDatePicker label="Select Date" value={newDate} onChange={setNewDate} isDark={isDark} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Сетка часов дня ── */}
      <Modal visible={!!editDay} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => setEditDayId(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0a1628' : '#eef2f8' }} edges={['top', 'bottom']}>
          <LinearGradient
            colors={isDark ? ['#0a1628', '#1a2a4a', '#0d1a2d'] : ['#eef2f8', '#e4eaf4', '#d8e0ee']}
            style={{ flex: 1 }}
          >
            <View style={[s.mHead, { borderBottomColor: tc.divider }]}>
              <TouchableOpacity onPress={() => setEditDayId(null)}>
                <Text style={[s.mCancel, { color: tc.accent }]}>Done</Text>
              </TouchableOpacity>
              <Text style={[s.mTitle, { color: tc.text }]}>{editDay ? displayDate(editDay.date) : ''}</Text>
              <TouchableOpacity onPress={() => editDay && deleteDay(editDay.id)}>
                <Ionicons name="trash-outline" size={22} color={tc.danger} />
              </TouchableOpacity>
            </View>
            {editDay && (
              <>
                <View style={[s.dayBar, { backgroundColor: tc.accentGlow }]}>
                  <Text style={[s.dayChip, { color: tc.accent }]}>{calcHours(editDay.slots).toFixed(1)}h</Text>
                  <Text style={[s.dayPeriods, { color: tc.text }]} numberOfLines={2}>{periods(editDay.slots)}</Text>
                </View>
                <View style={[s.legend, { backgroundColor: tc.sectionBg }]}>
                  <View style={s.legItem}>
                    <View style={[s.legDot, { backgroundColor: tc.cellEmpty, borderWidth: 1, borderColor: tc.cellBorder }]} />
                    <Text style={[s.legTxt, { color: tc.sub }]}>Off</Text>
                  </View>
                  <View style={s.legItem}>
                    <View style={[s.legDot, { backgroundColor: tc.cellOn }]} />
                    <Text style={[s.legTxt, { color: tc.sub }]}>Crane operation (C)</Text>
                  </View>
                  <Text style={[s.legHint, { color: tc.sub }]}>Tap a 30-min slot</Text>
                </View>
                <ScrollView contentContainerStyle={s.gridPad} showsVerticalScrollIndicator={false}>
                  <DayGrid day={editDay} tc={tc} onToggle={i => toggleSlot(editDay.id, i)} />
                </ScrollView>
              </>
            )}
          </LinearGradient>
        </SafeAreaView>
      </Modal>

      {/* ── Информация журнала ── */}
      <Modal visible={infoModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => setInfoModal(false)}>
        <SafeAreaView style={[s.modal, { backgroundColor: tc.modalBg }]} edges={['top', 'bottom']}>
          <View style={[s.mHead, { borderBottomColor: tc.divider }]}>
            <View style={{ width: 50 }} />
            <Text style={[s.mTitle, { color: tc.text }]}>Crane Log Information</Text>
            <TouchableOpacity onPress={() => setInfoModal(false)}>
              <Text style={[s.mSave, { color: tc.accent }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.infoScroll}>
            <Text style={[s.sectionLabel, { color: tc.accent }]}>Crane Operator</Text>
            <View style={[s.infoBlock, { backgroundColor: tc.sectionBg }]}>
              {fullName ? (
                <>
                  <Text style={[s.readValue, { color: tc.text }]}>{fullName}</Text>
                  <Text style={[s.readHint, { color: tc.sub }]}>
                    {[rank, dob ? displayDate(dob) : ''].filter(Boolean).join(' · ')}{'\n'}From the Personal screen
                  </Text>
                </>
              ) : (
                <Text style={[s.readHint, { color: tc.danger }]}>Fill in your name, date of birth and position in the Personal screen</Text>
              )}
            </View>

            <Text style={[s.sectionLabel, { color: tc.accent }]}>Vessel & Company</Text>
            <View style={[s.infoBlock, { backgroundColor: tc.sectionBg }]}>
              <InfoField label="Company Name" value={info.company}
                onChange={v => setInfo(p => ({ ...p, company: v }))} tc={tc} />
              <View style={s.twoCol}>
                <View style={{ flex: 2 }}>
                  <InfoField label="Vessel Name" value={info.vesselName}
                    onChange={v => setInfo(p => ({ ...p, vesselName: v }))} tc={tc} />
                </View>
                <View style={{ flex: 1 }}>
                  <InfoField label="IMO No." value={info.imo}
                    onChange={v => setInfo(p => ({ ...p, imo: v }))} tc={tc} />
                </View>
              </View>
            </View>

            <Text style={[s.sectionLabel, { color: tc.accent }]}>Crane</Text>
            <View style={[s.infoBlock, { backgroundColor: tc.sectionBg }]}>
              <InfoField label={t('seaService.form.craneMake')} value={info.craneMake}
                placeholder={t('seaService.form.craneMakePlaceholder')}
                onChange={v => setInfo(p => ({ ...p, craneMake: v }))} tc={tc} />
              <Text style={[f.label, { color: tc.sub }]}>{t('seaService.form.craneType')}</Text>
              <OptionWithOtherInput
                value={info.craneType}
                onChangeText={v => setInfo(p => ({ ...p, craneType: v }))}
                isDark={isDark}
                options={CRANE_TYPES}
                placeholder={t('seaService.form.craneTypePlaceholder')}
                otherLabel={t('seaService.form.otherOption')}
                clearLabel={t('seaService.form.clearSelection')}
              />
              <InfoField label={t('seaService.form.craneSwl')} value={info.craneSwl}
                placeholder={t('seaService.form.craneSwlPlaceholder')}
                onChange={v => setInfo(p => ({ ...p, craneSwl: v }))} tc={tc} />
            </View>

            <Text style={[s.sectionLabel, { color: tc.accent }]}>Contract Period</Text>
            <View style={[s.infoBlock, { backgroundColor: tc.sectionBg }]}>
              <SimpleDatePicker label="Contract Start" value={info.contractStart || todayStr()}
                onChange={v => setInfo(p => ({ ...p, contractStart: v }))} isDark={isDark} />
              <SimpleDatePicker label="Contract End" value={info.contractEnd || todayStr()}
                onChange={v => setInfo(p => ({ ...p, contractEnd: v }))} isDark={isDark} />
            </View>

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

// ─── Стили ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  bgImage: { resizeMode: 'contain', width: '100%', height: '-120%', position: 'absolute', left: 0, right: 0, bottom: 0 },
  scroll: { padding: 14, paddingTop: 10 },
  scrollTablet: { alignItems: 'center' },
  center: { width: '100%', maxWidth: 720 },

  infoBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 10 },
  infoBtnTitle: { fontSize: 15, fontWeight: '600' },
  infoBtnSub: { fontSize: 12, marginTop: 2 },

  statsRow: { flexDirection: 'row', borderRadius: 14, padding: 14, marginBottom: 12, alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statDiv: { width: 1, height: 34 },
  statVal: { fontSize: 22, fontWeight: '700' },
  statLbl: { fontSize: 11, marginTop: 2 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: 12, padding: 14, gap: 8, marginBottom: 16 },
  addBtnTxt: { fontSize: 16, fontWeight: '700' },

  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 9 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  cardDate: { fontSize: 17, fontWeight: '700' },
  cardStat: { fontSize: 13, fontWeight: '500' },

  badge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 56 },
  emptyTxt: { fontSize: 15, marginTop: 14 },
  emptyHint: { fontSize: 13, marginTop: 6, opacity: 0.7 },

  pdfBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 14, gap: 7, marginTop: 10 },
  pdfTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  modal: { flex: 1 },
  mHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  mTitle: { fontSize: 17, fontWeight: '600' },
  mCancel: { fontSize: 16 },
  mSave: { fontSize: 16, fontWeight: '600' },

  dayBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 12 },
  dayChip: { fontSize: 16, fontWeight: '700' },
  dayPeriods: { flex: 1, fontSize: 13 },

  legend: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 10, flexWrap: 'wrap' },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legDot: { width: 14, height: 14, borderRadius: 3 },
  legTxt: { fontSize: 12 },
  legHint: { fontSize: 11, marginLeft: 'auto' as any },

  gridPad: { padding: 10 },

  infoScroll: { padding: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 6 },
  infoBlock: { borderRadius: 14, padding: 14, marginBottom: 16, gap: 4 },
  twoCol: { flexDirection: 'row', gap: 10 },
  readValue: { fontSize: 15, fontWeight: '600' },
  readHint: { fontSize: 12, marginTop: 4 },
});

const g = StyleSheet.create({
  wrapper: { flexDirection: 'row', gap: 5 },
  col: { flex: 1 },
  hourBlock: { marginBottom: 4 },
  hourLabel: { borderRadius: 5, paddingVertical: 3, alignItems: 'center', marginBottom: 2 },
  hourLabelTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  slotPair: { flexDirection: 'row', gap: 2 },
  slot: { flex: 1, height: 36, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  slotTxt: { color: '#fff', fontSize: 12, fontWeight: '900' },
});

const f = StyleSheet.create({
  group: { marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, textAlignVertical: 'top' },
});

export default CraneScreen;
