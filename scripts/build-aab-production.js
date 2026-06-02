// scripts/build-aab-production.js
// Сборка ЧИСТОГО production AAB БЕЗ testing screen

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


console.log('🚀 Building CLEAN production AAB (no testing screen)...\n');

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

// Получаем версию
const version = envVars.APP_VERSION || '0.0.0';

// Проверка что ENABLE_TESTING_SCREEN = false
if (envVars.ENABLE_TESTING_SCREEN !== 'false') {
  console.error('❌ ENABLE_TESTING_SCREEN должен быть false в .env.production!');
  process.exit(1);
}

// 2. Устанавливаем переменные окружения
Object.keys(envVars).forEach(key => {
  process.env[key] = envVars[key];
});

// КРИТИЧНО: Устанавливаем APP_MODE, APP_VARIANT и NODE_ENV ПЕРЕД prebuild
process.env.APP_MODE = 'production';
process.env.APP_VARIANT = 'production';  // ← ИСПРАВЛЕНИЕ: добавлена установка APP_VARIANT
process.env.NODE_ENV = 'production';
console.log(`🔧 APP_MODE set to: ${process.env.APP_MODE}`);
console.log(`🔧 APP_VARIANT set to: ${process.env.APP_VARIANT}`);
console.log(`🔧 NODE_ENV set to: ${process.env.NODE_ENV}`);
console.log('');

// 3. Проверяем что android/ существует
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
  
  // Проверяем package name в AndroidManifest после prebuild
  console.log('\n🔍 Verifying package name...');
  const manifestPath = path.join(__dirname, '../android/app/src/main/AndroidManifest.xml');
  if (fs.existsSync(manifestPath)) {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const packageMatch = manifestContent.match(/package="([^"]+)"/);
    if (packageMatch) {
      console.log(`   ✅ Package name: ${packageMatch[1]}`);
      if (packageMatch[1] !== 'seafarer.documents.manager') {
        console.error(`   ❌ ERROR: Expected 'seafarer.documents.manager' but got '${packageMatch[1]}'`);
        process.exit(1);
      }
    } else {
      console.warn('   ⚠️  Package name not found in AndroidManifest.xml');
    }
  }
  
  // Создаём colors.xml после prebuild
  console.log('\n🎨 Creating colors.xml...');
  const colorsPath = path.join(__dirname, '../android/app/src/main/res/values/colors.xml');
  const colorsDir = path.dirname(colorsPath);
  
  if (!fs.existsSync(colorsDir)) {
    fs.mkdirSync(colorsDir, { recursive: true });
  }
  
  const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="iconBackground">#1976d2</color>
</resources>`;
  
  fs.writeFileSync(colorsPath, colorsXml, 'utf8');
  console.log('   ✅ colors.xml created');
  
  // Исправляем build.gradle после prebuild
  console.log('\n🔧 Configuring production keystore...');
  try {
    applyKeyPatch();
  } catch (error) {
    console.error('❌ Gradle config failed');
    process.exit(1);
  }
} else {
  console.log('✅ android/ exists, skipping prebuild');
  
  // Проверяем package name даже если android/ существует
  console.log('\n🔍 Verifying package name in existing android/...');
  const manifestPath = path.join(__dirname, '../android/app/src/main/AndroidManifest.xml');
  if (fs.existsSync(manifestPath)) {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const packageMatch = manifestContent.match(/package="([^"]+)"/);
    if (packageMatch) {
      console.log(`   📦 Current package name: ${packageMatch[1]}`);
      if (packageMatch[1] !== 'seafarer.documents.manager') {
        console.error(`   ❌ ERROR: Package name is '${packageMatch[1]}' instead of 'seafarer.documents.manager'`);
        console.error('   💡 Run: rm -rf android && npm run build:aab:production');
        process.exit(1);
      } else {
        console.log('   ✅ Package name is correct!');
      }
    }
  }
  
  // Проверяем что colors.xml существует
  const colorsPath = path.join(__dirname, '../android/app/src/main/res/values/colors.xml');
  if (!fs.existsSync(colorsPath)) {
    console.log('⚠️  colors.xml not found, creating...');
    const colorsDir = path.dirname(colorsPath);
    
    if (!fs.existsSync(colorsDir)) {
      fs.mkdirSync(colorsDir, { recursive: true });
    }
    
    const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="iconBackground">#1976d2</color>
</resources>`;
    
    fs.writeFileSync(colorsPath, colorsXml, 'utf8');
    console.log('   ✅ colors.xml created');
  }
  
  // Проверяем что build.gradle правильный
  const gradlePath = path.join(__dirname, '../android/app/build.gradle');
  const gradleContent = fs.readFileSync(gradlePath, 'utf8');
  
  if (!gradleContent.includes("storeFile file('../../@osypov_m__seafarer-docs.jks')")) {
    console.log('⚠️  build.gradle needs fixing...');
    try {
      applyKeyPatch();
    } catch (error) {
      console.error('❌ Gradle config failed');
      process.exit(1);
    }
  }
}

// 4. Запускаем Gradle bundleRelease (БЕЗ clean!)
console.log('\n🔨 Building AAB with Gradle...');

const isWindows = process.platform === 'win32';
const gradlewCmd = isWindows ? '.\\gradlew.bat' : './gradlew';

console.log(`   Platform: ${process.platform}`);
console.log(`   Using: ${gradlewCmd}`);
console.log('');

try {
  const gradlewPath = path.join(__dirname, '../android', isWindows ? 'gradlew.bat' : 'gradlew');
  if (!fs.existsSync(gradlewPath)) {
    console.error(`❌ gradlew not found at: ${gradlewPath}`);
    console.error('   Run: cd android && gradle wrapper');
    process.exit(1);
  }
  
  execSync(`cd android && ${gradlewCmd} bundleRelease --no-daemon && cd ..`, { 
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...envVars }
  });
} catch (error) {
  console.error('❌ Gradle build failed');
  process.exit(1);
}

// 5. Переименовываем и копируем AAB
console.log('\n📋 Renaming and copying AAB...');

const aabSourcePath = path.join(__dirname, '../android/app/build/outputs/bundle/release/app-release.aab');
const outputsDir = path.join(__dirname, '../outputs');
const gradle = getGradleInfo();
const gradleVersion = gradle ? gradle.name : version;
const gradleCode = gradle ? gradle.code : '';
const newFileName = `SDM-v${gradleVersion}-${gradleCode}-production.aab`;
const aabDestPath = path.join(outputsDir, newFileName);

try {
  // Создаём папку outputs если её нет
  if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
    console.log('   ✅ Created outputs directory');
  }

  // Проверяем существование исходного файла
  if (!fs.existsSync(aabSourcePath)) {
    console.error(`❌ AAB not found at: ${aabSourcePath}`);
    process.exit(1);
  }

  // Копируем и переименовываем
  fs.copyFileSync(aabSourcePath, aabDestPath);
  
  console.log('   ✅ AAB renamed and copied successfully!');
  console.log(`   📦 ${newFileName}`);
  console.log(`   📁 Location: ${aabDestPath}`);
  
  // Показываем размер файла
  const stats = fs.statSync(aabDestPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   💾 Size: ${fileSizeMB} MB`);
  
} catch (error) {
  console.error('❌ Copy/rename failed:', error.message);
  process.exit(1);
}

console.log('\n✅ Clean production AAB build complete!');
console.log('📦 Ready for Google Play Console upload!');