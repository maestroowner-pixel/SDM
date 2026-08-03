// Electron shell around the SDM Web build.
//
// The Expo web export references assets with absolute paths (/_expo/..., /favicon.ico),
// which break under file://. So we serve the built app from a custom privileged
// `app://` scheme — that resolves absolute paths correctly and gives the page a
// real origin, which localStorage / IndexedDB (attachments) / Firebase need.
const { app, BrowserWindow, shell, protocol, net, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs/promises');
const { pathToFileURL } = require('url');

const APP_DIR = path.join(__dirname, 'app'); // built web assets (copied from SDM-Web/dist)

// Updates are driven from the renderer so the prompts are the app's own branded dialogs
// rather than OS message boxes. Nothing downloads or installs without the user saying so.
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Unpacked dev runs have no update metadata — checkForUpdates() would throw.
const updatesSupported = () => app.isPackaged;

function wireUpdater(win) {
  const send = (channel, payload) => {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  };

  autoUpdater.on('download-progress', (p) => send('update:progress', { percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', (info) => send('update:downloaded', { version: info.version }));
  autoUpdater.on('error', (err) => {
    console.error('[updater]', err);
    send('update:error', { message: String(err && err.message ? err.message : err) });
  });

  ipcMain.handle('update:check', async () => {
    if (!updatesSupported()) return { supported: false, available: false };
    const result = await autoUpdater.checkForUpdates();
    const version = result && result.updateInfo ? result.updateInfo.version : null;
    // checkForUpdates() resolves for "no update" too — compare to know which it was.
    const available = !!version && version !== app.getVersion();
    return { supported: true, available, version, current: app.getVersion() };
  });

  ipcMain.handle('update:download', async () => { await autoUpdater.downloadUpdate(); });
  ipcMain.handle('update:install', () => { autoUpdater.quitAndInstall(); });
}

// ── Печать ───────────────────────────────────────────────────────────────────
//
// В браузере документы (CV, QR-лист, confirmation letter) печатаются через скрытый
// iframe и window.print(). В Electron это не работает: window.print() уходит в
// webContents верхнего фрейма, то есть в интерфейс приложения, а не в iframe с
// документом. Поэтому здесь HTML рендерится в отдельном невидимом окне, и уже с
// него снимается либо PDF, либо системный диалог печати.

/** Рендерит HTML в скрытом окне и отдаёт его webContents в fn. Окно всегда закрывается. */
async function withRenderedPage(html, fn) {
  const tmp = path.join(app.getPath('temp'), `sdm-print-${Date.now()}.html`);
  await fs.writeFile(tmp, html, 'utf8');

  const win = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, javascript: false },
  });

  try {
    await win.loadFile(tmp);
    return await fn(win.webContents);
  } finally {
    if (!win.isDestroyed()) win.destroy();
    fs.unlink(tmp).catch(() => {});
  }
}

// preferCSSPageSize — чтобы @page { size: A4; margin: … } из самого документа
// побеждал: вёрстка писем рассчитана именно на эти поля.
const PDF_OPTIONS = { printBackground: true, preferCSSPageSize: true };

function wirePrinting() {
  ipcMain.handle('print:pdf', async (event, { html, fileName }) => {
    const parent = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(parent, {
      defaultPath: `${fileName || 'document'}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (canceled || !filePath) return { saved: false };

    const pdf = await withRenderedPage(html, (wc) => wc.printToPDF(PDF_OPTIONS));
    await fs.writeFile(filePath, pdf);
    return { saved: true, path: filePath };
  });

  ipcMain.handle('print:printer', async (_event, { html }) =>
    withRenderedPage(
      html,
      (wc) =>
        new Promise((resolve) => {
          // silent: false → системный диалог выбора принтера.
          wc.print({ silent: false, printBackground: true }, (success, reason) =>
            resolve({ printed: success, reason: success ? undefined : reason })
          );
        })
    )
  );
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0a1628',
    title: 'Seafarer Documents Manager',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [`--sdm-version=${app.getVersion()}`],
    },
  });

  // Surface renderer errors in the terminal — without this the only place they
  // show up is DevTools, which makes diagnosing a packaged build painful.
  win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    if (level >= 2) console.error(`[renderer] ${message}  (${sourceId}:${line})`);
  });
  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[load-failed] ${code} ${desc} → ${url}`);
  });
  win.webContents.session.webRequest.onErrorOccurred(({ url, error }) => {
    if (!/net::ERR_ABORTED/.test(error)) console.error(`[net] ${error} → ${url}`);
  });

  wireUpdater(win);
  win.loadURL('app://local/index.html');

  // External links (Lemon Squeezy checkout, website, policies) go to the real
  // browser. blob: URLs (attachment preview / generated PDFs) open in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  protocol.handle('app', async (request) => {
    const { pathname } = new URL(request.url);
    let rel = decodeURIComponent(pathname);
    if (!rel || rel === '/') rel = '/index.html';

    // Keep everything inside APP_DIR.
    const filePath = path.normalize(path.join(APP_DIR, rel));
    if (!filePath.startsWith(APP_DIR)) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      return await net.fetch(pathToFileURL(filePath).toString());
    } catch {
      // Single-page app: unknown routes fall back to index.html
      return net.fetch(pathToFileURL(path.join(APP_DIR, 'index.html')).toString());
    }
  });

  wirePrinting();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
