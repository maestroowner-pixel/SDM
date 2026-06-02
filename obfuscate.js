// obfuscate.js
const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const metadataPath = path.resolve(__dirname, 'dist', 'metadata.json');
let inputPath = null;
let outputPath = null;

try {
    // 1. Чтение metadata.json
    if (!fs.existsSync(metadataPath)) {
        throw new Error(`Не удалось найти файл метаданных: ${metadataPath}`);
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    
    // ИСПРАВЛЕНО: Используем 'fileMetadata' вместо 'bundles'
    const relativeBundlePath = metadata.fileMetadata.android.bundle;
    
    if (!relativeBundlePath) {
        throw new Error("Ошибка в структуре metadata.json: Ключ 'fileMetadata.android.bundle' пуст или отсутствует.");
    }
    
    // Путь в метаданных относительно папки dist
    inputPath = path.resolve(__dirname, 'dist', relativeBundlePath);
    outputPath = inputPath; // Обфусцированный бандл остается на том же месте

    if (!fs.existsSync(inputPath)) {
        throw new Error(`Файл бандла, указанный в метаданных, не существует: ${inputPath}`);
    }

    console.log(`🔍 Найден файл для обфускации через metadata.json: ${inputPath}`);

    const code = fs.readFileSync(inputPath, 'utf8');

    // Настройки обфускации
    const obfuscationResult = JavaScriptObfuscator.obfuscate(
        code,
        {
            compact: true,
            controlFlowFlattening: true, 
            controlFlowFlatteningThreshold: 1,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 1,
            identifierNamesGenerator: 'hexadecimal', 
            log: false,
            stringArrayEncoding: ['base64'],
            stringArrayWrappersCount: 5,
            stringArrayWrappersType: 'function',
            stringArrayThreshold: 1,
            transformObjectKeys: true,
            rotateStringArray: true,
        }
    );

    fs.writeFileSync(outputPath, obfuscationResult.getObfuscatedCode(), 'utf8');
    console.log(`✅ JS-бандл обфусцирован и сохранен по пути: ${outputPath}`);

} catch (error) {
    console.error('❌ Ошибка обфускации:', error);
    process.exit(1);
}
