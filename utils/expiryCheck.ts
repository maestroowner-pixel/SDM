import { Alert, BackHandler } from 'react-native';
import Constants from 'expo-constants';

export const checkGiftExpiry = () => {
  const expiryDateStr = Constants.expoConfig?.extra?.giftExpiryDate;
  
  if (!expiryDateStr || expiryDateStr === '') {
    return true;
  }
  
  const expiryDate = new Date(Number(expiryDateStr));
  const now = new Date();
  
  if (now > expiryDate) { // ОШИБКА 1: Была пропущена открывающая скобка {
    Alert.alert(
      "Срок действия истек",
      "Ваша подарочная версия приложения больше недоступна.",
      [{ text: "OK", onPress: () => BackHandler.exitApp() }] // ОШИБКА 2: Не было действия для выхода
    );
    return false; // Остановка работы приложения
  }
  
  return true; // Срок еще не вышел
}; 