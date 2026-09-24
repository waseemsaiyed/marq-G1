import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { MarqLogo } from './MarqLogo';

interface ApkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkExportModal: React.FC<ApkExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'instant' | 'compile' | 'fix'>('compile');
  const [compileSubTab, setCompileSubTab] = useState<'github' | 'local'>('github');
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedYml, setCopiedYml] = useState(false);

  if (!isOpen) return null;

  const scriptCommands = `# 1. Make the build script executable
chmod +x build-apk.sh

# 2. Run the automated APK generator
./build-apk.sh`;

  const githubYmlPreview = `name: Build Android APK
on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '21' }
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm install --legacy-peer-deps
      - run: npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor-community/bluetooth-le
      - run: npm run build
      - run: npx cap add android || true
      - run: node scripts/update-manifest.js
      - run: npx cap sync android
      - run: node scripts/update-manifest.js
      - run: chmod +x android/gradlew && cd android && ./gradlew assembleDebug --no-daemon
      - uses: actions/upload-artifact@v4
        with:
          name: MarQ-Clinical-Remote-debug-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk`;

  const copyScript = () => {
    navigator.clipboard.writeText(scriptCommands);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const copyYml = () => {
    navigator.clipboard.writeText(githubYmlPreview);
    setCopiedYml(true);
    setTimeout(() => setCopiedYml(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-surface-container-lowest rounded-2xl w-full max-w-md p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-outline-variant/15">
          <div className="flex items-center gap-2.5">
            <MarqLogo height={24} className="text-on-surface" />
            <div className="h-4 w-px bg-outline-variant/30" />
            <div>
              <h2 className="text-sm font-extrabold text-on-surface">
                Android APK &amp; Hardware
              </h2>
              <p className="text-[10px] text-on-surface-variant font-medium">
                Direct BLE &amp; Local ESP32 Wi-Fi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-variant cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-surface-container rounded-xl">
          <button
            onClick={() => setActiveTab('fix')}
            className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'fix'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              build
            </span>
            Fix BLE / Wi-Fi
          </button>
          <button
            onClick={() => setActiveTab('compile')}
            className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'compile'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              terminal
            </span>
            Build .APK
          </button>
          <button
            onClick={() => setActiveTab('instant')}
            className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'instant'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              install_mobile
            </span>
            PWA Install
          </button>
        </div>

        {/* Tab 1: Fix Bluetooth & Wi-Fi in APK */}
        {activeTab === 'fix' && (
          <div className="flex flex-col gap-3">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex flex-col gap-1">
              <span className="font-extrabold text-primary text-xs flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">
                  check_circle
                </span>
                Why Controllers Weren&apos;t Found &amp; How It&apos;s Fixed
              </span>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                When running inside an Android APK, two common OS restrictions block connections by default:
              </p>
            </div>

            {/* Issue 1: Bluetooth Classic SPP & BLE */}
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[11px] font-extrabold">
                  1
                </span>
                <span className="text-xs font-bold text-on-surface">
                  Bluetooth Classic SPP &amp; BLE Dual Support
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed pl-7">
                The APK now includes a native <strong>Bluetooth Classic SPP Capacitor Plugin</strong> (RFCOMM socket, UUID 0x1101).
                If paired in your phone&apos;s Bluetooth settings, it connects instantly with zero-lag response!
                For BLE, ensure <strong>&quot;Nearby devices&quot;</strong> and <strong>Location (GPS)</strong> permissions are granted.
              </p>
            </div>

            {/* Issue 2: Cleartext Wi-Fi */}
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[11px] font-extrabold">
                  2
                </span>
                <span className="text-xs font-bold text-on-surface">
                  Cleartext HTTP Allowed for ESP32 (192.168.x.x)
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed pl-7">
                Android blocks plain HTTP to local IP addresses by default. We have updated <code className="font-mono text-primary font-bold">capacitor.config.json</code> with <code className="font-mono">&quot;cleartext&quot;: true</code> so your phone can freely communicate with the ESP32 bed hub at <code className="font-mono">192.168.4.1</code> or on your local router!
              </p>
            </div>

            {/* Issue 3: 1-Tap Manual Override */}
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[11px] font-extrabold">
                  3
                </span>
                <span className="text-xs font-bold text-on-surface">
                  Instant Pairing Overrides Added
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed pl-7">
                On the Pairing screen, you can now use:
                <br />
                • <strong>Connect to ESP32 AP (192.168.4.1)</strong> for instant hotspot link
                <br />
                • <strong>Scan Local Wi-Fi Subnet</strong> to find any ESP32 on your router
                <br />
                • <strong>Manual Tab</strong> to force link any bed by Name or MAC address!
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Compile .APK with Capacitor & GitHub Actions */}
        {activeTab === 'compile' && (
          <div className="flex flex-col gap-3">
            {/* Sub-selector between GitHub Actions and Local script */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-surface-container rounded-lg">
              <button
                onClick={() => setCompileSubTab('github')}
                className={`py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  compileSubTab === 'github'
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  cloud_upload
                </span>
                GitHub Actions
              </button>
              <button
                onClick={() => setCompileSubTab('local')}
                className={`py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  compileSubTab === 'local'
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  terminal
                </span>
                Local Bash Script
              </button>
            </div>

            {compileSubTab === 'github' ? (
              <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-2.5 border border-outline-variant/15 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-on-surface block">
                      .github/workflows/build-apk.yml
                    </span>
                    <span className="text-[10px] text-on-surface-variant">
                      Auto-compiles APK on every push or manual dispatch
                    </span>
                  </div>
                  <button
                    onClick={copyYml}
                    className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer bg-primary/10 px-2 py-1 rounded"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      content_copy
                    </span>
                    {copiedYml ? 'Copied!' : 'Copy Workflow'}
                  </button>
                </div>

                <div className="p-2 rounded bg-surface-container-lowest border border-outline-variant/20 text-[11px] text-on-surface-variant flex flex-col gap-1">
                  <span><strong>1. How it works:</strong> Push your project to GitHub.</span>
                  <span><strong>2. Automated Run:</strong> GitHub Actions spins up an Android Ubuntu runner with Java 17, compiles the web app, syncs Capacitor, and builds the debug APK via Gradle.</span>
                  <span><strong>3. Download APK:</strong> In your GitHub repository, click <strong>Actions &gt; Build &amp; Package Android APK &gt; Artifacts</strong> to download <code className="font-mono text-primary font-bold">MarQ-Clinical-Remote-debug-apk.zip</code>!</span>
                </div>

                <pre className="bg-surface-container-highest p-2.5 rounded-lg font-mono text-[9px] text-on-surface overflow-x-auto whitespace-pre leading-relaxed max-h-36">
                  {githubYmlPreview}
                </pre>
              </div>
            ) : (
              <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-2 border border-outline-variant/15 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-on-surface">
                    Local Terminal Commands:
                  </span>
                  <button
                    onClick={copyScript}
                    className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer bg-primary/10 px-2 py-1 rounded"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      content_copy
                    </span>
                    {copiedScript ? 'Copied!' : 'Copy Commands'}
                  </button>
                </div>

                <pre className="bg-surface-container-highest p-2.5 rounded-lg font-mono text-[10px] text-on-surface overflow-x-auto whitespace-pre leading-relaxed">
                  {scriptCommands}
                </pre>

                <div className="text-[11px] text-on-surface-variant mt-1">
                  The script will output <code className="font-mono font-bold text-primary">app-debug.apk</code> directly into <code className="font-mono">android/app/build/outputs/apk/debug/</code> with native BLE &amp; Wi-Fi permissions ready to install!
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Instant Install / WebAPK */}
        {activeTab === 'instant' && (
          <div className="flex flex-col gap-3">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">
                verified
              </span>
              <div className="text-xs text-on-surface">
                <span className="font-extrabold text-primary block">
                  Android Chrome WebAPK Alternative
                </span>
                <span className="text-on-surface-variant text-[11px] leading-relaxed block mt-0.5">
                  You can also install this web app directly via Android Chrome. It runs in full screen without the browser URL bar, works completely offline, and connects to your local bed over Wi-Fi!
                </span>
              </div>
            </div>

            {isInstalled ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-xs font-bold">
                <span className="material-symbols-outlined text-emerald-600">
                  check_circle
                </span>
                Application is already installed on this device!
              </div>
            ) : isInstallable ? (
              <button
                onClick={install}
                className="w-full h-11 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98"
              >
                <span className="material-symbols-outlined text-[18px]">
                  download
                </span>
                Install PWA on This Device
              </button>
            ) : (
              <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-2 border border-outline-variant/15">
                <span className="text-xs font-bold text-on-surface">
                  How to install in Chrome:
                </span>
                <ol className="text-[12px] text-on-surface-variant flex flex-col gap-1.5 list-decimal pl-4">
                  <li>
                    Tap the <strong>three dots menu (⋮)</strong> in Chrome at the top-right.
                  </li>
                  <li>
                    Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home Screen&quot;</strong>.
                  </li>
                  <li>
                    Tap <strong>Install</strong> to add the icon to your home screen.
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="min-h-[44px] w-full rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface font-bold text-xs uppercase cursor-pointer transition-colors"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
