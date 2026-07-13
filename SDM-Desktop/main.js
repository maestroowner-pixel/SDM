// Electron shell around the SDM Web build.
//
// The Expo web export references assets with absolute paths (/_expo/..., /favicon.ico),
// which break under file://. So we serve the built app from a custom privileged
// `app://` scheme — that resolves absolute paths correctly and gives the page a
// real origin, which localStorage / IndexedDB (attachments) / Firebase need.
const { app, BrowserWindow, shell, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const APP_DIR = path.join(__dirname, 'app'); // built web assets (copied from SDM-Web/dist)

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

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
