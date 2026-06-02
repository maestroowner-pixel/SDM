// scripts/build-aab.js
// Простой скрипт для сборки production AAB
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── Патч ключей (аналог google-key-run.js, только патч без пребилда) ────────
function applyKeyPatch() {
  const GRADLE_PROPERTIES = path.join(__dirname, '../android/gradle.properties');
  const BUILD_GRADLE = path.join(__dirname, '../android/app/build.gradle');
  const KEYSTORE = {
    file: '../../@osypov_m__seafarer-docs.jks',
    keyAlias: process.env.MYAPP_UPLOAD_KEY_ALIAS || '',
    storePassword: process.env.MYAPP_UPLOAD_STORE_PASSWORD || '',
    keyPassword: process.env.MYAPP_UPLOAD_KEY_PASSWORD || '',
  };
  const CUSTOM_PROPS = {
    'org.gradle.jvmargs': '-Xmx6G -XX:MaxMetaspaceSize=1G',
    'kotlin.daemon.jvm.options': '-Xmx4g',
    'org.gradle.parallel': 'true',
    'reactNativeArchitectures': 'armeabi-v7a,arm64-v8a',
    'newArchEnabled': 'true',
    'hermesEnabled': 'true',
    'edgeToEdgeEnabled': 'true',
    'expo.gif.enabled': 'true',
    'expo.webp.enabled': 'true',
    'expo.webp.animated': 'false',
    'EX_DEV_CLIENT_NETWORK_INSPECTOR': 'true',
    'expo.useLegacyPackaging': 'false',
    'expo.edgeToEdgeEnabled': 'true',
    'android.compileSdkVersion': '35',
    'android.targetSdkVersion': '35',
    'android.buildToolsVersion': '35.0.0',
    'android.kotlinVersion': '2.0.21',
    'MYAPP_UPLOAD_STORE_FILE': KEYSTORE.file,
    'MYAPP_UPLOAD_KEY_ALIAS': KEYSTORE.keyAlias,
    'MYAPP_UPLOAD_STORE_PASSWORD': KEYSTORE.storePassword,
    'MYAPP_UPLOAD_KEY_PASSWORD': KEYSTORE.keyPassword,
  };
  if (fs.existsSync(GRADLE_PROPERTIES)) {
    let props = fs.readFileSync(GRADLE_PROPERTIES, 'utf8');
    for (const [key, value] of Object.entries(CUSTOM_PROPS)) {
      const regex = new RegExp(`^${key.replace(/\./g, '\\.')}=.*$`, 'm');
      props = regex.test(props) ? props.replace(regex, `${key}=${value}`) : props + `\n${key}=${value}`;
    }
    fs.writeFileSync(GRADLE_PROPERTIES, props);
    console.log('   ✅ gradle.properties patched');
  }
  if (fs.existsSync(BUILD_GRADLE)) {
    let gradle = fs.readFileSync(BUILD_GRADLE, 'utf8');
    gradle = gradle.replace(/namespace\s+'seafarer\.documents\.manager\.development'/, "namespace 'seafarer.documents.manager'");
    gradle = gradle.replace(/applicationId\s+'seafarer\.documents\.manager\.development'/, "applicationId 'seafarer.documents.manager'");
    gradle = gradle.replace(/versionCode\s+\d+/, 'versionCode 30104');
    if (!gradle.includes('MYAPP_UPLOAD_STORE_FILE')) {
      gradle = gradle.replace(
        /signingConfigs \{([\s\S]*?debug \{[\s\S]*?\})\s*\}/,
        (m, d) => `signingConfigs {${d}\n        release {\n            storeFile file(MYAPP_UPLOAD_STORE_FILE)\n            storePassword MYAPP_UPLOAD_STORE_PASSWORD\n            keyAlias MYAPP_UPLOAD_KEY_ALIAS\n            keyPassword MYAPP_UPLOAD_KEY_PASSWORD\n        }\n    }`
      );
    }
    gradle = gradle.replace(/(buildTypes[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.\w+/, (m, p) => `${p}signingConfig signingConfigs.release`);
    gradle = gradle.replace(/(buildTypes[\s\S]*?debug\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.\w+/, (m, p) => `${p}signingConfig signingConfigs.release`);
    fs.writeFileSync(BUILD_GRADLE, gradle);
    console.log('   ✅ build.gradle patched (signing + namespace)');
  }
}

// Читаем versionName и versionCode из build.gradle
function getGradleInfo() {
  const gradlePath = require('path').join(__dirname, '../android/app/build.gradle');
  if (!fs.existsSync(gradlePath)) return null;
  const content = fs.readFileSync(gradlePath, 'utf8');
  const nameMatch = content.match(/versionName\s+"([^"]+)"/);
  const codeMatch = content.match(/versionCode\s+(\d+)/);
  if (nameMatch && codeMatch) return { name: nameMatch[1], code: codeMatch[1] };
  return null;
}


console.log('🚀 Starting production AAB build...\n');

// 1. Загружаем .env.production
const envPath = path.join(__dirname, '../.env.production');
if (!fs.existsSync(envPath)) {
  console.error('❌ Файл .env.production не найден!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

console.log('✅ Loaded .env.production');
console.log(`   APP_MODE: ${envVars.APP_MODE}`);
console.log(`   APP_VERSION: ${envVars.APP_VERSION}`);
console.log(`   ENABLE_TESTING_SCREEN: ${envVars.ENABLE_TESTING_SCREEN}`);
console.log('');

// 2. Устанавливаем переменные окружения
Object.keys(envVars).forEach(key => {
  process.env[key] = envVars[key];
});

// 3. Запускаем prebuild
console.log('📦 Running expo prebuild...');
try {
  execSync('npx expo prebuild --platform android --clean', { 
    stdio: 'inherit',
    env: { ...process.env, ...envVars }
  });
} catch (error) {
  console.error('❌ Prebuild failed');
  process.exit(1);
}

// 3.5. Исправляем build.gradle для production keystore
console.log('\n🔧 Configuring production keystore...');
try {
  applyKeyPatch();
} catch (error) {
  console.error('❌ Gradle config failed');
  process.exit(1);
}

// 4. Запускаем Gradle
console.log('\n🔨 Building AAB with Gradle...');
try {
  execSync('cd android && ./gradlew bundleRelease && cd ..', { 
    stdio: 'inherit',
    shell: true
  });
} catch (error) {
  console.error('❌ Gradle build failed');
  process.exit(1);
}

// 5. Копируем AAB
console.log('\n📋 Copying AAB to outputs...');
try {
  execSync('node scripts/copy-aab.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Copy failed');
  process.exit(1);
}

// Переименовываем AAB согласно build.gradle
const aabSrc = path.join(__dirname, '../android/app/build/outputs/bundle/release/app-release.aab');
const outputsDir2 = path.join(__dirname, '../outputs');
if (fs.existsSync(aabSrc)) {
  const gradle2 = getGradleInfo();
  const gVer = gradle2 ? gradle2.name : (envVars.APP_VERSION || '0.0.0');
  const gCode = gradle2 ? gradle2.code : '';
  const buildType2 = envVars.APP_VARIANT || 'preview';
  const renamed = `SDM-v${gVer}-${gCode}-${buildType2}.aab`;
  if (!fs.existsSync(outputsDir2)) fs.mkdirSync(outputsDir2, { recursive: true });
  fs.copyFileSync(aabSrc, path.join(outputsDir2, renamed));
  console.log('\n📁 Renamed → ' + renamed);
}

console.log('\n✅ Production AAB build complete!');
const buildType = envVars.APP_VARIANT || 'preview'; // preview, testing, dev
const newFileName = `seafarer-documents-manager-${version}-${buildType}.aab`;