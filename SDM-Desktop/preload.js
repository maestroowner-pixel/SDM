// Minimal bridge: the page is the same bundle that runs in a browser, so it needs a way to
// tell it is the desktop build, which version it is, and how to drive updates. The renderer
// owns the prompts (branded dialogs); the main process owns download and install.
//
// contextIsolation stays on and nothing else is exposed. The version arrives as a
// command-line argument (see `additionalArguments` in main.js) rather than over IPC, so it
// is available synchronously at first paint.
const { contextBridge, ipcRenderer } = require('electron');

const arg = process.argv.find((a) => a.startsWith('--sdm-version='));

/** Subscribes to a main→renderer event; returns an unsubscribe fn. */
const on = (channel) => (cb) => {
  const handler = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('sdmDesktop', {
  version: arg ? arg.slice('--sdm-version='.length) : null,
  updater: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    onProgress: on('update:progress'),
    onDownloaded: on('update:downloaded'),
    onError: on('update:error'),
  },
});
