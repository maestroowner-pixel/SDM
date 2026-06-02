// scripts/utils/rename-build.js
const fs = require('fs');
const path = require('path');

/**
 * Переименовывает и копирует build файл
 * @param {string} sourcePath - Путь к исходному файлу
 * @param {string} version - Версия приложения
 * @param {string} buildType - Тип билда (production, preview, testing, dev)
 * @param {string} fileType - Тип файла (aab или apk)
 */
function renameBuild(sourcePath, version, buildType, fileType) {
  const outputsDir = path.join(__dirname, '../../outputs');
  const newFileName = `seafarer-documents-manager-${version}-${buildType}.${fileType}`;
  const destPath = path.join(outputsDir, newFileName);

  console.log('\n📋 Renaming and copying build...');
  
  try {
    // Создаём outputs если нет
    if (!fs.existsSync(outputsDir)) {
      fs.mkdirSync(outputsDir, { recursive: true });
      console.log('   ✅ Created outputs directory');
    }

    // Проверяем исходный файл
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Build file not found at: ${sourcePath}`);
    }

    // Копируем и переименовываем
    fs.copyFileSync(sourcePath, destPath);
    
    console.log('   ✅ Build renamed and copied successfully!');
    console.log(`   📦 ${newFileName}`);
    console.log(`   📁 Location: ${destPath}`);
    
    // Размер файла
    const stats = fs.statSync(destPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`   💾 Size: ${fileSizeMB} MB`);
    
    return destPath;
    
  } catch (error) {
    console.error('❌ Rename/copy failed:', error.message);
    throw error;
  }
}

module.exports = { renameBuild };