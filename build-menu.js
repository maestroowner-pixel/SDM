// build-menu.js
const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Цвета для консоли Вашей светлости
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};


function getGradleVersion() {
  try {
    const gradlePath = path.join(__dirname, 'android/app/build.gradle');
    if (!fs.existsSync(gradlePath)) return null;
    const content = fs.readFileSync(gradlePath, 'utf8');
    const nameMatch = content.match(/versionName\s+"([^"]+)"/);
    const codeMatch = content.match(/versionCode\s+(\d+)/);
    if (nameMatch && codeMatch) return { name: nameMatch[1], code: codeMatch[1] };
  } catch (e) {}
  return null;
}
function printHeader() {
  console.clear();
  console.log(colors.cyan + '═'.repeat(60) + colors.reset);
  console.log(colors.bright + '          SDM BUILD & VERSION MANAGEMENT MENU' + colors.reset);
  console.log(colors.cyan + '═'.repeat(60) + colors.reset);
  console.log('');
}

function printMenu() {
  printHeader();
  
  try {
    const envPath = path.join(__dirname, '.env.production');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/APP_VERSION=(\d+\.\d+\.\d+)/);
      if (match) {
        console.log(colors.green + `📦 Current Version: ${match[1]}` + colors.reset);
      }
    }
    
    const envFile = path.join(__dirname, '.env');
    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, 'utf8');
      const variant = envContent.match(/APP_VARIANT=(\w+)/);
      if (variant) {
        const mode = variant[1] === 'production' ? '🟢 PRODUCTION' : '🟡 PREVIEW/DEV';
        console.log(colors.yellow + `Mode: ${mode}` + colors.reset);
      }
    }
    const gradle = getGradleVersion();
    if (gradle) {
      console.log(colors.magenta + `🔢 build.gradle: v${gradle.name} (versionCode: ${gradle.code})` + colors.reset);
    }
    console.log('');
  } catch (err) { /* ignore */ }
  
  console.log(colors.yellow + '📋 VERSION MANAGEMENT:' + colors.reset);
  console.log('  1. Bump version (patch +1)');
  console.log('  2. Set specific version');
  console.log('  3. Show current versions');
  console.log('');
  
  console.log(colors.yellow + '🏗️  PRODUCTION BUILDS (ANDROID):' + colors.reset);
  console.log('  4. Build AAB (Production) - Google Play');
  console.log('  5. Build APK (Production) - Direct install');
  console.log('');

  console.log(colors.blue + '🍎 APPLE APP STORE (iOS):' + colors.reset);
  console.log('  19. Build & Submit to TestFlight/App Store (EAS)');
  console.log('  20. Build iOS Archive local (Xcode required)');
  console.log('');
  
  console.log(colors.yellow + '🧪 DEVELOPMENT/TESTING BUILDS:' + colors.reset);
  console.log('  6. Build APK (Development)');
  console.log('  7. Build APK (Testing/Preview)');
  console.log('  8. Build AAB (Testing/Preview)');
  console.log('');
  
  console.log(colors.yellow + '🔧 DEVELOPMENT & KEYS:' + colors.reset);
  console.log('  9. Run on Android device (dev mode)');
  console.log('  10. Clean Android build');
  console.log('  11. Clean outputs folder');
  console.log('  12. Install dependencies');
  console.log(colors.magenta + '  13. CHECK GOOGLE KEYS (SHA1)' + colors.reset);
  console.log('');
  
  console.log(colors.yellow + '📝 ENVIRONMENT:' + colors.reset);
  console.log('  14. Switch to Preview mode');
  console.log('  15. Switch to Production mode');
  console.log('  16. Show current environment');
  console.log('');
  
  console.log(colors.yellow + '🚀 QUICK ACTIONS:' + colors.reset);
  console.log('  17. Release (bump + build AAB)');
  console.log('  18. Submit to Google Play');
  console.log('');
  
  console.log(colors.red + '  0. Exit' + colors.reset);
  console.log('');
  console.log(colors.cyan + '═'.repeat(60) + colors.reset);
}

async function executeCommand(command, description) {
  console.log('');
  console.log(colors.cyan + '►' + colors.reset + ' ' + description);
  console.log(colors.cyan + '═'.repeat(60) + colors.reset);
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log('');
    console.log(colors.green + '✅ Success!' + colors.reset);
  } catch (error) {
    console.log('');
    console.log(colors.red + '❌ Error executing command' + colors.reset);
  }
  
  return new Promise((resolve) => {
    rl.question('\n' + colors.yellow + 'Press Enter to continue...' + colors.reset, () => resolve());
  });
}


async function buildAndRename(buildCmd, ext, flavor) {
  const gradle = getGradleVersion();
  const label = gradle ? `v${gradle.name}-${gradle.code}` : 'unknown';
  const desc = ext === 'aab' ? `Building AAB (${flavor})` : `Building APK (${flavor})`;
  await executeCommand(buildCmd, desc);

  // Ищем свежесобранный файл
  const outputDirs = [
    path.join(__dirname, `android/app/build/outputs/${ext === 'aab' ? 'bundle' : 'apk'}`),
    path.join(__dirname, `outputs`),
  ];
  const patterns = ext === 'aab'
    ? ['app-release.aab', 'app-production-release.aab']
    : ['app-release.apk', 'app-production-release.apk', 'app-release-unsigned.apk'];

  let found = null;
  for (const dir of outputDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const p of patterns) {
      const candidate = path.join(dir, p);
      if (fs.existsSync(candidate)) { found = candidate; break; }
    }
    if (!found) {
      // fallback: самый свежий .ext в папке
      try {
        const files = fs.readdirSync(dir)
          .filter(f => f.endsWith('.' + ext))
          .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
          .sort((a, b) => b.t - a.t);
        if (files.length) found = path.join(dir, files[0].f);
      } catch (e) {}
    }
    if (found) break;
  }

  if (found) {
    const newName = `SDM-${label}-${flavor}.${ext}`;
    const dest = path.join(path.dirname(found), newName);
    fs.renameSync(found, dest);
    console.log(colors.green + `
📁 Renamed → ${newName}` + colors.reset);
    console.log(colors.cyan + `   Path: ${dest}` + colors.reset);
  } else {
    console.log(colors.yellow + `
⚠️  Could not find output file to rename` + colors.reset);
  }
}
async function handleChoice(choice) {
  switch(choice) {
    case '1': await executeCommand('npm run bump', 'Bumping version'); break;
    case '2':
      const ver = await new Promise(r => rl.question(colors.yellow + 'Version: ' + colors.reset, r));
      if (ver) await executeCommand(`npm run set:version ${ver}`, `Setting version to ${ver}`);
      break;
    case '3': await executeCommand('npm run check:structure', 'Checking versions'); break;
    case '4': await buildAndRename('npm run build:aab:production', 'aab', 'production'); break;
    case '5': await buildAndRename('npm run build:apk:production', 'apk', 'production'); break;
    case '6': await executeCommand('npm run build:apk:dev', 'Building APK Dev'); break;
    case '7': await buildAndRename('npm run build:apk', 'apk', 'preview'); break;
    case '8': await buildAndRename('npm run build:aab', 'aab', 'preview'); break;
    case '9': await executeCommand('npm run android', 'Running on device'); break;
    case '10': await executeCommand('npm run clean:android', 'Cleaning Android'); break;
    case '11': await executeCommand('npm run clean:outputs', 'Cleaning outputs'); break;
    case '12': await executeCommand('npm install', 'Installing dependencies'); break;
    
    case '13':
      console.log(colors.magenta + '🔍 Сверка цифровых отпечатков...' + colors.reset);
      const keyCmd = 'keytool -list -v -keystore @osypov_m__seafarer-docs.jks -alias $MYAPP_UPLOAD_KEY_ALIAS -storepass $MYAPP_UPLOAD_STORE_PASSWORD -keypass $MYAPP_UPLOAD_KEY_PASSWORD';
      await executeCommand(keyCmd, 'Checking SHA1/SHA256 Fingerprints');
      break;

    case '14': await executeCommand('npm run env:preview', 'Switching to Preview'); break;
    case '15': await executeCommand('npm run env:production', 'Switching to Production'); break;
    case '16': await executeCommand('npm run env:show', 'Showing Environment'); break;
    
    case '17':
      const conf = await new Promise(r => rl.question(colors.yellow + 'Start Release? (y/n): ' + colors.reset, r));
      if (conf.toLowerCase() === 'y') await executeCommand('npm run release', 'Releasing');
      break;
    case '18': await executeCommand('npm run submit:production', 'Submitting to Google'); break;

    case '19': 
      const iosConf = await new Promise(r => rl.question(colors.yellow + 'Submit to Apple Store? (y/n): ' + colors.reset, r));
      if (iosConf.toLowerCase() === 'y') {
        await executeCommand('npx eas build --platform ios --auto-submit', 'Building and Submitting to iOS App Store');
      }
      break;

    case '20':
      await executeCommand('npx expo run:ios --configuration Release', 'Building local iOS Release');
      break;

    case '0': console.log('Goodbye! 👋'); rl.close(); process.exit(0); break;
    default: console.log(colors.red + '❌ Invalid choice!' + colors.reset);
  }
}

async function main() {
  while (true) {
    printMenu();
    const choice = await new Promise(r => rl.question(colors.bright + 'Select option: ' + colors.reset, r));
    await handleChoice(choice.trim());
  }
}

process.on('SIGINT', () => { console.log('\nGoodbye! 👋'); process.exit(0); });
main().catch(err => process.exit(1));