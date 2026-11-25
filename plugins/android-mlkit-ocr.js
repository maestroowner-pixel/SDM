const { withAndroidManifest } = require('@expo/config-plugins');

// ML Kit text recognition (expo-text-extractor) uses the unbundled Play Services
// model, which is downloaded only when declared here; otherwise the first OCR call
// fails while the model is fetched. expo-camera already declares "barcode_ui" under
// the same key, so the app-level value lists both and replaces the library one.
const KEY = 'com.google.mlkit.vision.DEPENDENCIES';
const VALUE = 'barcode_ui,ocr';

module.exports = function withAndroidMlkitOcr(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = { ...manifest.$, 'xmlns:tools': 'http://schemas.android.com/tools' };
    const app = manifest.application?.[0];
    if (!app) return cfg;
    app['meta-data'] = (app['meta-data'] || []).filter((m) => m.$?.['android:name'] !== KEY);
    app['meta-data'].push({
      $: { 'android:name': KEY, 'android:value': VALUE, 'tools:replace': 'android:value' },
    });
    return cfg;
  });
};
