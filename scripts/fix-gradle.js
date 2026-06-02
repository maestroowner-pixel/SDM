// scripts/fix-gradle.js
// Автоматически настраивает build.gradle для production keystore после expo prebuild

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing build.gradle for production keystore...');

const gradlePath = path.join(__dirname, '../android/app/build.gradle');

if (!fs.existsSync(gradlePath)) {
  console.error('❌ build.gradle не найден!');
  process.exit(1);
}

let content = fs.readFileSync(gradlePath, 'utf8');

// Функция для поиска закрывающей скобки с учётом вложенности
function findClosingBrace(text, startPos) {
  let braceCount = 0;
  for (let i = startPos; i < text.length; i++) {
    if (text[i] === '{') braceCount++;
    if (text[i] === '}') {
      braceCount--;
      if (braceCount === 0) return i;
    }
  }
  return -1;
}

// 1. Найти и заменить блок signingConfigs
const signingConfigsStart = content.indexOf('signingConfigs {');
if (signingConfigsStart === -1) {
  console.error('❌ signingConfigs block не найден!');
  process.exit(1);
}

const openBracePos = content.indexOf('{', signingConfigsStart);
const signingConfigsEnd = findClosingBrace(content, openBracePos);

if (signingConfigsEnd === -1) {
  console.error('❌ Не могу найти конец signingConfigs block!');
  process.exit(1);
}

const newSigningConfigs = `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file('../../@osypov_m__seafarer-docs.jks')
            storePassword process.env.MYAPP_UPLOAD_STORE_PASSWORD || ''
            keyAlias process.env.MYAPP_UPLOAD_KEY_ALIAS || ''
            keyPassword process.env.MYAPP_UPLOAD_KEY_PASSWORD || ''
        }
    }`;

content = content.substring(0, signingConfigsStart) + 
          newSigningConfigs + 
          content.substring(signingConfigsEnd + 1);

console.log('   ✅ signingConfigs block replaced');

// 2. Исправить release buildType
// Ищем: release { ... signingConfig signingConfigs.debug
const releaseBuildStart = content.indexOf('release {', signingConfigsStart);
if (releaseBuildStart === -1) {
  console.error('❌ release buildType не найден!');
  process.exit(1);
}

// Найти signingConfig signingConfigs.debug внутри release
const releaseOpenBrace = content.indexOf('{', releaseBuildStart);
const releaseCloseBrace = findClosingBrace(content, releaseOpenBrace);

if (releaseCloseBrace === -1) {
  console.error('❌ Не могу найти конец release buildType!');
  process.exit(1);
}

const releaseBlock = content.substring(releaseBuildStart, releaseCloseBrace + 1);
const debugConfigPos = releaseBlock.indexOf('signingConfig signingConfigs.debug');

if (debugConfigPos !== -1) {
  const beforeDebugConfig = content.substring(0, releaseBuildStart + debugConfigPos);
  const afterDebugConfig = content.substring(releaseBuildStart + debugConfigPos + 'signingConfig signingConfigs.debug'.length);
  
  content = beforeDebugConfig + 'signingConfig signingConfigs.release' + afterDebugConfig;
  console.log('   ✅ release buildType changed to signingConfigs.release');
} else {
  console.log('   ⚠️  release buildType already uses signingConfigs.release or not found');
}

// 3. Сохраняем
fs.writeFileSync(gradlePath, content, 'utf8');

console.log('✅ build.gradle fixed successfully!');
console.log('   Production keystore: @osypov_m__seafarer-docs.jks');
console.log('');

// 4. Проверка
console.log('📝 Verification:');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('storeFile file') || line.includes('signingConfig signingConfigs')) {
    console.log(`   Line ${i + 1}: ${line.trim()}`);
  }
});
console.log('');