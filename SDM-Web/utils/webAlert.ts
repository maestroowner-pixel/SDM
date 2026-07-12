// Dialog bridge. Screens keep calling alertMsg/confirmAsync; DialogProvider
// registers the real, in-app themed dialog here at mount. Falls back to the
// browser's native window.alert/confirm only if no provider is mounted.
export interface ConfirmOptions {
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export interface DialogHandler {
  alert: (title: string, message?: string) => void;
  confirm: (title: string, message: string | undefined, opts?: ConfirmOptions) => Promise<boolean>;
}

let handler: DialogHandler | null = null;

export const setDialogHandler = (h: DialogHandler | null): void => { handler = h; };

const join = (title: string, message?: string) => [title, message].filter(Boolean).join('\n\n');

export const alertMsg = (title: string, message?: string): void => {
  if (handler) { handler.alert(title, message); return; }
  if (typeof window !== 'undefined' && window.alert) window.alert(join(title, message));
};

export const confirmAsync = async (
  title: string,
  message?: string,
  opts?: ConfirmOptions
): Promise<boolean> => {
  if (handler) return handler.confirm(title, message, opts);
  if (typeof window !== 'undefined' && window.confirm) return window.confirm(join(title, message));
  return false;
};
