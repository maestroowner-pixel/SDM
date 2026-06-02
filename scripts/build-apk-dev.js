// scripts/build-apk-dev.js
// Сборка development APK С testing screen

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
    'android.compileSdkVersion': '36',
    'android.targetSdkVersion': '36',
    'android.buildToolsVersion': '35.0.0',
    'android.kotlinVersion': '2.1.20',
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

console.log('🚀 Building development APK (WITH testing screen)...\n');

// 1. Загружаем .env.development
const envPath = path.join(__dirname, '../.env.development');
if (!fs.existsSync(envPath)) {
  console.error('❌ Файл .env.development не найден!');
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

console.log('✅ Loaded .env.development');
console.log(`   APP_MODE: ${envVars.APP_MODE}`);
console.log(`   APP_VERSION: ${envVars.APP_VERSION}`);
console.log(`   ENABLE_TESTING_SCREEN: ${envVars.ENABLE_TESTING_SCREEN}`);
console.log('');

// Проверка что ENABLE_TESTING_SCREEN = true
if (envVars.ENABLE_TESTING_SCREEN !== 'true') {
  console.error('❌ ENABLE_TESTING_SCREEN должен быть true в .env.development!');
  process.exit(1);
}

// 2. Устанавливаем переменные окружения
Object.keys(envVars).forEach(key => {
  process.env[key] = envVars[key];
});

// 3. Запускаем prebuild для dev
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

// 4. Запускаем Gradle assembleRelease (APK)
console.log('\n🔨 Building APK with Gradle...');
try {
  execSync('cd android && ./gradlew assembleRelease && cd ..', { 
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...envVars }
  });
} catch (error) {
  console.error('❌ Gradle build failed');
  process.exit(1);
}

// 5. Копируем APK
console.log('\n📋 Copying APK to outputs...');
try {
  execSync('node scripts/copy-apk.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Copy failed');
  process.exit(1);
}

console.log('\n✅ Development APK build complete (with testing screen)!');
