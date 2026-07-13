const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

// Hardens android/ against `expo prebuild` regeneration:
//   1) pins the ABI list
//   2) re-applies the Google Play release signingConfig
//
// ABI note: this used to be ARM-only ("smaller APK"). That is pointless for an
// AAB — Play splits the bundle and ships each device only its own ABI, so the
// user's download doesn't grow — and it silently DROPPED x86/x86_64 devices
// (Intel tablets, Chromebooks). Play then rejects the release with "некоторые
// устройства из предыдущего выпуска не поддерживаются". Keep all four.
//
// SECRETS ARE NOT STORED HERE. The release keystore credentials must live in
// the global, un-versioned ~/.gradle/gradle.properties:
//   MYAPP_UPLOAD_STORE_FILE=/absolute/path/@osypov_m__seafarer-docs.jks
//   MYAPP_UPLOAD_KEY_ALIAS=...
//   MYAPP_UPLOAD_STORE_PASSWORD=...
//   MYAPP_UPLOAD_KEY_PASSWORD=...
// build.gradle reads them via findProperty(); if they're absent the release
// build falls back to the debug keystore instead of failing configuration.

const GRADLE_PROPERTIES = {
  reactNativeArchitectures: 'armeabi-v7a,arm64-v8a,x86,x86_64',
};

function withHardenedGradleProperties(config) {
  return withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(GRADLE_PROPERTIES)) {
      const existing = cfg.modResults.find(
        (item) => item.type === 'property' && item.key === key
      );
      if (existing) {
        existing.value = value;
      } else {
        cfg.modResults.push({ type: 'property', key, value });
      }
    }
    return cfg;
  });
}

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Inject a `release` signingConfig after the default debug block.
    // Credentials are resolved from gradle properties (global ~/.gradle), with
    // a safe fallback to the debug keystore when they are not provided.
    //
    // Guard on our own marker, NOT on /signingConfigs[\s\S]*?release\s*\{/ — that
    // pattern skips across the whole file and matches the `release {` of the
    // buildTypes block, so the injection was silently skipped while the buildType
    // was still repointed at signingConfigs.release → Gradle: "could not find
    // property 'release'".
    if (!contents.includes('MYAPP_UPLOAD_STORE_FILE')) {
      contents = contents.replace(
        /(signingConfigs\s*\{\s*debug\s*\{[\s\S]*?keyPassword 'android'\s*\}\s*)/,
        `$1
        release {
            storeFile file(findProperty('MYAPP_UPLOAD_STORE_FILE') ?: 'debug.keystore')
            storePassword findProperty('MYAPP_UPLOAD_STORE_PASSWORD') ?: 'android'
            keyAlias findProperty('MYAPP_UPLOAD_KEY_ALIAS') ?: 'androiddebugkey'
            keyPassword findProperty('MYAPP_UPLOAD_KEY_PASSWORD') ?: 'android'
        }
`
      );
    }

    // Point the release buildType at signingConfigs.release (anchored on the
    // line that follows it in the template so the debug buildType is untouched).
    contents = contents.replace(
      /signingConfig signingConfigs\.debug(\s*\n\s*def enableShrinkResources)/,
      'signingConfig signingConfigs.release$1'
    );

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = function withAndroidSigning(config) {
  config = withHardenedGradleProperties(config);
  config = withReleaseSigning(config);
  return config;
};
