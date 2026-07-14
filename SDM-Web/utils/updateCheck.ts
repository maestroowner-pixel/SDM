// Update check for the Windows desktop build.
//
// The same bundle also runs in a plain browser, where updates arrive by reloading the
// page — so everything here is a no-op unless the Electron preload exposed itself.
//
// We only *notify*: the release is unsigned and the portable build cannot replace itself,
// so electron-updater would buy little and make every update trip SmartScreen. The user
// is sent to the download page instead.
const REPO = 'maestroowner-pixel/SDM';
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;

/** Silent startup check runs at most once a day; a manual check always runs. */
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LAST_CHECK_KEY = 'update_last_check';

interface DesktopBridge { version: string | null }

const bridge = (): DesktopBridge | null =>
  (typeof window !== 'undefined' && (window as any).sdmDesktop) || null;

export const isDesktop = (): boolean => !!bridge();

export const currentVersion = (): string | null => bridge()?.version ?? null;

export interface UpdateInfo {
  latest: string;
  current: string;
  url: string;
}

/** -1 / 0 / 1, comparing dot-separated numeric versions ("1.2.10" > "1.2.9"). */
const compareVersions = (a: string, b: string): number => {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
};

/**
 * Resolves to the newer release, or null when up to date / not the desktop build.
 * Throws only on a failed request, so a manual check can report the problem while the
 * startup check stays silent.
 */
export const checkForUpdate = async (): Promise<UpdateInfo | null> => {
  const current = currentVersion();
  if (!current) return null;

  const res = await fetch(LATEST_API, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);

  const data = await res.json();
  const latest = String(data?.tag_name || '').replace(/^v/i, '');
  if (!latest) throw new Error('release has no tag');

  if (compareVersions(latest, current) <= 0) return null;
  return { latest, current, url: data?.html_url || RELEASES_PAGE };
};

/** Startup variant: rate-limited to once a day, and never throws. */
export const checkForUpdateSilently = async (): Promise<UpdateInfo | null> => {
  if (!isDesktop()) return null;

  const last = Number(localStorage.getItem(LAST_CHECK_KEY)) || 0;
  if (Date.now() - last < CHECK_INTERVAL_MS) return null;

  try {
    const info = await checkForUpdate();
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    return info;
  } catch (e) {
    console.warn('update check failed:', e); // offline at sea is the normal case
    return null;
  }
};

export const openDownloadPage = (url: string = RELEASES_PAGE): void => {
  // main.js sends http(s) window.open targets to the real browser.
  window.open(url, '_blank');
};
