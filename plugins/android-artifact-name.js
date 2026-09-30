const { withAppBuildGradle } = require('expo/config-plugins');

// Names the Gradle outputs after the app, version and build date instead of the
// default app-release.aab / app-release.apk:
//   SDM-v3.1.9-301091-2026-09-30-release.aab
//   SDM-v3.1.9-301091-2026-09-30-release.apk
// `archivesName` drives both the APK and the bundle name. Version and code are
// read from defaultConfig at build time, so a bump that edits build.gradle
// directly is picked up without a prebuild.
//
// Anything that looked for app-release.* must look for the newest *.aab / *.apk
// instead — scripts/artifact.js does that for the build scripts. `expo run:android`
// copes on its own: it falls back to AGP's output-metadata.json.

const MARKER = 'android-artifact-name';

const BLOCK = `
// [${MARKER}] SDM-v<versionName>-<versionCode>-<yyyy-MM-dd>-<buildType>.(aab|apk)
def sdmBuildDate = new java.text.SimpleDateFormat('yyyy-MM-dd').format(new Date())
base {
    archivesName = "SDM-v\${android.defaultConfig.versionName}-\${android.defaultConfig.versionCode}-\${sdmBuildDate}"
}
`;

module.exports = function withAndroidArtifactName(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += BLOCK;
    }
    return cfg;
  });
};
