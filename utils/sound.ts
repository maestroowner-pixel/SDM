import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// Инициализация аудио режима
setAudioModeAsync({
  playsInSilentModeIOS: true,
  staysActiveInBackground: false,
  shouldDuckAndroid: true,
}).catch(() => {});

// ─── Универсальный хелпер ────────────────────────────────────────────────────
const playSound = async (source: any, volume = 0.6): Promise<void> => {
  try {
    const player = createAudioPlayer(source);
    player.volume = volume;
    player.play();

    // Освобождаем ресурсы после окончания
    const check = setInterval(() => {
      if (!player.playing) {
        player.release();
        clearInterval(check);
      }
    }, 300);
  } catch (error) {
    console.log('Sound playback error:', error);
  }
};

// Звук успеха
export const playSuccessSound = async (): Promise<void> => {
  await playSound(require('../assets/sounds/success.mp3'), 0.5);
};

// Мягкий звук судового колокола (для splash screen)
export const playShipBellSound = async (): Promise<void> => {
  try {
    await playSound(require('../assets/sounds/ship-bell.mp3'), 0.6);
  } catch {
    await playSuccessSound();
  }
};

// Звук ошибки
export const playErrorSound = async (): Promise<void> => {
  await playSound(require('../assets/sounds/error.mp3'), 0.4);
};