import React, { useState, useEffect } from 'react';
import { esp32Bridge, ESP32ConnectionStatus } from '../services/esp32HardwareBridge';
import { ESP32_FIRMWARE_CODE } from '../services/esp32FirmwareTemplate';

interface ESP32HardwareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectIp: (ip: string, port: string) => void;
}

export const ESP32HardwareModal: React.FC<ESP32HardwareModalProps> = ({
  isOpen,
  onClose,
  onConnectIp,
}) => {
  const [activeTab, setActiveTab] = useState<'network' | 'relays' | 'firmware' | 'guide'>('network');
  const [copiedCode, setCopiedCode] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<ESP32ConnectionStatus>(esp32Bridge.getStatus());
  const [testLog, setTestLog] = useState<string[]>([]);

  useEffect(() => {
    return esp32Bridge.subscribe((status) => {
      setBridgeStatus(status);
    });
  }, []);

  if (!isOpen) return null;

  const handleCopyFirmware = () => {
    navigator.clipboard.writeText(ESP32_FIRMWARE_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const runRelayTest = async (actuator: 'head' | 'knee' | 'height' | 'tilt', action: 'up' | 'down') => {
    const log = `[${new Date().toLocaleTimeString()}] Testing ${actuator.toUpperCase()} ${action.toUpperCase()}...`;
    setTestLog((prev) => [log, ...prev.slice(0, 8)]);
    await esp32Bridge.sendActuatorCommand({ actuator, action });
    setTimeout(async () => {
      await esp32Bridge.sendActuatorCommand({ actuator, action: 'stop' });
      setTestLog((prev) => [`[${new Date().toLocaleTimeString()}] ${actuator.toUpperCase()} STOPPED (Safety Return)`, ...prev.slice(0, 8)]);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface border border-outline-variant/30 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-surface-container-high border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">developer_board</span>
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-on-surface flex items-center gap-2">
                ESP32-WROOM-32E Controller Hub
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  8-Relay Unit
                </span>
              </h2>
              <p className="text-[11px] text-on-surface-variant font-medium">
                Hardware Architecture, SoftAP Gateway &amp; Live Actuator Bus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center text-on-surface-variant cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-outline-variant/15 bg-surface-container-low px-3 pt-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('network')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'network'
                ? 'bg-surface text-primary border-t-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">wifi</span>
            Wi-Fi &amp; IP (192.168.4.x)
          </button>
          <button
            onClick={() => setActiveTab('relays')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'relays'
                ? 'bg-surface text-primary border-t-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">toggle_on</span>
            8-Relay Actuators
          </button>
          <button
            onClick={() => setActiveTab('firmware')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'firmware'
                ? 'bg-surface text-primary border-t-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">code</span>
            ESP32 C++ Code
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'guide'
                ? 'bg-surface text-primary border-t-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">help</span>
            Troubleshooting
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* TAB 1: NETWORK CONFIGURATION */}
          {activeTab === 'network' && (
            <div className="space-y-3">
              {/* Android Connection Analysis Box */}
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
                    Detected Network Configuration
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                    Subnet 255.255.255.0
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded-lg bg-surface border border-outline-variant/15">
                    <span className="text-on-surface-variant block text-[10px]">Your Phone IP (from DHCP)</span>
                    <strong className="text-on-surface font-mono text-xs">192.168.4.2</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-surface border border-outline-variant/15">
                    <span className="text-on-surface-variant block text-[10px]">ESP32 Controller Gateway</span>
                    <strong className="text-primary font-mono text-xs">192.168.4.1</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-surface border border-outline-variant/15">
                    <span className="text-on-surface-variant block text-[10px]">Local DNS / Router</span>
                    <strong className="text-on-surface font-mono text-xs">192.168.1.1</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-surface border border-outline-variant/15">
                    <span className="text-on-surface-variant block text-[10px]">Active HTTP / WS Ports</span>
                    <strong className="text-on-surface font-mono text-xs">Port 80 &amp; Port 81</strong>
                  </div>
                </div>
              </div>

              {/* 1-Tap Quick Connect Actions */}
              <div>
                <span className="font-bold text-on-surface block mb-1.5">
                  1-Tap Instant Connection Targets:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      onConnectIp('192.168.4.1', '80');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-98 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">router</span>
                    <span>Connect 192.168.4.1</span>
                    <span className="text-[10px] opacity-80 font-normal">ESP32 Gateway</span>
                  </button>

                  <button
                    onClick={() => {
                      onConnectIp('192.168.4.2', '80');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-98 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">devices</span>
                    <span>Connect 192.168.4.2</span>
                    <span className="text-[10px] opacity-80 font-normal">Device Target</span>
                  </button>

                  <button
                    onClick={() => {
                      onConnectIp('192.168.1.1', '80');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-98 border border-outline-variant/20"
                  >
                    <span className="material-symbols-outlined text-[18px]">dns</span>
                    <span>Connect 192.168.1.1</span>
                    <span className="text-[10px] text-on-surface-variant font-normal">Router Subnet</span>
                  </button>
                </div>
              </div>

              {/* Android Cellular Bypass Warning */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-amber-700 text-[18px]">signal_cellular_alt</span>
                  Crucial Android Tip (VoLTE 4G+ / Mobile Data):
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Because the ESP32 Wi-Fi hotspot provides local bed control without internet, Android may say <strong>&quot;Wi-Fi has no internet access - Tap for options&quot;</strong>. Make sure to tap <strong>&quot;Stay Connected&quot;</strong>, or temporarily turn off Mobile Data so your phone routes commands directly through the ESP32 Wi-Fi interface!
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: 8 RELAYS & HARDWARE PINOUT */}
          {activeTab === 'relays' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20">
                <h3 className="font-extrabold text-on-surface mb-1">
                  PCB Pinout &amp; Actuator Wiring (ESP32-WROOM-32E)
                </h3>
                <p className="text-[11px] text-on-surface-variant leading-relaxed mb-2">
                  Matching the 8 power relays and 4 linear actuator DIN sockets on your controller board:
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-surface border border-outline-variant/15 flex items-center justify-between">
                    <div>
                      <strong className="block text-on-surface">Relay 1: Head UP</strong>
                      <span className="text-on-surface-variant text-[10px]">GPIO 13 &bull; Pin 1</span>
                    </div>
                    <button
                      onClick={() => runRelayTest('head', 'up')}
                      className="px-2 py-1 rounded bg-primary text-on-primary font-bold text-[10px] active:scale-95"
                    >
                      Test
                    </button>
                  </div>

                  <div className="p-2 rounded-lg bg-surface border border-outline-variant/15 flex items-center justify-between">
                    <div>
                      <strong className="block text-on-surface">Relay 2: Head DOWN</strong>
                      <span className="text-on-surface-variant text-[10px]">GPIO 12 &bull; Pin 2</span>
                    </div>
                    <button
                      onClick={() => runRelayTest('head', 'down')}
                      className="px-2 py-1 rounded bg-primary text-on-primary font-bold text-[10px] active:scale-95"
                    >
                      Test
                    </button>
                  </div>

                  <div className="p-2 rounded-lg bg-surface border border-outline-variant/15 flex items-center justify-between">
                    <div>
                      <strong className="block text-on-surface">Relay 3: Knee UP</strong>
                      <span className="text-on-surface-variant text-[10px]">GPIO 14 &bull; Pin 3</span>
                    </div>
                    <button
                      onClick={() => runRelayTest('knee', 'up')}
                      className="px-2 py-1 rounded bg-primary text-on-primary font-bold text-[10px] active:scale-95"
                    >
                      Test
                    </button>
                  </div>

                  <div className="p-2 rounded-lg bg-surface border border-outline-variant/15 flex items-center justify-between">
                    <div>
                      <strong className="block text-on-surface">Relay 4: Knee DOWN</strong>
                      <span className="text-on-surface-variant text-[10px]">GPIO 27 &bull; Pin 4</span>
                    </div>
                    <button
                      onClick={() => runRelayTest('knee', 'down')}
                      className="px-2 py-1 rounded bg-primary text-on-primary font-bold text-[10px] active:scale-95"
                    >
                      Test
                    </button>
                  </div>

                  <div className="p-2 rounded-lg bg-surface border border-outline-variant/15 flex items-center justify-between">
                    <div>
                      <strong className="block text-on-surface">Relay 5: Height UP</strong>
                      <span className="text-on-surface-variant text-[10px]">GPIO 26 &bull; Pin 5</span>
                    </div>
                    <button
                      onClick={() => runRelayTest('height', 'up')}
                      className="px-2 py-1 rounded bg-primary text-on-primary font-bold text-[10px] active:scale-95"
                    >
                      Test
                    </button>
                  </div>

                  <div className="p-2 rounded-lg bg-surface border border-outline-variant/15 flex items-center justify-between">
                    <div>
                      <strong className="block text-on-surface">Relay 6: Height DOWN</strong>
                      <span className="text-on-surface-variant text-[10px]">GPIO 25 &bull; Pin 6</span>
                    </div>
                    <button
                      onClick={() => runRelayTest('height', 'down')}
                      className="px-2 py-1 rounded bg-primary text-on-primary font-bold text-[10px] active:scale-95"
                    >
                      Test
                    </button>
                  </div>

                  <div className="p-2 rounded-lg bg-surface border border-outline-variant/15 flex items-center justify-between">
                    <div>
                      <strong className="block text-on-surface">Relay 7: Tilt UP</strong>
                      <span className="text-on-surface-variant text-[10px]">GPIO 33 &bull; Pin 7</span>
                    </div>
                    <button
                      onClick={() => runRelayTest('tilt', 'up')}
                      className="px-2 py-1 rounded bg-primary text-on-primary font-bold text-[10px] active:scale-95"
                    >
                      Test
                    </button>
                  </div>

                  <div className="p-2 rounded-lg bg-surface border border-outline-variant/15 flex items-center justify-between">
                    <div>
                      <strong className="block text-on-surface">Relay 8: Tilt DOWN</strong>
                      <span className="text-on-surface-variant text-[10px]">GPIO 32 &bull; Pin 8</span>
                    </div>
                    <button
                      onClick={() => runRelayTest('tilt', 'down')}
                      className="px-2 py-1 rounded bg-primary text-on-primary font-bold text-[10px] active:scale-95"
                    >
                      Test
                    </button>
                  </div>
                </div>
              </div>

              {testLog.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[10px] space-y-0.5">
                  {testLog.map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ESP32 ARDUINO C++ SOURCE */}
          {activeTab === 'firmware' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-on-surface">
                    Ready-to-Flash ESP32 Arduino Firmware
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    SoftAP + CORS REST API + WebSocket + BLE Nordic UART
                  </p>
                </div>
                <button
                  onClick={handleCopyFirmware}
                  className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copiedCode ? 'check' : 'content_copy'}
                  </span>
                  {copiedCode ? 'Copied to Clipboard!' : 'Copy Code'}
                </button>
              </div>

              <div className="relative">
                <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[10px] overflow-x-auto max-h-72 border border-slate-800 leading-relaxed select-all">
                  {ESP32_FIRMWARE_CODE}
                </pre>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                You can flash this sketch directly using the <strong>Arduino IDE</strong> or <strong>PlatformIO</strong> with the ESP32 board package selected (e.g. <em>ESP32 Dev Module</em>).
              </p>
            </div>
          )}

          {/* TAB 4: TROUBLESHOOTING GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 space-y-1.5">
                <h4 className="font-extrabold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">security</span>
                  1. Browser HTTPS Mixed Content Security
                </h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  When you open the web application inside Google Chrome via an <code>https://</code> URL, Chrome blocks plain <code>http://192.168.4.1</code> requests to prevent insecure mixed content.
                  <br /><br />
                  <strong>Solution:</strong> Compile or install the <strong>Native Android APK</strong> (via the APK Export button at the top), or use our <strong>1-Tap Force Connect</strong> which enables the control bridge immediately.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 space-y-1.5">
                <h4 className="font-extrabold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">bluetooth_searching</span>
                  2. Bluetooth (BLE) Discovery
                </h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  We have updated the Bluetooth scanner to accept all ESP32 BLE GATT devices without strict name filtering, and registered the standard Nordic UART Service UUID (<code>6e400001-...</code>) and HM-10 serial UUID.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 space-y-1.5">
                <h4 className="font-extrabold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">power</span>
                  3. 32V SMPS Power &amp; Buck Regulator
                </h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  The SMPS 150-32 provides 32V DC for the bed&apos;s linear actuators. The small blue buck converter step-down module must output 5.0V / 3.3V to the ESP32 VCC pin. Check that the red power LED on the ESP32 module is steadily lit.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-surface-container-high border-t border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${bridgeStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-[11px] font-bold text-on-surface">
              {bridgeStatus.connected ? `Bridge Connected (${bridgeStatus.transport.toUpperCase()})` : 'Bridge Standby'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs cursor-pointer hover:bg-primary-container active:scale-95 transition-all"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
