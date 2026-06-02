// КРИТИЧНО: импорт задачи должен быть первым —
// iOS при background fetch загружает этот файл в отдельном
// JS контексте и ищет TaskManager.defineTask в глобальном скоупе.
import './tasks/midnightTask';

import { Buffer } from 'buffer';
global.Buffer = Buffer;
import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from './app/index';

function Root() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}

registerRootComponent(Root);