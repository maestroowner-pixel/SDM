const { withAndroidManifest } = require('@expo/config-plugins');

// Снимает жёсткую блокировку ориентации с активности ML Kit barcode scanner
// (GmsBarcodeScanningDelegateActivity объявлена с screenOrientation="portrait"
// внутри библиотеки expo-camera/ML Kit). Android 16 игнорирует такие ограничения
// на больших экранах и Play Console предупреждает об этом — переопределяем через
// manifest merge (tools:replace), чтобы поведение было корректным и без варнинга.
const ACTIVITY = 'com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity';

module.exports = function withAndroidLargeScreenFix(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = { ...manifest.$, 'xmlns:tools': 'http://schemas.android.com/tools' };

    const app = manifest.application?.[0];
    if (!app) return cfg;
    app.activity = app.activity || [];

    const existing = app.activity.find((a) => a.$?.['android:name'] === ACTIVITY);
    if (existing) {
      existing.$['android:screenOrientation'] = 'fullUser';
      existing.$['tools:replace'] = 'android:screenOrientation';
    } else {
      app.activity.push({
        $: {
          'android:name': ACTIVITY,
          'android:screenOrientation': 'fullUser',
          'tools:replace': 'android:screenOrientation',
        },
      });
    }
    return cfg;
  });
};
