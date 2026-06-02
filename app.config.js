export default ({ config }) => {
  const appMode = process.env.APP_MODE || 'development';
  const variant = process.env.APP_VARIANT || appMode;
  const enableTestingScreen = process.env.ENABLE_TESTING_SCREEN === 'true';
  
  const isProduction = appMode === 'production' || variant === 'production';
  
  return {
    ...config,
    name: 'Seafarer Documents Manager',
    slug: 'seafarer-documents-manager',
    version: config.version || '1.0.0',
    orientation: 'default',
    icon: './assets/images/adaptive-icon.png',
    userInterfaceStyle: 'automatic',

    plugins: config.plugins,

    android: {
      ...config.android,
      package: isProduction
        ? 'seafarer.documents.manager'
        : `seafarer.documents.manager.${variant}`,
      versionCode: config.android?.versionCode || 1,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#030f4c',
        ...config.android?.adaptiveIcon,
      }
    },
    
    ios: {
      ...config.ios,
      bundleIdentifier: isProduction
        ? 'seafarer.documents.manager'
        : `seafarer.documents.manager.${variant}`,
      buildNumber: config.ios?.buildNumber || '1',
      supportsTablet: true,
    },
    
    extra: {
      ...config.extra,
      eas: {
        projectId: 'a31a8d61-97c9-49ac-b4b6-114336a46e5d'
      },
      enableTestingScreen: enableTestingScreen,
      appVariant: variant,
      appMode: appMode,
      giftExpiryDate: process.env.GIFT_EXPIRY_DATE || null,
    }
  };
};