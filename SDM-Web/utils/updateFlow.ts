// The user-facing half of the update: ask, download, offer to restart. Shared by the
// startup check and the Settings button so both behave identically.
//
// Nothing happens without a "yes": the download starts only after the first dialog, and the
// app restarts only after the second.
import { alertMsg, confirmAsync } from './webAlert';
import { t } from './i18n';
import { nativeUpdater, openDownloadPage, type UpdateInfo } from './updateCheck';

export const runUpdateFlow = async (info: UpdateInfo): Promise<void> => {
  const updater = nativeUpdater();

  // Cannot install itself (dev run, or a browser) → hand the user the download page.
  if (!info.canSelfInstall || !updater) {
    const ok = await confirmAsync(
      t('update.available'),
      t('update.availableBody', { version: info.latest, current: info.current }),
      { confirmText: t('update.download'), cancelText: t('update.later') }
    );
    if (ok) openDownloadPage(info.url);
    return;
  }

  const ok = await confirmAsync(
    t('update.available'),
    t('update.availableAutoBody', { version: info.latest, current: info.current }),
    { confirmText: t('update.download'), cancelText: t('update.later') }
  );
  if (!ok) return;

  // These fire once; drop both listeners on whichever outcome lands first.
  let offDownloaded: (() => void) | null = null;
  let offError: (() => void) | null = null;
  const cleanup = () => { offDownloaded?.(); offError?.(); offDownloaded = offError = null; };

  offDownloaded = updater.onDownloaded(async ({ version }) => {
    cleanup();
    const restart = await confirmAsync(
      t('update.ready'),
      t('update.readyBody', { version }),
      { confirmText: t('update.restart'), cancelText: t('update.notNow') }
    );
    // Declining is safe: autoInstallOnAppQuit means it lands on the next normal exit.
    if (restart) updater.install();
  });

  offError = updater.onError(({ message }) => {
    cleanup();
    console.warn('update download failed:', message);
    alertMsg(t('common.error'), t('update.failed'));
  });

  alertMsg(t('update.downloading'), t('update.downloadingBody', { version: info.latest }));
  updater.download().catch(() => { /* surfaced by the error listener above */ });
};
