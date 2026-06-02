#!/usr/bin/env node
/**
 * menu-server.js
 * Запускает HTTP + WebSocket сервер для веб-интерфейса build-menu
 * Использование: node menu-server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { execSync } = require('child_process');

const PORT = 7420;
const PROJECT_DIR = __dirname;
const ANDROID_DIR = path.join(PROJECT_DIR, 'android');

// ─── Простой WebSocket сервер (без зависимостей) ──────────────────────────────
function createWsServer(httpServer) {
  const clients = new Set();

  httpServer.on('upgrade', (req, socket) => {
    if (req.headers['upgrade'] !== 'websocket') { socket.destroy(); return; }

    const key = req.headers['sec-websocket-key'];
    const accept = require('crypto')
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );

    socket.on('data', (buf) => {
      try {
        const msg = decodeWsFrame(buf);
        if (msg) handleMessage(JSON.parse(msg), socket);
      } catch (e) {}
    });

    socket.on('close', () => clients.delete(socket));
    socket.on('error', () => clients.delete(socket));
    clients.add(socket);
  });

  function broadcast(data) {
    const frame = encodeWsFrame(JSON.stringify(data));
    for (const client of clients) {
      try { client.write(frame); } catch (e) { clients.delete(client); }
    }
  }

  function sendTo(socket, data) {
    try { socket.write(encodeWsFrame(JSON.stringify(data))); } catch (e) {}
  }

  return { broadcast, sendTo, clients };
}

function decodeWsFrame(buf) {
  if (buf.length < 6) return null;
  const masked = (buf[1] & 0x80) !== 0;
  let len = buf[1] & 0x7f;
  let offset = 2;
  if (len === 126) { len = buf.readUInt16BE(2); offset = 4; }
  else if (len === 127) { len = buf.readUInt32BE(6); offset = 10; }
  if (!masked) return buf.slice(offset, offset + len).toString();
  const mask = buf.slice(offset, offset + 4);
  const payload = buf.slice(offset + 4, offset + 4 + len);
  for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
  return payload.toString();
}

function encodeWsFrame(data) {
  const payload = Buffer.from(data, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81; header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81; header[1] = 127;
    header.writeUInt32BE(0, 2); header.writeUInt32BE(len, 6);
  }
  return Buffer.concat([header, payload]);
}

// ─── Активный процесс ─────────────────────────────────────────────────────────
let activeProcess = null;

function runCommand(cmdStr, ws, broadcast) {
  if (activeProcess) {
    broadcast({ type: 'output', text: '\r\n⚠️  Уже выполняется команда. Дождитесь завершения.\r\n', class: 'warn' });
    return;
  }

  broadcast({ type: 'output', text: `\r\n$ ${cmdStr}\r\n`, class: 'cmd' });
  broadcast({ type: 'running', value: true });

  const child = spawn('bash', ['-c', cmdStr], {
    cwd: PROJECT_DIR,
    env: { ...process.env, FORCE_COLOR: '1', TERM: 'xterm-256color' },
  });

  activeProcess = child;

  child.stdout.on('data', (d) => broadcast({ type: 'output', text: d.toString() }));
  child.stderr.on('data', (d) => broadcast({ type: 'output', text: d.toString(), class: 'err' }));

  child.on('close', (code) => {
    activeProcess = null;
    broadcast({ type: 'output', text: `\r\n[exit ${code}]\r\n`, class: code === 0 ? 'ok' : 'err' });
    broadcast({ type: 'running', value: false });
    broadcast({ type: 'refresh_version' });
  });
}

function killActive(broadcast) {
  if (activeProcess) {
    activeProcess.kill('SIGTERM');
    broadcast({ type: 'output', text: '\r\n⛔ Процесс остановлен\r\n', class: 'warn' });
  }
}

// ─── Версия из gradle ─────────────────────────────────────────────────────────
function getVersion() {
  try {
    const p = path.join(ANDROID_DIR, 'app', 'build.gradle');
    if (!fs.existsSync(p)) return null;
    const c = fs.readFileSync(p, 'utf8');
    const name = (c.match(/versionName\s+"([^"]+)"/) || [])[1];
    const code = (c.match(/versionCode\s+(\d+)/) || [])[1];
    return name && code ? { name, code } : null;
  } catch (e) { return null; }
}

function getEnvMode() {
  try {
    const p = path.join(PROJECT_DIR, '.env');
    if (!fs.existsSync(p)) return null;
    const c = fs.readFileSync(p, 'utf8');
    return (c.match(/APP_VARIANT=(\w+)/) || [])[1] || null;
  } catch (e) { return null; }
}

// ─── Обработка WS сообщений ───────────────────────────────────────────────────
function handleMessage(msg, socket) {
  if (msg.type === 'run') {
    runCommand(msg.cmd, socket, ws.broadcast);
  } else if (msg.type === 'kill') {
    killActive(ws.broadcast);
  } else if (msg.type === 'get_status') {
    ws.sendTo(socket, {
      type: 'status',
      version: getVersion(),
      mode: getEnvMode(),
      running: !!activeProcess,
    });
  } else if (msg.type === 'clear') {
    ws.broadcast({ type: 'clear' });
  }
}

// ─── HTTP сервер ──────────────────────────────────────────────────────────────
const httpServer = http.createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ version: getVersion(), mode: getEnvMode(), running: !!activeProcess }));
    return;
  }

  // Отдаём menu-ui.html
  const uiPath = path.join(PROJECT_DIR, 'menu-ui.html');
  if (fs.existsSync(uiPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(uiPath));
  } else {
    res.writeHead(404);
    res.end('menu-ui.html not found');
  }
});

const ws = createWsServer(httpServer);

httpServer.listen(PORT, '127.0.0.1', () => {
  console.log(`\n╔════════════════════════════════════╗`);
  console.log(`║   SDM Build Menu — Web Interface   ║`);
  console.log(`╠════════════════════════════════════╣`);
  console.log(`║  http://localhost:${PORT}           ║`);
  console.log(`╚════════════════════════════════════╝\n`);

  // Открыть браузер автоматически на macOS
  try { execSync(`open http://localhost:${PORT}`); } catch (e) {}
});
