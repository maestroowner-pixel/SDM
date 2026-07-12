// Dialog bridge for the mobile app. DialogProvider registers the real, themed
// in-app dialog here; callers just use alertMsg/confirmAsync/chooseAsync. Falls
// back to the OS Alert only if no provider is mounted.
import { Alert } from 'react-native';

export type DialogButtonStyle = 'primary' | 'ghost' | 'destructive';

export interface DialogButton {
  text: string;
  value: string;
  style?: DialogButtonStyle;
}

export interface DialogRequest {
  title: string;
  message?: string;
  buttons: DialogButton[];
}

export interface DialogHandler {
  show: (req: DialogRequest) => Promise<string | null>;
}

let handler: DialogHandler | null = null;

export const setDialogHandler = (h: DialogHandler | null): void => { handler = h; };

export const alertMsg = (title: string, message?: string): void => {
  if (handler) {
    handler.show({ title, message, buttons: [{ text: 'OK', value: 'ok', style: 'primary' }] });
    return;
  }
  Alert.alert(title, message);
};

export const confirmAsync = async (
  title: string,
  message?: string,
  opts?: { confirmText?: string; cancelText?: string; destructive?: boolean }
): Promise<boolean> => {
  if (handler) {
    const result = await handler.show({
      title,
      message,
      buttons: [
        { text: opts?.cancelText || 'Cancel', value: 'cancel', style: 'ghost' },
        { text: opts?.confirmText || 'Confirm', value: 'ok', style: opts?.destructive ? 'destructive' : 'primary' },
      ],
    });
    return result === 'ok';
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: opts?.cancelText || 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: opts?.confirmText || 'Confirm', onPress: () => resolve(true) },
    ]);
  });
};

/** Multi-option dialog. Resolves to the chosen button's `value`. */
export const chooseAsync = async (
  title: string,
  message: string | undefined,
  buttons: DialogButton[]
): Promise<string | null> => {
  if (handler) return handler.show({ title, message, buttons });
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      buttons.map(b => ({ text: b.text, onPress: () => resolve(b.value) })),
      { cancelable: false }
    );
  });
};
