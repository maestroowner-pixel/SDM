// "Step by step" page of the Manual: every screen, where it is, and each action
// as a numbered chain of taps. Content: utils/manualSteps.ts. English only, like
// the rest of the Manual; **Label** in a step is shown as a key.
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MANUAL_STEPS, StepScreen } from '../utils/manualSteps';

const StepText: React.FC<{ s: string; style: any; keyStyle: any }> = ({ s, style, keyStyle }) => {
  const parts = s.split(/\*\*(.+?)\*\*/g);
  return <Text style={style}>{parts.map((p, i) => (i % 2 ? <Text key={i} style={keyStyle}>{` ${p} `}</Text> : p))}</Text>;
};

const matches = (s: StepScreen, q: string) =>
  s.acts.filter(a => !q || `${s.title} ${a.t} ${a.steps.join(' ')} ${a.note ?? ''}`.toLowerCase().includes(q));

export const ManualSteps: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [q, setQ] = useState('');
  const [openScreen, setOpenScreen] = useState<string | null>(null);
  const [openAct, setOpenAct] = useState<string | null>(null);
  const query = q.trim().toLowerCase();

  const tc = {
    text:    isDark ? '#e8eaf6' : '#1a237e',
    sub:     isDark ? 'rgba(255,255,255,0.6)' : '#455a64',
    accent:  isDark ? '#90caf9' : '#1565c0',
    surface: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)',
    border:  isDark ? 'rgba(255,255,255,0.12)' : 'rgba(21,101,192,0.18)',
    keyBg:   isDark ? 'rgba(144,202,249,0.16)' : 'rgba(21,101,192,0.1)',
    noteBg:  isDark ? 'rgba(0,191,255,0.1)' : 'rgba(21,101,192,0.07)',
  };

  const groups = useMemo(
    () => MANUAL_STEPS
      .map(g => ({ title: g.title, screens: g.screens.map(s => ({ s, acts: matches(s, query) })).filter(x => x.acts.length) }))
      .filter(g => g.screens.length),
    [query],
  );
  const n = groups.reduce((a, g) => a + g.screens.reduce((b, x) => b + x.acts.length, 0), 0);
  const keyStyle = [st.inKey, { color: tc.text, backgroundColor: tc.keyBg }];

  return (
    <View>
      <Text style={[st.lead, { color: tc.sub }]}>
        Each screen starts with where it is. Under it, each thing you can do there is a chain of steps — tap what is in bold, in that order.
      </Text>

      <View style={[st.searchRow, { borderColor: tc.border, backgroundColor: tc.surface }]}>
        <Ionicons name="search" size={18} color={tc.sub} />
        <TextInput
          style={[st.search, { color: tc.text }]}
          value={q}
          onChangeText={setQ}
          placeholder="Find an action — “PDF”, “backup”…"
          placeholderTextColor={tc.sub}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        <Text style={[st.count, { color: tc.sub }]}>{query ? `${n} found` : `${n} actions`}</Text>
      </View>

      {!groups.length && <Text style={[st.empty, { color: tc.sub }]}>Nothing matches. Try another word.</Text>}

      {groups.map(g => (
        <View key={g.title}>
          <Text style={[st.group, { color: tc.sub }]}>{g.title}</Text>
          {g.screens.map(({ s, acts }) => {
            const open = !!query || openScreen === s.id;
            return (
              <View key={s.id} style={[st.card, { backgroundColor: tc.surface, borderColor: tc.border }]}>
                <TouchableOpacity style={st.header} activeOpacity={0.7} onPress={() => setOpenScreen(openScreen === s.id ? null : s.id)}>
                  <Text style={[st.title, { color: tc.text }]}>{s.title}</Text>
                  <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={18} color={tc.sub} />
                </TouchableOpacity>
                {open && (
                  <View style={st.body}>
                    <View style={st.where}>
                      {s.path.map((p, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <Text style={[st.arrow, { color: tc.sub }]}>→</Text>}
                          <Text style={[st.key, { color: tc.text, borderColor: tc.border }]}>{p}</Text>
                        </React.Fragment>
                      ))}
                    </View>
                    <Text style={[st.para, { color: tc.sub }]}>{s.intro}</Text>
                    {acts.map(a => {
                      const k = `${s.id}/${a.t}`;
                      const aOpen = !!query || openAct === k;
                      return (
                        <View key={k} style={[st.act, { borderTopColor: tc.border }]}>
                          <TouchableOpacity style={st.actHead} activeOpacity={0.7} onPress={() => setOpenAct(openAct === k ? null : k)}>
                            <Ionicons name={aOpen ? 'chevron-down' : 'chevron-forward'} size={14} color={tc.sub} />
                            <Text style={[st.actTitle, { color: tc.text }]}>{a.t}</Text>
                            {a.premium && <Text style={[st.badge, { color: tc.accent, borderColor: tc.accent }]}>Unlimited</Text>}
                          </TouchableOpacity>
                          {aOpen && (
                            <View style={st.chain}>
                              {a.steps.map((step, i) => (
                                <View key={i} style={st.stepRow}>
                                  <View style={[st.num, { borderColor: tc.accent }]}>
                                    <Text style={[st.numText, { color: tc.accent }]}>{i + 1}</Text>
                                  </View>
                                  <StepText s={step} style={[st.step, { color: tc.sub }]} keyStyle={keyStyle} />
                                </View>
                              ))}
                              {a.note && (
                                <View style={[st.note, { backgroundColor: tc.noteBg, borderLeftColor: tc.accent }]}>
                                  <StepText s={a.note} style={[st.noteText, { color: tc.sub }]} keyStyle={keyStyle} />
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const st = StyleSheet.create({
  lead:      { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, marginBottom: 8 },
  search:    { flex: 1, minWidth: 0, paddingVertical: 10, fontSize: 15 },
  count:     { fontSize: 12 },
  empty:     { fontSize: 14, textAlign: 'center', marginVertical: 24 },
  group:     { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16, marginBottom: 8 },
  card:      { borderRadius: 14, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  header:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  title:     { flex: 1, fontSize: 16, fontWeight: '700' },
  body:      { paddingHorizontal: 14, paddingBottom: 12, gap: 8 },
  where:     { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  key:       { fontSize: 12, fontWeight: '600', borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  arrow:     { fontSize: 12 },
  para:      { fontSize: 14, lineHeight: 20 },
  inKey:     { fontWeight: '700' },
  act:       { borderTopWidth: StyleSheet.hairlineWidth },
  actHead:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingVertical: 10 },
  actTitle:  { flexShrink: 1, fontSize: 14, fontWeight: '600' },
  badge:     { fontSize: 10, fontWeight: '700', borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden' },
  chain:     { paddingLeft: 16, paddingBottom: 8, gap: 6 },
  stepRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  num:       { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  numText:   { fontSize: 11, fontWeight: '800' },
  step:      { flex: 1, fontSize: 14, lineHeight: 22 },
  note:      { borderLeftWidth: 3, borderRadius: 8, padding: 10, marginTop: 2 },
  noteText:  { fontSize: 13, lineHeight: 19 },
});
