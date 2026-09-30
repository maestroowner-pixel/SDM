// Finds the AAB/APK Gradle just built and copies it to outputs/.
//
// Gradle names it SDM-v<ver>-<code>-<date>-release.<ext> (see
// plugins/android-artifact-name.js), so there is no fixed file name to look for:
// take the newest signed file in the release output folder. In outputs/ the
// "release" suffix is replaced by the build flavor (production / preview / dev).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function findBuiltArtifact(ext) {
  const dir = path.join(ROOT, 'android/app/build/outputs', ext === 'aab' ? 'bundle' : 'apk', 'release');
  if (!fs.existsSync(dir)) return null;
  const newest = fs.readdirSync(dir)
    .filter((f) => f.endsWith(`.${ext}`) && !f.includes('unsigned'))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0];
  return newest ? path.join(dir, newest.f) : null;
}

function copyArtifactToOutputs(ext, flavor) {
  const src = findBuiltArtifact(ext);
  if (!src) throw new Error(`No .${ext} found in android/app/build/outputs — did the Gradle build run?`);
  const outputsDir = path.join(ROOT, 'outputs');
  fs.mkdirSync(outputsDir, { recursive: true });
  const name = path.basename(src).replace(/-release(\.\w+)$/, `-${flavor}$1`);
  const dest = path.join(outputsDir, name);
  fs.copyFileSync(src, dest);
  const sizeMB = (fs.statSync(dest).size / (1024 * 1024)).toFixed(2);
  console.log(`   📦 ${name} (${sizeMB} MB)`);
  console.log(`   📁 ${dest}`);
  return dest;
}

module.exports = { findBuiltArtifact, copyArtifactToOutputs };
