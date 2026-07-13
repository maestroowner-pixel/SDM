const { withAndroidManifest } = require('@expo/config-plugins');

// Play Console: "в этом выпуске не поддерживаются некоторые устройства,
// включённые в предыдущий выпуск".
//
// Причина, которую чинит этот плагин — implied uses-feature. Разрешения
// CAMERA / ACCESS_FINE_LOCATION / RECORD_AUDIO Play трактует как ТРЕБОВАНИЕ
// соответствующего железа (камера, GPS, микрофон), если <uses-feature> не
// объявлен явно, и отфильтровывает устройства без него. Приложению это железо
// не обязательно (скан можно приложить файлом, звук — только воспроизведение),
// поэтому объявляем всё как required="false".
//
// Вторая причина (ABI: были только armeabi-v7a + arm64-v8a) чинится в
// plugins/android-signing.js — там задаётся список архитектур.

const OPTIONAL_FEATURES = [
  'android.hardware.camera',
  'android.hardware.camera.any',
  'android.hardware.camera.autofocus',
  'android.hardware.camera.flash',
  'android.hardware.location',
  'android.hardware.location.gps',
  'android.hardware.location.network',
  'android.hardware.microphone',
];

function withOptionalHardwareFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest['uses-feature'] = manifest['uses-feature'] || [];

    for (const name of OPTIONAL_FEATURES) {
      const existing = manifest['uses-feature'].find(
        (f) => f.$?.['android:name'] === name
      );
      if (existing) {
        existing.$['android:required'] = 'false';
      } else {
        manifest['uses-feature'].push({
          $: { 'android:name': name, 'android:required': 'false' },
        });
      }
    }
    return cfg;
  });
}

module.exports = function withAndroidDeviceCompat(config) {
  return withOptionalHardwareFeatures(config);
};
