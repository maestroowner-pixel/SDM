// Minimal bridge: the page is the same bundle that runs in a browser, so it needs a
// way to tell it is the desktop build and which version it is — that's all the update
// check needs. contextIsolation stays on; nothing else is exposed.
//
// The version arrives as a command-line argument (see `additionalArguments` in main.js)
// rather than over IPC, so it is available synchronously at first paint.
const { contextBridge } = require('electron');

const arg = process.argv.find((a) => a.startsWith('--sdm-version='));

contextBridge.exposeInMainWorld('sdmDesktop', {
  version: arg ? arg.slice('--sdm-version='.length) : null,
});
