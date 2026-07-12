// Auth screen: login / register / forgot-password, plus an email-verification
// pending state. Shown by the app gate when Firebase is configured and the user
// is signed out or unverified.
import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../contexts/DataContext';
import { useAuth, authErrorMessage } from '../contexts/AuthContext';
import { UI_THEME } from '../utils/theme';

type Mode = 'login' | 'register' | 'forgot';

// Password field with a reveal (eye) toggle. Defined at module level so it
// isn't remounted on every keystroke (which would drop focus).
const PasswordField: React.FC<{
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  theme: any;
  isDark: boolean;
  autoComplete?: any;
  onSubmitEditing?: () => void;
}> = ({ value, onChangeText, placeholder, theme, isDark, autoComplete, onSubmitEditing }) => {
  const [show, setShow] = useState(false);
  return (
    <View style={[styles.pwWrap, { borderColor: theme.iconInactive, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)' }]}>
      <TextInput
        style={[styles.pwInput, { color: theme.text }]}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoComplete={autoComplete}
        onSubmitEditing={onSubmitEditing}
      />
      <TouchableOpacity onPress={() => setShow(s => !s)} style={styles.eyeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

export const AuthScreen: React.FC = () => {
  const { state } = useData();
  const isDark = state.theme === 'dark';
  const theme = isDark ? UI_THEME.colors.dark : UI_THEME.colors.light;
  const { user, register, login, resetPassword, resendVerification, reloadUser, logout } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const inputStyle = [
    styles.input,
    { color: theme.text, borderColor: theme.iconInactive, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)' },
  ];

  const reset = () => { setError(''); setInfo(''); };

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

  // ── Email verification pending ─────────────────────────────────────────────
  const renderVerify = () => (
    <>
      <Ionicons name="mail-unread-outline" size={56} color={theme.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
      <Text style={[styles.title, { color: theme.text }]}>Verify your email</Text>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        We sent a verification link to{'\n'}<Text style={{ fontWeight: '700', color: theme.text }}>{user?.email}</Text>.
        {'\n'}Open it, then tap “I've verified”.
      </Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!info && <Text style={[styles.info, { color: theme.primary }]}>{info}</Text>}

      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} disabled={busy} onPress={async () => {
        reset(); setBusy(true);
        try {
          const ok = await reloadUser();
          if (!ok) setError('Not verified yet. Check your inbox (and spam).');
        } finally { setBusy(false); }
      }}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>I've verified — continue</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkBtn} disabled={busy} onPress={async () => {
        reset();
        try { await resendVerification(); setInfo('Verification email resent.'); }
        catch (e) { setError(authErrorMessage(e)); }
      }}>
        <Text style={[styles.link, { color: theme.primary }]}>Resend verification email</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkBtn} onPress={() => logout()}>
        <Text style={[styles.link, { color: theme.textSecondary }]}>Sign out</Text>
      </TouchableOpacity>
    </>
  );

  // ── Login / Register / Forgot ──────────────────────────────────────────────
  const renderForm = () => (
    <>
      <Image source={require('../assets/images/sdm_icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={[styles.title, { color: theme.text }]}>
        {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Reset password'}
      </Text>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>Seafarer Documents Manager</Text>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!info && <Text style={[styles.info, { color: theme.primary }]}>{info}</Text>}

      <TextInput
        style={inputStyle}
        placeholder="Email"
        placeholderTextColor={theme.textSecondary}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        inputMode="email"
        autoComplete="email"
      />
      {mode !== 'forgot' && (
        <PasswordField
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          theme={theme}
          isDark={isDark}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          onSubmitEditing={submit}
        />
      )}
      {mode === 'register' && (
        <PasswordField
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Confirm password"
          theme={theme}
          isDark={isDark}
          autoComplete="new-password"
          onSubmitEditing={submit}
        />
      )}

      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} disabled={busy} onPress={submit}>
        {busy ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.primaryBtnText}>
            {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
          </Text>
        )}
      </TouchableOpacity>

      {mode === 'login' && (
        <>
          <TouchableOpacity style={styles.linkBtn} onPress={() => { reset(); setMode('forgot'); }}>
            <Text style={[styles.link, { color: theme.textSecondary }]}>Forgot password?</Text>
          </TouchableOpacity>
          <View style={styles.switchRow}>
            <Text style={{ color: theme.textSecondary }}>No account? </Text>
            <TouchableOpacity onPress={() => { reset(); setMode('register'); }}>
              <Text style={[styles.link, { color: theme.primary }]}>Create one</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      {mode !== 'login' && (
        <TouchableOpacity style={styles.linkBtn} onPress={() => { reset(); setMode('login'); }}>
          <Text style={[styles.link, { color: theme.primary }]}>Back to sign in</Text>
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <LinearGradient colors={theme.background as any} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)', borderColor: theme.iconInactive }]}>
          {user && !user.emailVerified ? renderVerify() : renderForm()}
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 32 },
  logo: { width: 64, height: 64, borderRadius: 14, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 20 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 16, marginBottom: 14 },
  pwWrap: { height: 50, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 6, marginBottom: 14 },
  pwInput: { flex: 1, fontSize: 16, height: '100%' },
  eyeBtn: { padding: 8 },
  primaryBtn: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  linkBtn: { alignSelf: 'center', paddingVertical: 12 },
  link: { fontSize: 15, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  error: { color: '#f44336', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  info: { fontSize: 14, textAlign: 'center', marginBottom: 12 },
});
