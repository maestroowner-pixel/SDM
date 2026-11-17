// One-time optional sign-in invitation. Shown after the user removed the example
// data and saved their own record for the first time (DataContext.syncPrompt).
// Signing in is never required — it only lets the same account open the data on
// other devices and keep them in sync.
import React, { useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { AuthScreen } from '../screens/AuthScreen';
import { chooseAsync } from '../utils/webAlert';
import { t } from '../utils/i18n';

export const SyncPrompt: React.FC = () => {
  const { state, dismissSyncPrompt } = useData();
  const { isConfigured, user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const asked = useRef(false);

  useEffect(() => {
    if (state.syncPrompt !== 'due' || asked.current) return;
    asked.current = true;
    if (!isConfigured || user?.emailVerified) { dismissSyncPrompt(); return; } // already synced or no accounts
    // Let the save (and its form closing) finish before the dialog appears.
    // No cleanup: dismissing flips syncPrompt, which would cancel this timer.
    setTimeout(async () => {
      dismissSyncPrompt();
      const choice = await chooseAsync(t('syncPrompt.title'), t('syncPrompt.message'), [
        { text: t('syncPrompt.later'), value: 'later', style: 'ghost' },
        { text: t('syncPrompt.signIn'), value: 'signIn', style: 'primary' },
      ]);
      if (choice === 'signIn') setShowAuth(true);
    }, 800);
  }, [state.syncPrompt]);

  return (
    <Modal visible={showAuth} animationType="fade" transparent={false} onRequestClose={() => setShowAuth(false)}>
      <AuthScreen onClose={() => setShowAuth(false)} />
    </Modal>
  );
};
