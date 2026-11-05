// screens/CVScreen.tsx — Web CV "design constructor".
// Left panel: saved versions, then Design (layout / accent / font / toggles) or
// Content (sections, columns, individual records). Right: live iframe preview
// that updates as you tweak. Generate → browser print (Save as PDF) with the
// mobile filename rule: CV_<lastName>_<YYYYMMDD>.pdf. Versions persist.
import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, TextInput,
  ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../contexts/DataContext';
import { useSubscription } from '../hooks/useSubscription';
import { useTablet } from '../hooks/useTablet';
import { t } from '../utils/i18n';
import { formatDate, formatDateForFilename } from '../utils/helpers';
import { printHtml } from '../utils/webPrint';
import { alertMsg, confirmAsync } from '../utils/webAlert';
import { playSuccessSound } from '../utils/sound';
import {
  buildCvHtml, CvColumnId, CvDesignConfig, CvSectionId, defaultCvConfig, CV_LAYOUTS, ACCENT_PRESETS,
  cvSectionsForLayout, isCvSectionMovable, moveCvSection, sortDocumentsForCv, sortSeaServiceForCv,
} from '../utils/cvTemplate';
import {
  CvVersionStore, CV_VERSION_NAME_MAX, activeCvVersion, deleteActiveCvVersion, duplicateActiveCvVersion,
  loadCvVersions, renameActiveCvVersion, saveCvVersions, updateActiveCvConfig,
} from '../utils/cvVersions';

const SECTION_LABELS: Record<CvSectionId, string> = {
  career: 'personal.sections.careerPreferences',
  personal: 'personal.sections.personalDetails',
  contact: 'personal.sections.contactInformation',
  seaService: 'cv.sections.seaService',
  documents: 'cv.sections.documents',
  education: 'education.title',
  physical: 'cv.sections.physicalData',
  nextOfKin: 'nextOfKin.title',
  notes: 'notes.title',
};

const COLUMN_LABELS: { group: CvSectionId; items: [CvColumnId, string][] }[] = [
  { group: 'seaService', items: [
    ['vesselType', 'seaService.form.vesselType'],
    ['teu', 'cv.table.teu'],
    ['machinery', 'cv.table.machinery'],
    ['area', 'cv.table.area'],
  ] },
  { group: 'documents', items: [
    ['docNumber', 'cv.table.number'],
    ['docIssueDate', 'cv.table.issueDate'],
    ['docExpiryDate', 'cv.table.expiryDate'],
  ] },
];

const toggleIn = <T,>(list: T[], item: T): T[] =>
  list.includes(item) ? list.filter(x => x !== item) : [...list, item];

const CheckRow: React.FC<{
  checked: boolean; label: string; sub?: string; color: string; muted?: string; accent: string; onPress: () => void;
}> = ({ checked, label, sub, color, muted, accent, onPress }) => (
  <TouchableOpacity style={styles.checkRow} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={20} color={checked ? accent : color} />
    <View style={styles.rowLabelFlex}>
      <Text style={[styles.checkLabel, { color }]} numberOfLines={2}>{label}</Text>
      {sub ? <Text style={[styles.checkSub, { color: muted }]} numberOfLines={1}>{sub}</Text> : null}
    </View>
  </TouchableOpacity>
);

// Checklist of records in a section; a record not excluded goes into the CV.
const RecordList: React.FC<{
  title: string;
  rows: { id: string; label: string; sub?: string }[];
  excluded: string[];
  onChange: (excluded: string[]) => void;
  theme: { text: string; muted: string };
  accent: string;
}> = ({ title, rows, excluded, onChange, theme, accent }) => {
  const rowIds = rows.map(r => r.id);
  const selected = rowIds.filter(id => !excluded.includes(id)).length;
  const setAll = (include: boolean) => onChange(include ? [] : rowIds);
  return (
    <View>
      <View style={styles.recordHeader}>
        <Text style={[styles.sectionLabel, styles.rowLabelFlex, { color: theme.muted }]}>
          {`${title} · ${t('cv.editor.selectedCount', { selected, total: rows.length })}`}
        </Text>
        <TouchableOpacity onPress={() => setAll(selected < rows.length)}>
          <Text style={[styles.recordToggleAll, { color: accent }]}>
            {t(selected < rows.length ? 'cv.editor.selectAll' : 'cv.editor.selectNone')}
          </Text>
        </TouchableOpacity>
      </View>
      {rows.map(r => (
        <CheckRow
          key={r.id}
          checked={!excluded.includes(r.id)}
          label={r.label}
          sub={r.sub}
          color={theme.text}
          muted={theme.muted}
          accent={accent}
          onPress={() => onChange(toggleIn(excluded, r.id))}
        />
      ))}
    </View>
  );
};

export const CVScreen: React.FC<{ onDisableSwipe?: () => void; onOpenPaywall?: () => void }> = ({ onOpenPaywall }) => {
  const { state, updatePersonal } = useData();
  const { isPremium } = useSubscription();
  const isDark = state.theme === 'dark';
  const isTablet = useTablet();

  const [store, setStore] = useState<CvVersionStore | null>(null);
  const [tab, setTab] = useState<'design' | 'content'>('design');
  const [renaming, setRenaming] = useState<string | null>(null); // draft name while renaming
  const [hexInput, setHexInput] = useState(defaultCvConfig.accent);
  const [loading, setLoading] = useState(false);
  const [lastGeneratedDate, setLastGeneratedDate] = useState(state.personal.lastCVGeneratedDate || '');

  // Load saved versions once.
  useEffect(() => {
    loadCvVersions(t('cv.editor.defaultVersionName')).then(setStore);
  }, []);

  // Persist versions on change (after initial load).
  useEffect(() => {
    if (store) saveCvVersions(store).catch(() => {});
  }, [store]);

  const active = store ? activeCvVersion(store) : null;
  const config = active ? active.config : defaultCvConfig;
  // The editor is a Premium feature: free users see a live preview of the
  // default design but any customization opens the paywall.
  const effectiveConfig = isPremium ? config : defaultCvConfig;

  // Each version has its own accent: show it when switching.
  useEffect(() => {
    setHexInput(config.accent);
    setRenaming(null);
  }, [active?.id]);

  useEffect(() => {
    if (state.personal.lastCVGeneratedDate && state.personal.lastCVGeneratedDate !== lastGeneratedDate) {
      setLastGeneratedDate(state.personal.lastCVGeneratedDate);
    }
  }, [state.personal.lastCVGeneratedDate]);

  const set = <K extends keyof CvDesignConfig>(key: K, value: CvDesignConfig[K]) => {
    if (!isPremium) { onOpenPaywall?.(); return; }
    setStore(prev => prev && updateActiveCvConfig(prev, c => ({ ...c, [key]: value })));
  };

  // Runs a version action, or opens the paywall for free users.
  const premiumOnly = (action: () => void) => {
    if (!isPremium) { onOpenPaywall?.(); return; }
    action();
  };

  const duplicateVersion = () => premiumOnly(() => {
    if (!store || !active) return;
    setStore(duplicateActiveCvVersion(store, `${active.name} ${t('cv.editor.copySuffix')}`));
  });

  const commitRename = () => {
    const name = (renaming || '').trim();
    if (store && name) setStore(renameActiveCvVersion(store, name));
    setRenaming(null);
  };

  const deleteVersion = () => premiumOnly(async () => {
    if (!store || !active || store.versions.length <= 1) return;
    const ok = await confirmAsync(
      t('cv.editor.deleteTitle'),
      `«${active.name}». ${t('cv.editor.deleteMessage')}`,
      { confirmText: t('common.delete'), cancelText: t('common.cancel'), destructive: true },
    );
    if (ok) setStore(prev => prev && deleteActiveCvVersion(prev));
  });

  const sectionRows = cvSectionsForLayout(effectiveConfig.layout, effectiveConfig.sectionOrder)
    // Notes are switched on from the Notes screen; there's nothing to place until then.
    .filter(id => id !== 'notes' || (state.includeNotesInCV && !!state.notes));
  const movableRows = sectionRows.filter(id => isCvSectionMovable(effectiveConfig.layout, id));
  const seaServiceRows = useMemo(() => sortSeaServiceForCv(state.seaService), [state.seaService]);
  const documentRows = useMemo(() => sortDocumentsForCv(state.documents), [state.documents]);

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
          <Text style={styles.premiumLockText}>{t('cv.editor.premiumLock')}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.muted} />
        </TouchableOpacity>
      )}

      <View pointerEvents={isPremium ? 'auto' : undefined} style={!isPremium ? { opacity: 0.5 } : undefined}>
      {/* Versions */}
      <SectionLabel>{t('cv.editor.versions')}</SectionLabel>
      <View style={styles.chipRow}>
        {(store?.versions || []).map(v => {
          const isActive = isPremium && v.id === store?.activeId;
          return (
            <TouchableOpacity
              key={v.id}
              style={[styles.chip, { backgroundColor: isActive ? effectiveConfig.accent : theme.chipInactive, borderColor: isActive ? effectiveConfig.accent : theme.border }]}
              onPress={() => premiumOnly(() => setStore(prev => prev && { ...prev, activeId: v.id }))}
            >
              <Text style={[styles.chipText, { color: isActive ? '#fff' : theme.text }]} numberOfLines={1}>{v.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {renaming !== null ? (
        <View style={styles.renameRow}>
          <TextInput
            style={[styles.renameInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.chipInactive }]}
            value={renaming}
            onChangeText={setRenaming}
            onSubmitEditing={commitRename}
            placeholder={t('cv.editor.versionName')}
            placeholderTextColor={theme.muted}
            maxLength={CV_VERSION_NAME_MAX}
            autoFocus
          />
          <TouchableOpacity accessibilityLabel={t('common.save')} style={styles.iconBtn} onPress={commitRename}>
            <Ionicons name="checkmark" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel={t('common.cancel')} style={styles.iconBtn} onPress={() => setRenaming(null)}>
            <Ionicons name="close" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.versionActions}>
          <TouchableOpacity style={styles.versionAction} onPress={duplicateVersion}>
            <Ionicons name="copy-outline" size={16} color={theme.text} />
            <Text style={[styles.versionActionText, { color: theme.text }]}>{t('cv.editor.duplicate')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.versionAction} onPress={() => premiumOnly(() => setRenaming(active?.name || ''))}>
            <Ionicons name="create-outline" size={16} color={theme.text} />
            <Text style={[styles.versionActionText, { color: theme.text }]}>{t('cv.editor.rename')}</Text>
          </TouchableOpacity>
          {(store?.versions.length || 0) > 1 && (
            <TouchableOpacity style={styles.versionAction} onPress={deleteVersion}>
              <Ionicons name="trash-outline" size={16} color="#d32f2f" />
              <Text style={[styles.versionActionText, { color: '#d32f2f' }]}>{t('common.delete')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <Text style={[styles.smallHint, { color: theme.muted }]}>{t('cv.editor.storedLocally')}</Text>

      {/* Design / Content */}
      <View style={[styles.tabs, { borderColor: theme.border }]}>
        {(['design', 'content'] as const).map(id => {
          const selected = tab === id;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.tabBtn, selected && { backgroundColor: effectiveConfig.accent }]}
              onPress={() => setTab(id)}
            >
              <Text style={[styles.chipText, { color: selected ? '#fff' : theme.text }]}>
                {t(id === 'design' ? 'cv.editor.tabDesign' : 'cv.editor.tabContent')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'design' ? <>
      {/* Layout */}
      <SectionLabel>{t('cv.editor.layout')}</SectionLabel>
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
      <SectionLabel>{t('cv.editor.accent')}</SectionLabel>
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
        <Text style={[styles.hexHint, { color: theme.muted }]}>{t('cv.editor.customHex')}</Text>
      </View>

      {/* Font */}
      <SectionLabel>{t('cv.editor.font')}</SectionLabel>
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
                {t(f === 'sans' ? 'cv.editor.fontSans' : 'cv.editor.fontSerif')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Toggles */}
      <SectionLabel>{t('cv.editor.elements')}</SectionLabel>
      {([
        ['showPhoto', 'cv.editor.showPhoto'],
        ['showAppQr', 'cv.editor.showAppQr'],
        ['showContactQr', 'cv.editor.showContactQr'],
        ['uppercaseHeadings', 'cv.editor.uppercaseHeadings'],
        ['zebra', 'cv.editor.zebra'],
      ] as [keyof CvDesignConfig, string][]).map(([key, label]) => (
        <View key={key} style={[styles.toggleRow, { borderColor: theme.border }]}>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>{t(label)}</Text>
          <Switch
            value={effectiveConfig[key] as boolean}
            onValueChange={(v) => set(key, v as any)}
            trackColor={{ false: '#999', true: effectiveConfig.accent }}
            thumbColor="#fff"
          />
        </View>
      ))}
      </> : <>
      {/* Sections */}
      <SectionLabel>{t('cv.editor.sections')}</SectionLabel>
      <Text style={[styles.smallHint, styles.hintBelowLabel, { color: theme.muted }]}>
        {t(effectiveConfig.layout === 'sidebar' ? 'cv.editor.sectionsHintSidebar' : 'cv.editor.sectionsHint')}
      </Text>
      {sectionRows.map(id => {
        const index = movableRows.indexOf(id);
        const move = (dir: -1 | 1) => set('sectionOrder', moveCvSection(effectiveConfig.sectionOrder, id, dir, movableRows));
        return (
          <View key={id} style={[styles.toggleRow, { borderColor: theme.border }]}>
            {index >= 0 && (
              <View style={styles.moveBtns}>
                <TouchableOpacity accessibilityLabel={t('cv.editor.moveUp')} disabled={index === 0} onPress={() => move(-1)} style={index === 0 && styles.moveDisabled}>
                  <Ionicons name="chevron-up" size={18} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity accessibilityLabel={t('cv.editor.moveDown')} disabled={index === movableRows.length - 1} onPress={() => move(1)} style={index === movableRows.length - 1 && styles.moveDisabled}>
                  <Ionicons name="chevron-down" size={18} color={theme.text} />
                </TouchableOpacity>
              </View>
            )}
            <Text style={[styles.toggleLabel, styles.rowLabelFlex, { color: theme.text }]}>{t(SECTION_LABELS[id])}</Text>
            <Switch
              value={!effectiveConfig.hiddenSections.includes(id)}
              onValueChange={() => set('hiddenSections', toggleIn(effectiveConfig.hiddenSections, id))}
              trackColor={{ false: '#999', true: effectiveConfig.accent }}
              thumbColor="#fff"
            />
          </View>
        );
      })}

      {/* Columns */}
      {COLUMN_LABELS.filter(g => !effectiveConfig.hiddenSections.includes(g.group)).map(g => (
        <View key={g.group}>
          <SectionLabel>{`${t('cv.editor.columns')}: ${t(SECTION_LABELS[g.group])}`}</SectionLabel>
          {g.items.map(([id, label]) => (
            <CheckRow
              key={id}
              checked={!effectiveConfig.hiddenColumns.includes(id)}
              label={t(label)}
              color={theme.text}
              accent={effectiveConfig.accent}
              onPress={() => set('hiddenColumns', toggleIn(effectiveConfig.hiddenColumns, id))}
            />
          ))}
        </View>
      ))}

      {/* Records */}
      {!effectiveConfig.hiddenSections.includes('seaService') && seaServiceRows.length > 0 && (
        <RecordList
          title={t('cv.editor.seaServiceRecords')}
          rows={seaServiceRows.map(s => ({
            id: s.id,
            label: s.vesselName || '-',
            sub: `${s.position === 'Other' ? (s.customPosition || '-') : (s.position || '-')} · ${formatDate(s.signOn)} — ${formatDate(s.signOff)}`,
          }))}
          excluded={effectiveConfig.excludedSeaService}
          onChange={ids => set('excludedSeaService', ids)}
          theme={theme}
          accent={effectiveConfig.accent}
        />
      )}
      {!effectiveConfig.hiddenSections.includes('documents') && documentRows.length > 0 && (
        <RecordList
          title={t('cv.editor.documentRecords')}
          rows={documentRows.map(d => ({ id: d.id, label: d.name || '-', sub: formatDate(d.expiryDate) }))}
          excluded={effectiveConfig.excludedDocuments}
          onChange={ids => set('excludedDocuments', ids)}
          theme={theme}
          accent={effectiveConfig.accent}
        />
      )}
      </>}
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
  renameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  renameInput: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  iconBtn: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  versionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  versionAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  versionActionText: { fontSize: 13, fontWeight: '600' },
  smallHint: { fontSize: 12, marginTop: 8 },
  hintBelowLabel: { marginTop: 0, marginBottom: 6 },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 3, marginTop: 18, gap: 3 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  moveBtns: { marginRight: 10 },
  moveDisabled: { opacity: 0.25 },
  rowLabelFlex: { flex: 1, minWidth: 0 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  checkLabel: { fontSize: 14, fontWeight: '500' },
  checkSub: { fontSize: 12, marginTop: 1 },
  recordHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  recordToggleAll: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
});
