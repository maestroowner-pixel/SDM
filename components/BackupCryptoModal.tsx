// The password for an encrypted .sdm file (utils/sdmCrypto.ts): saving one (a full backup or the
// file for the vessel, encrypted unless the person chooses otherwise) and opening one.
// The same file in the app and in SDM-Web.

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { MIN_PASSWORD } from '../utils/sdmCrypto';
import { t } from '../utils/i18n';

export type BackupKind = 'full' | 'vessel';
export interface BackupChoice { kind: BackupKind; encrypted: boolean; password: string }

interface Props {
  mode: 'export' | 'import' | null;
  isDark: boolean;
  busy: boolean;
  /** What went wrong with the last try, already in words. */
  error?: string;
  onCancel: () => void;
  onSubmit: (c: BackupChoice) => void;
}

export const BackupCryptoModal: React.FC<Props> = ({ mode, isDark, busy, error, onCancel, onSubmit }) => {
  const [kind, setKind] = useState<BackupKind>('full');
  const [encrypted, setEncrypted] = useState(true);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [problem, setProblem] = useState('');

  // Nothing typed outlives the dialog.
  useEffect(() => {
    if (!mode) {
      setKind('full');
      setEncrypted(true);
      setPassword('');
      setRepeat('');
      setProblem('');
    }
  }, [mode]);

  const go = () => {
    if (mode === 'export' && encrypted) {
      if (password.length < MIN_PASSWORD) return setProblem(t('settings.crypto.tooShort', { n: MIN_PASSWORD }));
      if (password !== repeat) return setProblem(t('settings.crypto.mismatch'));
    }
    if (mode === 'import' && !password) return setProblem(t('settings.crypto.enterPassword'));
    setProblem('');
    onSubmit({ kind, encrypted: mode === 'import' ? true : encrypted, password });
  };

  const fg = isDark ? '#FFFFFF' : '#1A2433';
  const dim = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(26,36,51,0.7)';
  const input = [styles.input, { color: fg, borderColor: dim }];
  const option = (k: BackupKind, title: string, hint: string) => (
    <TouchableOpacity key={k} style={[styles.option, { borderColor: kind === k ? '#2F80ED' : dim }]} onPress={() => setKind(k)} disabled={busy}>
      <Text style={[styles.optionTitle, { color: fg }]}>{title}</Text>
      <Text style={[styles.hint, { color: dim }]}>{hint}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={!!mode} transparent animationType="fade" onRequestClose={busy ? undefined : onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: isDark ? '#1C2733' : '#FFFFFF' }]}>
          <Text style={[styles.title, { color: fg }]}>{t(mode === 'import' ? 'settings.crypto.titleImport' : 'settings.crypto.titleExport')}</Text>
          {mode === 'export' ? (
            <>
              {option('full', t('settings.crypto.kindFull'), t('settings.crypto.kindFullHint'))}
              {option('vessel', t('settings.crypto.kindVessel'), t('settings.crypto.kindVesselHint'))}
              <View style={styles.row}>
                <Text style={[styles.optionTitle, { color: fg, flex: 1 }]}>{t('settings.crypto.encrypt')}</Text>
                <Switch value={encrypted} onValueChange={setEncrypted} disabled={busy} />
              </View>
              {!encrypted ? <Text style={[styles.hint, { color: '#E0A100' }]}>{t('settings.crypto.plainWarn')}</Text> : null}
            </>
          ) : <Text style={[styles.hint, { color: dim }]}>{t('settings.crypto.importHint')}</Text>}
          {mode === 'import' || encrypted ? (
            <>
              <TextInput style={input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} placeholder={t('settings.crypto.password')} placeholderTextColor={dim} />
              {mode === 'export' ? <TextInput style={input} value={repeat} onChangeText={setRepeat} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} placeholder={t('settings.crypto.repeat')} placeholderTextColor={dim} /> : null}
              {mode === 'export' ? <Text style={[styles.hint, { color: dim }]}>{t('settings.crypto.noRecovery')}</Text> : null}
            </>
          ) : null}
          {problem || error ? <Text style={styles.error}>{problem || error}</Text> : null}
          {busy ? (
            <View style={styles.row}>
              <ActivityIndicator />
              <Text style={[styles.hint, { color: dim, flex: 1 }]}>{t('settings.crypto.working')}</Text>
            </View>
          ) : (
            <View style={styles.buttons}>
              <Pressable onPress={onCancel} style={styles.button}><Text style={{ color: dim, fontWeight: '600' }}>{t('common.cancel')}</Text></Pressable>
              <Pressable onPress={go} style={[styles.button, styles.primary]}><Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{t(mode === 'import' ? 'settings.crypto.open' : 'settings.crypto.save')}</Text></Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 440, borderRadius: 16, padding: 18, gap: 10 },
  title: { fontSize: 18, fontWeight: '700' },
  option: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 2 },
  optionTitle: { fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  error: { color: '#E5484D', fontSize: 14, fontWeight: '600' },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  button: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  primary: { backgroundColor: '#2F80ED' },
});
