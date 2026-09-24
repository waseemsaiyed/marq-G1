export interface BluetoothClassicDevice {
  name: string;
  address: string; // MAC address e.g. "00:11:22:33:44:55"
  id?: string;
  class?: number;
  bonded?: boolean;
}

export interface ConnectOptions {
  address: string;
  secure?: boolean;
  uuid?: string; // Default: "00001101-0000-1000-8000-00805F9B34FB" (Standard SPP)
}

export interface WriteOptions {
  data: string | number[];
}

export interface ReadUntilOptions {
  delimiter: string;
}

export interface BluetoothClassicSerialPlugin {
  /**
   * Checks if Bluetooth adapter is enabled on the phone
   */
  isEnabled(): Promise<{ enabled: boolean }>;

  /**
   * Prompts user to enable Bluetooth (Android OS dialog)
   */
  enable(): Promise<{ enabled: boolean }>;

  /**
   * Retrieves list of already bonded / paired Bluetooth Classic devices from Android OS
   */
  getPairedDevices(): Promise<{ devices: BluetoothClassicDevice[] }>;

  /**
   * Discovers nearby unpaired Bluetooth Classic devices (starts discovery)
   */
  discoverDevices(): Promise<{ devices: BluetoothClassicDevice[] }>;

  /**
   * Cancels active device discovery
   */
  cancelDiscovery(): Promise<{ success: boolean }>;

  /**
   * Connects via RFCOMM Serial Port Profile (SPP) socket to target MAC address
   */
  connect(options: ConnectOptions): Promise<{ connected: boolean; address: string; name?: string }>;

  /**
   * Disconnects active SPP RFCOMM connection
   */
  disconnect(): Promise<{ disconnected: boolean }>;

  /**
   * Checks if currently connected to an SPP device
   */
  isConnected(): Promise<{ connected: boolean; address?: string; name?: string }>;

  /**
   * Sends raw ASCII string or byte array over active SPP RFCOMM socket
   */
  write(options: WriteOptions): Promise<{ success: boolean; bytesWritten: number }>;

  /**
   * Reads all available characters from input buffer
   */
  read(): Promise<{ data: string }>;

  /**
   * Reads buffer until a specific delimiter (e.g. newline '\n' or '\r')
   */
  readUntil(options: ReadUntilOptions): Promise<{ data: string }>;

  /**
   * Clears the input and output serial buffers
   */
  clear(): Promise<void>;

  /**
   * Adds listener for connection state changes (connected, disconnected, error)
   */
  addListener(
    eventName: 'connectionStateChange',
    listenerFunc: (state: { connected: boolean; address?: string; error?: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;

  /**
   * Adds listener for incoming serial data stream
   */
  addListener(
    eventName: 'dataReceived',
    listenerFunc: (event: { data: string; address?: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;

  /**
   * Removes all listeners
   */
  removeAllListeners(): Promise<void>;
}

// Standard Bluetooth Serial Port Profile (SPP) RFCOMM UUID
export const STANDARD_SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb';
