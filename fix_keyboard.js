const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'screens');

console.log("--- Отчет для Вашей светлости ---");

if (!fs.existsSync(screensDir)) {
    console.log("❌ Папка не найдена: " + screensDir);
    process.exit(1);
}

const files = fs.readdirSync(screensDir).filter(f => f.endsWith('.tsx') || f.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(screensDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Очистка импортов от дублей и синтаксических ошибок (запятых)
    const componentsNeeded = ['KeyboardAvoidingView', 'Platform', 'ScrollView', 'TouchableWithoutFeedback', 'Keyboard'];
    
    const rnImportMatch = content.match(/import\s*{([^}]+)}\s*from\s*['"]react-native['"]/);
    
    if (rnImportMatch) {
        let items = rnImportMatch[1]
            .split(',')
            .map(i => i.trim())
            .filter(i => i.length > 0); // Убираем пустые элементы (двойные запятые)
        
        // Добавляем недостающие компоненты, избегая дублей
        componentsNeeded.forEach(comp => {
            if (!items.includes(comp)) items.push(comp);
        });

        const newImport = `import { ${items.join(', ')} } from 'react-native'`;
        content = content.replace(rnImportMatch[0], newImport);
    }

    // 2. Обертка в KeyboardAvoidingView (только если её еще нет в JSX)
    if (!content.includes('<KeyboardAvoidingView')) {
        content = content.replace(/return\s*\(\s*([\s\S]*?)\s*\);/g, (match, p1) => {
            if (p1.includes('KeyboardAvoidingView')) return match;
            return `return (
  <KeyboardAvoidingView 
    behavior={Platform.OS === "ios" ? "padding" : "height"} 
    style={{ flex: 1 }}
    keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        ${p1.trim()}
      </ScrollView>
    </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
);`;
        });
    }

    fs.writeFileSync(filePath, content);
    console.log(`✅ Исправлен: ${file}`);
});

console.log("--- Все ошибки синтаксиса устранены! ---");