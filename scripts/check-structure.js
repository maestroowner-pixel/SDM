const fs = require('fs');
const path = require('path');

console.log('🔍 Checking project structure...\n');

const filesToCheck = [
  { path: '.env.production', required: true },
  { path: 'screens/SplashScreen.tsx', required: false },
  { path: 'package.json', required: true },
  { path: 'app.json', required: false },
  { path: 'android/gradle.properties', required: false },
  { path: 'locales', required: false, isDir: true },
];

filesToCheck.forEach(({ path: filePath, required, isDir }) => {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);
  const icon = exists ? '✅' : (required ? '❌' : '⚠️');
  const type = isDir ? 'Directory' : 'File';
  
  console.log(`${icon} ${type}: ${filePath}`);
  console.log(`   Path: ${fullPath}`);
  console.log(`   Exists: ${exists}`);
  
  if (exists && !isDir) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n').length;
    console.log(`   Lines: ${lines}`);
  }
  
  console.log('');
});