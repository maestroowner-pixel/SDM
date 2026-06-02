#!/usr/bin/env node

/**
 * 🎨 SDM Theme Props Auto-Injector
 * Автоматически применяет централизованную систему цветов ко всем экранам
 * 
 * Использование:
 *   node apply-theme-props.js
 *   node apply-theme-props.js --dry-run (режим проверки без изменений)
 *   node apply-theme-props.js --file screens/DocumentsScreen.tsx (один файл)
 */

const fs = require('fs');
const path = require('path');

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

const CONFIG = {
  screensDir: './screens',
  backupSuffix: '.backup',
  dryRun: process.argv.includes('--dry-run'),
  singleFile: process.argv.find(arg => arg.startsWith('--file='))?.split('=')[1],
};

// Карта замен цветов
const COLOR_REPLACEMENTS = [
  // Основной цвет (primary)
  { 
    pattern: /(color|backgroundColor):\s*['"]#704214['"]/g, 
    replace: '$1: theme.primary',
    description: 'Primary color (light theme brown)'
  },
  { 
    pattern: /(color|backgroundColor):\s*['"]#00BFFF['"]/g, 
    replace: '$1: accent',
    description: 'Cyan accent'
  },
  
  // Текст
  { 
    pattern: /(color):\s*['"]#4A3728['"]/g, 
    replace: '$1: theme.text',
    description: 'Primary text (light)'
  },
  { 
    pattern: /(color):\s*['"]#FFFFFF['"]/g, 
    replace: '$1: theme.text',
    description: 'Primary text (dark)'
  },
  { 
    pattern: /(color):\s*['"]#A89078['"]/g, 
    replace: '$1: theme.textSecondary',
    description: 'Secondary text (light)'
  },
  { 
    pattern: /(color):\s*['"]#556B8D['"]/g, 
    replace: '$1: theme.textSecondary',
    description: 'Secondary text (dark)'
  },
  
  // Условные выражения
  { 
    pattern: /isDark\s*\?\s*['"]#FFFFFF['"]\s*:\s*['"]#4A3728['"]/g, 
    replace: 'theme.text',
    description: 'Conditional text color'
  },
  { 
    pattern: /isDark\s*\?\s*['"]#00BFFF['"]\s*:\s*['"]#704214['"]/g, 
    replace: 'theme.primary',
    description: 'Conditional primary color'
  },
  { 
    pattern: /isDark\s*\?\s*['"]#556B8D['"]\s*:\s*['"]#A89078['"]/g, 
    replace: 'theme.textSecondary',
    description: 'Conditional secondary color'
  },
  
  // Карточки
  { 
    pattern: /backgroundColor:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.5\)['"]/g, 
    replace: 'backgroundColor: theme.card',
    description: 'Card background (light)'
  },
  { 
    pattern: /backgroundColor:\s*['"]rgba\(26,\s*42,\s*74,\s*0\.4\)['"]/g, 
    replace: 'backgroundColor: theme.card',
    description: 'Card background (dark)'
  },
];

// ============================================
// УТИЛИТЫ
// ============================================

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  dry: (msg) => console.log(`🔍 [DRY RUN] ${msg}`),
};

function createBackup(filePath) {
  const backupPath = filePath + CONFIG.backupSuffix;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    log.success(`Backup created: ${backupPath}`);
  }
}

// ============================================
// ОСНОВНЫЕ ФУНКЦИИ ТРАНСФОРМАЦИИ
// ============================================

function injectThemeProps(content, fileName) {
  const componentName = fileName.replace('.tsx', '');
  
  // Проверяем, уже ли есть theme props
  if (content.includes('theme, accent') || content.includes('theme: ') || content.includes('accent: ')) {
    log.warning(`${fileName}: Theme props already exist, skipping injection`);
    return content;
  }
  
  // Паттерны для разных типов экспорта
  const patterns = [
    // export const Screen = () => {
    {
      regex: new RegExp(`export const ${componentName} = \\(\\) => \\{`, 'g'),
      replacement: `export const ${componentName} = ({ theme, accent, onOpenPaywall }: any) => {`
    },
    // export const Screen: React.FC = () => {
    {
      regex: new RegExp(`export const ${componentName}: React\\.FC = \\(\\) => \\{`, 'g'),
      replacement: `export const ${componentName}: React.FC<any> = ({ theme, accent, onOpenPaywall }) => {`
    },
    // export function Screen() {
    {
      regex: new RegExp(`export function ${componentName}\\(\\) \\{`, 'g'),
      replacement: `export function ${componentName}({ theme, accent, onOpenPaywall }: any) {`
    },
    // export const Screen = ({ onClose }) => {
    {
      regex: new RegExp(`export const ${componentName} = \\(\\{([^}]*)\\}\\) => \\{`, 'g'),
      replacement: `export const ${componentName} = ({ $1, theme, accent, onOpenPaywall }: any) => {`
    },
    // export const Screen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    {
      regex: new RegExp(`export const ${componentName}: React\\.FC<[^>]+> = \\(\\{([^}]*)\\}\\) => \\{`, 'g'),
      replacement: `export const ${componentName}: React.FC<any> = ({ $1, theme, accent, onOpenPaywall }) => {`
    },
    // function Screen() {
    {
      regex: new RegExp(`^function ${componentName}\\(\\) \\{`, 'gm'),
      replacement: `function ${componentName}({ theme, accent, onOpenPaywall }: any) {`
    },
    // const Screen = () => {
    {
      regex: new RegExp(`^const ${componentName} = \\(\\) => \\{`, 'gm'),
      replacement: `const ${componentName} = ({ theme, accent, onOpenPaywall }: any) => {`
    },
    // const Screen: React.FC = () => {
    {
      regex: new RegExp(`^const ${componentName}: React\\.FC = \\(\\) => \\{`, 'gm'),
      replacement: `const ${componentName}: React.FC<any> = ({ theme, accent, onOpenPaywall }) => {`
    },
    // export default function Screen() {
    {
      regex: new RegExp(`export default function ${componentName}\\(\\) \\{`, 'g'),
      replacement: `export default function ${componentName}({ theme, accent, onOpenPaywall }: any) {`
    },
    // export default function Screen({ onClose }) {
    {
      regex: new RegExp(`export default function ${componentName}\\(\\{([^}]*)\\}\\) \\{`, 'g'),
      replacement: `export default function ${componentName}({ $1, theme, accent, onOpenPaywall }: any) {`
    },
  ];
  
  let modified = content;
  let injected = false;
  
  for (const { regex, replacement } of patterns) {
    if (regex.test(content)) {
      modified = modified.replace(regex, replacement);
      injected = true;
      log.success(`${fileName}: Props injected (pattern matched)`);
      break;
    }
  }
  
  if (!injected) {
    log.warning(`${fileName}: Could not find component signature to inject props`);
  }
  
  return modified;
}

function replaceHardcodedColors(content, fileName) {
  let modified = content;
  let changeCount = 0;
  
  COLOR_REPLACEMENTS.forEach(({ pattern, replace, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      modified = modified.replace(pattern, replace);
      changeCount += matches.length;
      log.info(`${fileName}: Replaced ${matches.length}x ${description}`);
    }
  });
  
  if (changeCount > 0) {
    log.success(`${fileName}: Total ${changeCount} color replacements`);
  }
  
  return modified;
}

function removeIsDarkDeclarations(content) {
  // Удаляем строки типа: const isDark = state.theme === 'dark';
  return content.replace(/const isDark = .*?;?\n/g, '');
}

function addThemeImport(content) {
  // Проверяем, есть ли уже импорт UI_THEME
  if (content.includes('UI_THEME')) {
    return content;
  }
  
  // Находим последний импорт
  const importRegex = /import\s+.*?from\s+['"].*?['"];?\n/g;
  const imports = content.match(importRegex);
  
  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    
    const themeImport = "import { UI_THEME } from '../app/index';\n";
    
    return content.slice(0, lastImportIndex + lastImport.length) + 
           themeImport + 
           content.slice(lastImportIndex + lastImport.length);
  }
  
  return content;
}

// ============================================
// ФАЙЛОВЫЕ ОПЕРАЦИИ
// ============================================

function findScreenFiles() {
  if (CONFIG.singleFile) {
    return [CONFIG.singleFile];
  }
  
  if (!fs.existsSync(CONFIG.screensDir)) {
    log.error(`Directory not found: ${CONFIG.screensDir}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(CONFIG.screensDir)
    .filter(file => file.endsWith('Screen.tsx'))
    .map(file => path.join(CONFIG.screensDir, file));
  
  log.info(`Found ${files.length} screen files`);
  return files;
}

function processFile(filePath) {
  const fileName = path.basename(filePath);
  
  log.info(`\n${'='.repeat(60)}`);
  log.info(`Processing: ${fileName}`);
  log.info('='.repeat(60));
  
  if (!fs.existsSync(filePath)) {
    log.error(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Создаем бэкап перед изменениями
  if (!CONFIG.dryRun) {
    createBackup(filePath);
  }
  
  // Применяем трансформации
  content = injectThemeProps(content, fileName);
  content = replaceHardcodedColors(content, fileName);
  content = removeIsDarkDeclarations(content);
  content = addThemeImport(content);
  
  // Проверяем, были ли изменения
  if (content === originalContent) {
    log.warning(`${fileName}: No changes needed`);
    return;
  }
  
  // Сохраняем файл
  if (CONFIG.dryRun) {
    log.dry(`Would update: ${filePath}`);
    log.dry('Preview of changes:');
    console.log(content.slice(0, 500) + '...\n');
  } else {
    fs.writeFileSync(filePath, content, 'utf-8');
    log.success(`${fileName}: Successfully updated! ✨`);
  }
}

// ============================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================

function main() {
  console.log('\n🎨 SDM Theme Props Auto-Injector\n');
  
  if (CONFIG.dryRun) {
    log.dry('Running in DRY RUN mode - no files will be modified');
  }
  
  const screenFiles = findScreenFiles();
  
  if (screenFiles.length === 0) {
    log.warning('No screen files found');
    return;
  }
  
  screenFiles.forEach(processFile);
  
  console.log('\n' + '='.repeat(60));
  log.success('Processing complete!');
  console.log('='.repeat(60) + '\n');
  
  if (!CONFIG.dryRun) {
    log.info('Backup files created with .backup extension');
    log.info('To restore: mv screens/SomeScreen.tsx.backup screens/SomeScreen.tsx');
  }
}

// ============================================
// ЗАПУСК
// ============================================

main();
