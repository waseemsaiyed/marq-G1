import { WebPlugin } from '@capacitor/core';
import {
  BluetoothClassicDevice,
  BluetoothClassicSerialPlugin,
  ConnectOptions,
  ReadUntilOptions,
  STANDARD_SPP_UUID,
  WriteOptions,
} from './definitions';

const WEB_PAIRED_DEVICES_KEY = 'marq_bt_classic_web_paired';

export class BluetoothClassicSerialWeb
  extends WebPlugin
  implements BluetoothClassicSerialPlugin
{
  private connected: boolean = false;
  private currentAddress: string = '';
  private currentName: string = '';
  private buffer: string = '';
  private mockTelemetryTimer: any = null;

  constructor() {
    super();
  }

  async isEnabled(): Promise<{ enabled: boolean }> {
    return { enabled: true };
  }

  async enable(): Promise<{ enabled: boolean }> {
    return { enabled: true };
  }

  async getPairedDevices(): Promise<{ devices: BluetoothClassicDevice[] }> {
    // 1. Check local storage for mock/cached paired devices
    let saved: BluetoothClassicDevice[] = [];
    try {
      const raw = localStorage.getItem(WEB_PAIRED_DEVICES_KEY);
      if (raw) {
        saved = JSON.parse(raw);
      }
    } catch {
      // Ignore
    }

    if (saved.length === 0) {
      // Provide default candidate controller for ESP32 Bluetooth Classic
      saved = [
        {
          name: 'ESP32_Bed_Controller',
          address: '24:0A:C4:58:91:A2',
          id: '24:0A:C4:58:91:A2',
          class: 7936, // Uncategorized device
          bonded: true,
        },
        {
          name: 'MARQ-ESP32-SPP',
          address: 'A4:CF:12:87:6D:4E',
          id: 'A4:CF:12:87:6D:4E',
          class: 7936,
          bonded: true,
        },
      ];
      try {
        localStorage.setItem(WEB_PAIRED_DEVICES_KEY, JSON.stringify(saved));
      } catch {
        // Ignore
      }
    }

    return { devices: saved };
  }

  async discoverDevices(): Promise<{ devices: BluetoothClassicDevice[] }> {
    const { devices } = await this.getPairedDevices();
    return { devices };
  }

  async cancelDiscovery(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async connect(
    options: ConnectOptions
  ): Promise<{ connected: boolean; address: string; name?: string }> {
    const { address, uuid = STANDARD_SPP_UUID } = options;
    console.log(
      `[BluetoothClassicWeb] Simulating RFCOMM SPP connection to ${address} using UUID ${uuid}`
    );

    this.connected = true;
    this.currentAddress = address;
    const { devices } = await this.getPairedDevices();
    const found = devices.find((d) => d.address === address);
    this.currentName = found?.name || 'ESP32 Bluetooth SPP';

    this.notifyListeners('connectionStateChange', {
      connected: true,
      address: this.currentAddress,
    });

    // Start periodic heartbeat telemetry simulation for web preview
    if (this.mockTelemetryTimer) {
      clearInterval(this.mockTelemetryTimer);
    }
    this.mockTelemetryTimer = setInterval(() => {
      if (this.connected) {
        const mockPacket = JSON.stringify({
          type: 'telemetry',
          source: 'SPP_RFCOMM',
          time: Date.now(),
          status: 'OK',
        }) + '\n';
        this.buffer += mockPacket;
        this.notifyListeners('dataReceived', {
          data: mockPacket,
          address: this.currentAddress,
        });
      }
    }, 4000);

    return {
      connected: true,
      address: this.currentAddress,
      name: this.currentName,
    };
  }

  async disconnect(): Promise<{ disconnected: boolean }> {
    console.log(`[BluetoothClassicWeb] Disconnecting SPP socket from ${this.currentAddress}`);
    if (this.mockTelemetryTimer) {
      clearInterval(this.mockTelemetryTimer);
      this.mockTelemetryTimer = null;
    }
    const wasAddress = this.currentAddress;
    this.connected = false;
    this.currentAddress = '';
    this.currentName = '';
    this.buffer = '';

    this.notifyListeners('connectionStateChange', {
      connected: false,
      address: wasAddress,
    });

    return { disconnected: true };
  }

  async isConnected(): Promise<{
    connected: boolean;
    address?: string;
    name?: string;
  }> {
    return {
      connected: this.connected,
      address: this.connected ? this.currentAddress : undefined,
      name: this.connected ? this.currentName : undefined,
    };
  }

  async write(
    options: WriteOptions
  ): Promise<{ success: boolean; bytesWritten: number }> {
    const text =
      typeof options.data === 'string'
        ? options.data
        : new TextDecoder().decode(new Uint8Array(options.data));

    console.log(`[BluetoothClassicWeb Tx SPP] -> ${text.trim()}`);

    // If connected, simulate immediate hardware acknowledgement
    if (this.connected) {
      setTimeout(() => {
        const ack = `ACK:${text.trim()}\n`;
        this.buffer += ack;
        this.notifyListeners('dataReceived', {
          data: ack,
          address: this.currentAddress,
        });
      }, 50);
    }

    return {
      success: true,
      bytesWritten: typeof options.data === 'string' ? options.data.length : options.data.length,
    };
  }

  async read(): Promise<{ data: string }> {
    const out = this.buffer;
    this.buffer = '';
    return { data: out };
  }

  async readUntil(options: ReadUntilOptions): Promise<{ data: string }> {
    const idx = this.buffer.indexOf(options.delimiter);
    if (idx === -1) {
      return { data: '' };
    }
    const result = this.buffer.slice(0, idx + options.delimiter.length);
    this.buffer = this.buffer.slice(idx + options.delimiter.length);
    return { data: result };
  }

  async clear(): Promise<void> {
    this.buffer = '';
  }
}
