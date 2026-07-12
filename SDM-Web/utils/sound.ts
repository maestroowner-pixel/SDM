// Web build: no bundled audio (expo-audio is native). No-op stubs so screens
// that call these keep working without sound.
export const playSuccessSound = async (): Promise<void> => {};
export const playShipBellSound = async (): Promise<void> => {};
export const playErrorSound = async (): Promise<void> => {};
