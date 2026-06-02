import { Platform, Dimensions } from 'react-native';

// Используем Dimensions.get('screen') — размер физического экрана,
// не зависит от Split View и всегда корректен на iPad
const { width: SCREEN_WIDTH } = Dimensions.get('screen');

export const useTablet = () => {
  // Platform.isPad — нативная проверка iOS
  // SCREEN_WIDTH >= 768 — размер физического экрана (не окна)
  return (Platform as any).isPad || SCREEN_WIDTH >= 768;
};