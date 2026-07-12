import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Импорт ВСЕХ языковых файлов
import en from '../locales/en.json';
import tl from '../locales/tl.json';
import ru from '../locales/ru.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import zh from '../locales/zh.json';
import uk from '../locales/uk.json';
import hi from '../locales/hi.json';
import pl from '../locales/pl.json';



const i18n = new I18n({
  en,
  ru,
  es,
  fr,
  de,
  zh,
  tl,
  uk,
  hi,
  pl
});

// Настройки поведения
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

// Список языков, для которых есть локализации
export const SUPPORTED_LANGUAGES = ['en', 'ru', 'es', 'fr', 'de', 'zh', 'tl', 'uk', 'hi', 'pl'];

/**
 * Определить язык системы.
 * Возвращает код языка, если он есть в локализациях, иначе null.
 */
export const getSystemLanguage = (): string | null => {
  try {
    const code = Localization.getLocales()?.[0]?.languageCode?.toLowerCase();
    if (code && SUPPORTED_LANGUAGES.includes(code)) return code;
    return null;
  } catch (e) {
    return null;
  }
};

/**
 * Функция перевода с защитой от объектов
 */
export const t = (key: string, options?: any): string => {
  if (!key) return '';
  try {
    const result = i18n.t(key, options);
    
    // Проверка на "восстание объектов"
    if (typeof result === 'object' && result !== null) {
      return (result as any).title || (result as any).label || key;
    }
    
    // Возвращаем ключ, если перевод отсутствует
    return (result && !result.includes('missing')) ? result : key;
  } catch (e) {
    return key;
  }
};

/**
 * Функция сохранения языка
 */
export const saveLanguage = async (lng: string) => {
  try {
    console.log('💾 Saving language:', lng);
    i18n.locale = lng;
    await AsyncStorage.setItem('@app_language', lng);
    console.log('✅ Language saved successfully');
  } catch (e) {
    console.error('❌ Error saving language:', e);
  }
};

/**
 * Функция загрузки сохраненного языка
 * НОРМАЛЬНАЯ РАБОТА: Английский по умолчанию, сохранение выбора пользователя
 */
export const loadSavedLanguage = async (): Promise<string> => {
  try {
    const savedLng = await AsyncStorage.getItem('@app_language');
    
    if (!savedLng) {
      // Первый запуск — берём язык системы, если он поддерживается, иначе английский
      const initial = getSystemLanguage() || 'en';
      console.log('🆕 First launch - setting language to:', initial);
      i18n.locale = initial;
      await AsyncStorage.setItem('@app_language', initial);
      return initial;
    }
    
    // Используем сохранённый язык
    console.log('📖 Loading saved language:', savedLng);
    i18n.locale = savedLng;
    return savedLng;
  } catch (e) {
    console.log('⚠️ Error loading language, using default EN');
    i18n.locale = 'en';
    return 'en';
  }
};

/**
 * Получить текущий язык
 */
export const getCurrentLanguage = (): string => {
  return i18n.locale;
};

export default i18n;