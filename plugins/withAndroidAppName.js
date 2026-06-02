// plugins/withAndroidAppName.js
const { withStringsXml } = require('@expo/config-plugins');

const withAndroidAppName = (config) => {
  return withStringsXml(config, (config) => {
    const appName = "SDM"; // Имя приложения
    
    // Инициализируем resources если его нет
    if (!config.modResults.resources) {
      config.modResults.resources = {};
    }
    
    // Инициализируем string массив если его нет
    if (!config.modResults.resources.string) {
      config.modResults.resources.string = [];
    }
    
    const strings = config.modResults.resources.string;
    
    // Находим существующий app_name
    const appNameIndex = strings.findIndex(
      (item) => item.$ && item.$.name === 'app_name'
    );
    
    if (appNameIndex >= 0) {
      // Обновляем существующий
      strings[appNameIndex]._ = appName;
    } else {
      // Добавляем новый
      strings.push({
        $: { name: 'app_name' },
        _: appName,
      });
    }
    
    config.modResults.resources.string = strings;
    
    return config;
  });
};

module.exports = withAndroidAppName;