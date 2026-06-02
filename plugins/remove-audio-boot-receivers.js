const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function removeAudioBootReceivers(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Добавить xmlns:tools если нет
    manifest.$ = {
      ...manifest.$,
      'xmlns:tools': 'http://schemas.android.com/tools',
    };

    const app = manifest.application?.[0];
    if (app?.receiver) {
      // Удалить BOOT_COMPLETED receivers от expo-audio
      app.receiver = app.receiver.filter((receiver) => {
        const name = receiver.$?.['android:name'] ?? '';
        return (
          !name.includes('AudioRecordingService') &&
          !name.includes('AudioControlsService')
        );
      });
    }

    return config;
  });
};