// scripts/build-apk.js
// Сборка preview/testing APK

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
    // versionCode и versionName не трогаем — наследуются из build.gradle (управляются через app.json + bump-version)
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


console.log('🚀 Building preview/testing APK...\n');

// 1. Загружаем .env.preview
const envPath = path.join(__dirname, '../.env.preview');
if (!fs.existsSync(envPath)) {
  console.error('❌ Файл .env.preview не найден!');
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

// Версия берётся из app.json, APP_VERSION в .env.preview игнорируется
const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'));
const version = appJson.expo?.version || '0.0.0';
const buildType = envVars.APP_VARIANT || 'preview';

console.log('✅ Loaded .env.preview');
console.log(`   APP_MODE: ${envVars.APP_MODE}`);
console.log(`   APP_VERSION: ${version} (from app.json)`);
console.log(`   ENABLE_TESTING_SCREEN: ${envVars.ENABLE_TESTING_SCREEN}`);
console.log('');

// 2. Устанавливаем переменные окружения
Object.keys(envVars).forEach(key => {
  process.env[key] = envVars[key];
});

// 3. Проверяем android/
if (!fs.existsSync(path.join(__dirname, '../android'))) {
  console.log('📦 android/ not found, running expo prebuild...');
  try {
    execSync('npx expo prebuild --platform android --clean', { 
      stdio: 'inherit',
      env: { ...process.env, ...envVars }
    });
  } catch (error) {
    console.error('❌ Prebuild failed');
    process.exit(1);
  }
} else {
  console.log('✅ android/ exists, skipping prebuild');
}

// 4. Запускаем Gradle
console.log('\n🔨 Building APK with Gradle...');

const isWindows = process.platform === 'win32';
const gradlewCmd = isWindows ? '.\\gradlew.bat' : './gradlew';

console.log(`   Platform: ${process.platform}`);
console.log(`   Using: ${gradlewCmd}`);
console.log('');

try {
  const gradlewPath = path.join(__dirname, '../android', isWindows ? 'gradlew.bat' : 'gradlew');
  if (!fs.existsSync(gradlewPath)) {
    console.error(`❌ gradlew not found at: ${gradlewPath}`);
    process.exit(1);
  }
  
  execSync(`cd android && ${gradlewCmd} assembleRelease --no-daemon && cd ..`, { 
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...envVars }
  });
} catch (error) {
  console.error('❌ Gradle build failed');
  process.exit(1);
}

// 5. Переименовываем и копируем APK
console.log('\n📋 Renaming and copying APK...');

const apkSourcePath = path.join(__dirname, '../android/app/build/outputs/apk/release/app-release.apk');
const outputsDir = path.join(__dirname, '../outputs');
const gradle4 = getGradleInfo();
const gradleVersion4 = gradle4 ? gradle4.name : version;
const gradleCode4 = gradle4 ? gradle4.code : '';
const newFileName = `SDM-v${gradleVersion4}-${gradleCode4}-${buildType}.apk`;
const apkDestPath = path.join(outputsDir, newFileName);

try {
  if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
    console.log('   ✅ Created outputs directory');
  }

  if (!fs.existsSync(apkSourcePath)) {
    console.error(`❌ APK not found at: ${apkSourcePath}`);
    process.exit(1);
  }

  fs.copyFileSync(apkSourcePath, apkDestPath);
  
  console.log('   ✅ APK renamed and copied successfully!');
  console.log(`   📦 ${newFileName}`);
  console.log(`   📁 Location: ${apkDestPath}`);
  
  const stats = fs.statSync(apkDestPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   💾 Size: ${fileSizeMB} MB`);
  
} catch (error) {
  console.error('❌ Copy/rename failed:', error.message);
  process.exit(1);
}

console.log('\n✅ Preview/testing APK build complete!');