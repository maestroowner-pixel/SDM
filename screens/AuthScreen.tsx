// Optional sign-in for the mobile app — opened from Settings, not a gate.
// Signing in with the same email as SDM Web turns on record sync between devices.
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { DialogHost } from '../contexts/DialogContext';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../contexts/DataContext';
import { useAuth, authErrorMessage } from '../contexts/AuthContext';

type Mode = 'login' | 'register' | 'forgot';

const PasswordField: React.FC<{
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  isDark: boolean;
  onSubmitEditing?: () => void;
}> = ({ value, onChangeText, placeholder, isDark, onSubmitEditing }) => {
  const [show, setShow] = useState(false);
  return (
    <View style={[styles.pwWrap, isDark ? styles.inputDark : styles.inputLight]}>
      <TextInput
        style={[styles.pwInput, { color: isDark ? '#fff' : '#1A3A5C' }]}
        placeholder={placeholder}
        placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
        autoCapitalize="none"
        onSubmitEditing={onSubmitEditing}
      />
      <TouchableOpacity onPress={() => setShow(s => !s)} style={styles.eyeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} />
      </TouchableOpacity>
    </View>
  );
};

export const AuthScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { state } = useData();
  const isDark = state.theme === 'dark';
  const { user, register, login, resetPassword, resendVerification, reloadUser, logout } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const textColor = isDark ? '#fff' : '#1A3A5C';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const reset = () => { setError(''); setInfo(''); };

  // Signed in and verified → nothing left to do here; hand back to Settings so
  // the sync reconciliation (and its confirmation) can run.
  useEffect(() => {
    if (user && user.emailVerified) onClose();
  }, [user]);

  const submit = async () => {
    reset();
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (mode !== 'forgot' && !password) { setError('Please enter your password.'); return; }
    if (mode === 'register' && password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        await register(email, password);
        setInfo('Account created. Check your email for a verification link.');
      } else {
        await resetPassword(email);
        setInfo('Password reset link sent. Check your email.');
      }
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const renderVerify = () => (
    <>
      <Ionicons name="mail-unread-outline" size={52} color="#1976d2" style={{ alignSelf: 'center', marginBottom: 12 }} />
      <Text style={[styles.title, { color: textColor }]}>Verify your email</Text>
      <Text style={[styles.sub, { color: mutedColor }]}>
        We sent a verification link to{'\n'}
        <Text style={{ fontWeight: '700', color: textColor }}>{user?.email}</Text>.{'\n'}
        Open it, then tap “I've verified”.
      </Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!info && <Text style={styles.info}>{info}</Text>}

      <TouchableOpacity style={styles.primaryBtn} disabled={busy} onPress={async () => {
        reset(); setBusy(true);
        try {
          const ok = await reloadUser();
          if (ok) onClose();
          else setError('Not verified yet. Check your inbox (and spam).');
        } finally { setBusy(false); }
      }}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>I've verified — continue</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkBtn} onPress={async () => {
        reset();
        try { await resendVerification(); setInfo('Verification email resent.'); }
        catch (e) { setError(authErrorMessage(e)); }
      }}>
        <Text style={styles.link}>Resend verification email</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkBtn} onPress={() => { logout(); onClose(); }}>
        <Text style={[styles.link, { color: mutedColor }]}>Sign out</Text>
      </TouchableOpacity>
    </>
  );

  const renderForm = () => (
    <>
      <Ionicons name="cloud-outline" size={52} color="#1976d2" style={{ alignSelf: 'center', marginBottom: 12 }} />
      <Text style={[styles.title, { color: textColor }]}>
        {mode === 'login' ? 'Sign in to sync' : mode === 'register' ? 'Create account' : 'Reset password'}
      </Text>
      <Text style={[styles.sub, { color: mutedColor }]}>
        Use the same email on the web app to keep your records in sync. Scans stay on this device.
      </Text>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!info && <Text style={styles.info}>{info}</Text>}

      <TextInput
        style={[styles.input, isDark ? styles.inputDark : styles.inputLight, { color: textColor }]}
        placeholder="Email"
        placeholderTextColor={mutedColor}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {mode !== 'forgot' && (
        <PasswordField value={password} onChangeText={setPassword} placeholder="Password" isDark={isDark} onSubmitEditing={submit} />
      )}
      {mode === 'register' && (
        <PasswordField value={confirm} onChangeText={setConfirm} placeholder="Confirm password" isDark={isDark} onSubmitEditing={submit} />
      )}

      <TouchableOpacity style={styles.primaryBtn} disabled={busy} onPress={submit}>
        {busy ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.primaryBtnText}>
            {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
          </Text>
        )}
      </TouchableOpacity>

      {mode === 'login' && (
        <>
          <TouchableOpacity style={styles.linkBtn} onPress={() => { reset(); setMode('forgot'); }}>
            <Text style={[styles.link, { color: mutedColor }]}>Forgot password?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={() => { reset(); setMode('register'); }}>
            <Text style={styles.link}>No account? Create one</Text>
          </TouchableOpacity>
        </>
      )}
      {mode !== 'login' && (
        <TouchableOpacity style={styles.linkBtn} onPress={() => { reset(); setMode('login'); }}>
          <Text style={styles.link}>Back to sign in</Text>
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#0a1628' : '#F0F7FF' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={26} color={textColor} />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)' }]}>
            {user && !user.emailVerified ? renderVerify() : renderForm()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* AuthScreen lives inside a Modal → dialogs must render here */}
      <DialogHost />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', padding: 18, paddingBottom: 0 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { borderRadius: 20, padding: 24 },
  title: { fontSize: 23, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 20, lineHeight: 19 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 16, marginBottom: 14 },
  inputDark: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' },
  inputLight: { backgroundColor: '#f5f5f5', borderColor: 'rgba(0,0,0,0.1)' },
  pwWrap: { height: 50, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 6, marginBottom: 14 },
  pwInput: { flex: 1, fontSize: 16, height: '100%' },
  eyeBtn: { padding: 8 },
  primaryBtn: { height: 52, borderRadius: 12, backgroundColor: '#1976d2', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  linkBtn: { alignSelf: 'center', paddingVertical: 11 },
  link: { fontSize: 15, fontWeight: '600', color: '#1976d2' },
  error: { color: '#f44336', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  info: { color: '#1976d2', fontSize: 14, textAlign: 'center', marginBottom: 12 },
});
