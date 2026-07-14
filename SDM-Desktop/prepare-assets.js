// Expo's web export emits the icon fonts under `assets/node_modules/@expo/vector-icons/...`.
// electron-builder resolves `node_modules` from the dependency tree instead of copying it as
// plain files, so ANY path containing that segment is dropped from the package — the fonts
// never made it into app.asar and every icon rendered as a tofu box on the packaged app.
// Adding an explicit `files` glob does not help; the filter runs before the globs.
//
// So rename the segment out of the way and repoint the bundle at it. Runs after `expo export`
// has been copied into ./app.
const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, 'app');
const FROM = path.join(APP_DIR, 'assets', 'node_modules');
const TO = path.join(APP_DIR, 'assets', 'vendor');
const OLD_REF = 'assets/node_modules/';
const NEW_REF = 'assets/vendor/';

if (!fs.existsSync(FROM)) {
  console.log('prepare-assets: no assets/node_modules — nothing to do');
  process.exit(0);
}

fs.rmSync(TO, { recursive: true, force: true });
fs.renameSync(FROM, TO);

const TEXT = new Set(['.js', '.html', '.json', '.css', '.map']);
let patched = 0;

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!TEXT.has(path.extname(entry.name))) continue;

    const src = fs.readFileSync(full, 'utf8');
    if (!src.includes(OLD_REF)) continue;
    fs.writeFileSync(full, src.split(OLD_REF).join(NEW_REF));
    patched++;
  }
};

walk(APP_DIR);
console.log(`prepare-assets: fonts moved to assets/vendor, ${patched} file(s) repointed`);
