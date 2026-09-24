import { registerPlugin } from '@capacitor/core';
import type { BluetoothClassicSerialPlugin } from './definitions';

export * from './definitions';

export const BluetoothClassicSerial = registerPlugin<BluetoothClassicSerialPlugin>(
  'BluetoothClassicSerial',
  {
    web: () => import('./web').then((m) => new m.BluetoothClassicSerialWeb()),
  }
);
