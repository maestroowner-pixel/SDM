import { Alert, BackHandler } from 'react-native';
import { alertMsg, chooseAsync } from './dialog';
import Constants from 'expo-constants';

export const checkGiftExpiry = () => {
  const expiryDateStr = Constants.expoConfig?.extra?.giftExpiryDate;
  
  if (!expiryDateStr || expiryDateStr === '') {
    return true;
  }
  
  const expiryDate = new Date(Number(expiryDateStr));
  const now = new Date();
  
  if (now > expiryDate) { // ОШИБКА 1: Была пропущена открывающая скобка {
    chooseAsync(
      "Срок действия истек",
      "Ваша подарочная версия приложения больше недоступна.",
      [{ text: "OK", value: 'ok', style: 'primary' }]
    ).then(() => BackHandler.exitApp());
    return false; // Остановка работы приложения
  }
  
  return true; // Срок еще не вышел
}; 