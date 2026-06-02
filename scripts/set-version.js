// scripts/set-version.js
// Устанавливает конкретный номер версии (поддерживает оба формата локализации)

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('❌ Укажите номер версии!');
  console.log('');
  console.log('📖 Использование:');
  console.log('   node scripts/set-version.js 3.0.0');
  console.log('   npm run set:version 3.0.0');
  process.exit(1);
}

const newVersion = args[0];
const versionRegex = /^(\d+)\.(\d+)\.(\d+)$/;
const match = newVersion.match(versionRegex);

if (!match) {
  console.error('❌ Неправильный формат версии!');
  console.log('   Используйте формат: X.X.X (например: 3.0.0)');
  process.exit(1);
}

const [, major, minor, patch] = match;
const newVersionCode = `${major}${minor}${patch}`;

console.log(`🔢 Setting version to ${newVersion}...\n`);

// ============================================
// 1. Обновить .env.production
// ============================================

const envPath = path.join(__dirname, '../.env.production');

if (!fs.existsSync(envPath)) {
  console.error('❌ Файл .env.production не найден!');
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');
const oldVersionMatch = envContent.match(/APP_VERSION=(\d+\.\d+\.\d+)/);
const oldVersion = oldVersionMatch ? oldVersionMatch[1] : 'unknown';

envContent = envContent.replace(
  /APP_VERSION=\d+\.\d+\.\d+/,
  `APP_VERSION=${newVersion}`
);

fs.writeFileSync(envPath, envContent, 'utf8');

console.log('✅ Updated .env.production');
console.log(`   Version: ${oldVersion} → ${newVersion}`);
console.log(`   VersionCode: ${newVersionCode}`);
console.log('');

// ============================================
// 2. Обновить SplashScreen.tsx
// ============================================

const splashScreenPath = path.join(__dirname, '../screens/SplashScreen.tsx');

if (fs.existsSync(splashScreenPath)) {
  let splashContent = fs.readFileSync(splashScreenPath, 'utf8');
  const splashVersionRegex = /const version = ["'](\d+\.\d+\.\d+)["']/;
  const splashMatch = splashContent.match(splashVersionRegex);
  
  if (splashMatch) {
    const oldSplashVersion = splashMatch[1];
    splashContent = splashContent.replace(
      splashVersionRegex,
      `const version = "${newVersion}"`
    );
    fs.writeFileSync(splashScreenPath, splashContent, 'utf8');
    
    console.log('✅ Updated SplashScreen.tsx');
    console.log(`   Version: ${oldSplashVersion} → ${newVersion}`);
    console.log('');
  }
}

// ============================================
// 3. Обновить файлы локализации (оба формата)
// ============================================

const localesDir = path.join(__dirname, '../locales');

if (fs.existsSync(localesDir)) {
  const localeFiles = fs.readdirSync(localesDir).filter(file => file.endsWith('.json'));
  
  console.log('🌍 Updating localization files...');
  
  localeFiles.forEach(file => {
    const filePath = path.join(localesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    try {
      const json = JSON.parse(content);
      let oldLocaleVersion = null;
      
      // Формат 1: Вложенный объект { "splash": { "version": "..." } }
      if (json.splash && typeof json.splash === 'object' && json.splash.version) {
        oldLocaleVersion = json.splash.version;
        
        // Извлекаем префикс (например "Versión " или "Version ")
        const versionPrefix = oldLocaleVersion.replace(/\d+\.\d+\.\d+/, '').trim();
        
        json.splash.version = versionPrefix ? `${versionPrefix} ${newVersion}` : newVersion;
        updated = true;
      }
      
      // Формат 2: Плоский с точками { "splash.version": "..." }
      if (json['splash.version']) {
        oldLocaleVersion = json['splash.version'];
        
        // Извлекаем префикс
        const versionPrefix = oldLocaleVersion.replace(/\d+\.\d+\.\d+/, '').trim();
        
        json['splash.version'] = versionPrefix ? `${versionPrefix} ${newVersion}` : newVersion;
        updated = true;
      }
      
      if (updated) {
        // Записываем обратно с форматированием
        fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
        console.log(`   ✅ ${file}: ${oldLocaleVersion} → ${json.splash?.version || json['splash.version']}`);
      } else {
        console.log(`   ⚠️  ${file}: version field not found, skipping`);
      }
    } catch (error) {
      console.log(`   ❌ ${file}: Error parsing JSON - ${error.message}`);
    }
  });
  
  console.log('');
} else {
  console.log('⚠️  Locales directory not found');
  console.log('   Skipping localization files');
  console.log('');
}

// ============================================
// 4. Обновить package.json
// ============================================

const packagePath = path.join(__dirname, '../package.json');

if (fs.existsSync(packagePath)) {
  let packageContent = fs.readFileSync(packagePath, 'utf8');
  const packageJson = JSON.parse(packageContent);
  
  if (packageJson.version) {
    const oldPackageVersion = packageJson.version;
    packageJson.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
    
    console.log('✅ Updated package.json');
    console.log(`   Version: ${oldPackageVersion} → ${newVersion}`);
    console.log('');
  }
}

// ============================================
// 5. Запросить описание изменений
// ============================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askForChanges = () => {
  return new Promise((resolve) => {
    console.log('📝 Enter changelog for this version (press Enter to skip):');
    rl.question('   > ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};

// ============================================
// 6. Записать в Version.txt
// ============================================

const updateVersionFile = async () => {
  const changelogMessage = await askForChanges();
  
  const versionFilePath = 'D:/Version.txt';
  
  const timestamp = new Date().toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const changelogEntry = `[${timestamp}] Version ${newVersion} (Build ${newVersionCode})${changelogMessage ? ` - ${changelogMessage}` : ''}`;
  
  let existingContent = '';
  if (fs.existsSync(versionFilePath)) {
    existingContent = fs.readFileSync(versionFilePath, 'utf8');
  }
  
  const newContent = changelogEntry + '\n' + existingContent;
  fs.writeFileSync(versionFilePath, newContent, 'utf8');
  
  console.log('');
  console.log('✅ Updated Version.txt');
  console.log(`   Location: ${versionFilePath}`);
  console.log(`   Entry: ${changelogEntry}`);
  console.log('');
  
  console.log('📦 Version set complete!');
  console.log('');
  console.log('📋 Summary:');
  console.log(`   Old Version: ${oldVersion}`);
  console.log(`   New Version: ${newVersion}`);
  console.log(`   New VersionCode: ${newVersionCode}`);
  console.log(`   Changelog: ${changelogMessage || '(no changes specified)'}`);
  console.log('');
  console.log('📝 Updated files:');
  console.log('   ✓ .env.production');
  console.log('   ✓ SplashScreen.tsx (if exists)');
  console.log('   ✓ locales/*.json (all formats)');
  console.log('   ✓ package.json');
  console.log('   ✓ D:/Version.txt');
  console.log('');
  console.log('🚀 Ready to build with new version!');
  console.log('   Run: npm run build:aab:production');
};

updateVersionFile();
