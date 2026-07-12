// Web-safe replacements for react-native's Alert (RN-web's Alert.alert is a no-op).
const join = (title: string, message?: string) =>
  [title, message].filter(Boolean).join('\n\n');

export const alertMsg = (title: string, message?: string): void => {
  if (typeof window !== 'undefined' && window.alert) window.alert(join(title, message));
};

export const confirmAsync = (title: string, message?: string): boolean => {
  if (typeof window !== 'undefined' && window.confirm) return window.confirm(join(title, message));
  return false;
};
