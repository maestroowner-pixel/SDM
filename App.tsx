// App.tsx
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { SubscriptionService } from './src/services/subscriptionService';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

// Предотвращаем скрытие splash screen
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  // Загрузка шрифтов
  const [fontsLoaded, fontsError] = useFonts({
    'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('./assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
  });

  useEffect(() => {
    async function prepare() {
      try {
        console.log('🚀 Starting app initialization...');

        // Инициализация Revenue Cat
        await SubscriptionService.initialize();
        console.log('✅ Revenue Cat initialized');

        // Ждем загрузки шрифтов
        if (fontsLoaded || fontsError) {
          if (fontsError) {
            console.warn('⚠️ Font loading error:', fontsError);
          } else {
            console.log('✅ Fonts loaded');
          }
          setAppIsReady(true);
        }
      } catch (error) {
        console.error('❌ App initialization error:', error);
        // Продолжаем запуск даже при ошибке
        setAppIsReady(true);
      }
    }

    // Запускаем инициализацию только когда шрифты загружены или произошла ошибка
    if (fontsLoaded || fontsError) {
      prepare();
    }
  }, [fontsLoaded, fontsError]);

  useEffect(() => {
    async function hideSplash() {
      if (appIsReady) {
        try {
          await SplashScreen.hideAsync();
          console.log('✅ Splash screen hidden');
        } catch (error) {
          console.warn('⚠️ Error hiding splash screen:', error);
        }
      }
    }

    hideSplash();
  }, [appIsReady]);

  // Показываем пустой экран пока приложение не готово
  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}