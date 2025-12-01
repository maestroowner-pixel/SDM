import { Audio } from 'expo-av';

let successSound: Audio.Sound | null = null;

export const playSuccessSound = async () => {
  try {
    if (successSound) {
      await successSound.replayAsync();
    } else {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/success.mp3')
      );
      successSound = sound;
      await sound.playAsync();
    }
  } catch (error) {
    console.log('Sound playback error:', error);
  }
};

export const unloadSound = async () => {
  if (successSound) {
    await successSound.unloadAsync();
    successSound = null;
  }
};
