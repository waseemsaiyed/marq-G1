/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BedState, ScreenType, PatientChartTabKey } from './types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { NurseCallModal } from './components/NurseCallModal';
import { EStopModal } from './components/EStopModal';
import { ApkExportModal } from './components/ApkExportModal';
import { PatientChartModal } from './components/PatientChartModal';
import { HomeDashboard } from './screens/HomeDashboard';
import { ComfortScreen } from './screens/ComfortScreen';
import { AdvancedScreen } from './screens/AdvancedScreen';
import { PairScreen } from './screens/PairScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { removePairedDevice } from './services/pairedDevicesStorage';
import {
  autoDetectAndAdoptAllHardware,
  UnifiedAutoAdoptResult,
} from './services/autoHardwareConnect';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [isNurseModalOpen, setIsNurseModalOpen] = useState(false);
  const [isEStopModalOpen, setIsEStopModalOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientModalTab, setPatientModalTab] = useState<PatientChartTabKey>('mass');
  const [autoAdoptNotice, setAutoAdoptNotice] = useState<UnifiedAutoAdoptResult | null>(null);

  // Auto-detect and adopt Wi-Fi or phone Bluetooth controller if already connected/paired
  useEffect(() => {
    let isMounted = true;
    autoDetectAndAdoptAllHardware().then((result) => {
      if (isMounted && result && result.adopted) {
        setAutoAdoptNotice(result);
        setBedState((prev) => ({
          ...prev,
          connectedBedId: result.primaryDeviceName,
          bleSynced: result.mode === 'ble' || result.mode === 'dual',
          wifiConnected: result.mode === 'wifi' || result.mode === 'dual',
        }));
        setTimeout(() => {
          if (isMounted) setAutoAdoptNotice(null);
        }, 9000);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Register PWA Service Worker if in browser
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      import('virtual:pwa-register')
        .then(({ registerSW }) => {
          registerSW({ immediate: true });
        })
        .catch(() => {
          // Virtual module unavailable during non-PWA dev builds
        });
    }
  }, []);

  // Shared Bed Telemetry & Hardware State
  const [bedState, setBedState] = useState<BedState>({
    headAngle: 45,
    kneeAngle: 25,
    overallHeight: 58,
    tiltAngle: -12,
    activePreset: 'cardiac',
    isSafetyLocked: true,
    eStopTriggered: false,
    nurseCallActive: false,
    rails: {
      headLeft: true,
      headRight: true,
      footLeft: true,
      footRight: false, // Down / Alert initially
    },
    castersLocked: true,
    patientWeight: 68.4,
    tareOffset: -2.1,
    presenceArmed: true,
    underBedLight: {
      enabled: true,
      hue: 'amber',
      brightness: 45,
      motionSensor: true,
    },
    connectedBedId: 'ICU Bed 03',
    patientName: 'J. Anderson',
    roomNumber: 'Room 412',
    batteryPercent: 88,
    lowBatteryThreshold: 20,
    isCharging: true,
    bleSynced: true,
    wifiConnected: true,
    hapticFeedback: 'strong',
    voiceEnabled: true,
    highContrast: false,
  });

  const handleTriggerEStop = () => {
    setBedState((prev) => ({ ...prev, eStopTriggered: true }));
    setIsEStopModalOpen(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const handleResetEStop = () => {
    setBedState((prev) => ({ ...prev, eStopTriggered: false }));
    setIsEStopModalOpen(false);
  };

  const handleTriggerNurseCall = () => {
    setIsNurseModalOpen(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }
  };

  const handleSwitchBed = (bedId: string, room: string, patient: string) => {
    setBedState((prev) => ({
      ...prev,
      connectedBedId: bedId,
      roomNumber: room,
      patientName: patient,
    }));
  };

  const handleUnpairBed = (bedId: string) => {
    removePairedDevice(bedId);
    if (bedState.connectedBedId === bedId) {
      setBedState((prev) => ({
        ...prev,
        connectedBedId: '',
        roomNumber: 'No Bed Paired',
        patientName: 'Unassigned',
        bleSynced: false,
        wifiConnected: false,
      }));
    }
  };

  const isLowBattery = bedState.batteryPercent < (bedState.lowBatteryThreshold ?? 20);

  const handleOpenPatientChart = (tab?: PatientChartTabKey) => {
    if (tab) {
      setPatientModalTab(tab);
    }
    setIsPatientModalOpen(true);
  };

  return (
    <div
      className={`min-h-screen flex flex-col bg-surface text-on-surface font-sans selection:bg-primary/20 ${
        bedState.highContrast ? 'contrast-125' : ''
      }`}
    >
      {/* Top Header with APK Launcher Button */}
      <Header
        bedState={bedState}
        onTriggerEStop={handleTriggerEStop}
        onSwitchBed={handleSwitchBed}
        onOpenApkModal={() => setIsApkModalOpen(true)}
        onToggleCharging={() =>
          setBedState((prev) => ({ ...prev, isCharging: !prev.isCharging }))
        }
        onNavigateToPair={() => setCurrentScreen('pair')}
        onUnpairBed={handleUnpairBed}
        onOpenPatientChart={handleOpenPatientChart}
      />

      {/* Main Screen Content */}
      <main
        className={`flex-1 w-full px-4 sm:px-5 ${
          isLowBattery ? 'pt-44' : 'pt-32'
        } pb-36 max-w-lg mx-auto transition-all duration-200`}
      >
        {/* Hardware Auto-Adopted Notification (Wi-Fi or Bluetooth) */}
        {autoAdoptNotice && (
          <div className="mb-3.5 p-3 rounded-xl bg-primary text-on-primary shadow-md border border-primary-container/30 flex items-center justify-between gap-2.5 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-[20px]">
                  {autoAdoptNotice.mode === 'dual'
                    ? 'hub'
                    : autoAdoptNotice.mode === 'wifi'
                    ? 'wifi'
                    : 'bluetooth_connected'}
                </span>
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold leading-tight">
                    {autoAdoptNotice.mode === 'dual'
                      ? 'Dual-Link Auto-Connected'
                      : autoAdoptNotice.mode === 'wifi'
                      ? 'Wi-Fi Controller Auto-Connected'
                      : 'Phone Bluetooth Auto-Linked'}
                  </span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-white/25 uppercase tracking-wider">
                    {autoAdoptNotice.mode === 'dual'
                      ? 'Wi-Fi + BLE'
                      : autoAdoptNotice.mode === 'wifi'
                      ? 'SoftAP / LAN'
                      : 'OS Paired'}
                  </span>
                </div>
                <p className="text-[11px] text-white/90 leading-tight mt-0.5">
                  <strong>{autoAdoptNotice.primaryDeviceName}</strong>: {autoAdoptNotice.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => setAutoAdoptNotice(null)}
              className="p-1 rounded-full hover:bg-white/20 text-white cursor-pointer transition-colors shrink-0"
              title="Dismiss notification"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {currentScreen === 'home' && (
          <HomeDashboard
            bedState={bedState}
            setBedState={setBedState}
            onTriggerEStop={handleTriggerEStop}
            onTriggerNurseCall={handleTriggerNurseCall}
            onOpenPatientChart={handleOpenPatientChart}
          />
        )}

        {currentScreen === 'comfort' && (
          <ComfortScreen
            bedState={bedState}
            setBedState={setBedState}
            onTriggerEStop={handleTriggerEStop}
            onTriggerNurseCall={handleTriggerNurseCall}
            onOpenPatientChart={handleOpenPatientChart}
          />
        )}

        {currentScreen === 'advanced' && (
          <AdvancedScreen
            bedState={bedState}
            setBedState={setBedState}
            onTriggerEStop={handleTriggerEStop}
            onTriggerNurseCall={handleTriggerNurseCall}
          />
        )}

        {currentScreen === 'pair' && (
          <PairScreen
            bedState={bedState}
            setBedState={setBedState}
            onPairSuccess={() => setCurrentScreen('home')}
            onOpenApkModal={() => setIsApkModalOpen(true)}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen
            bedState={bedState}
            setBedState={setBedState}
            onTriggerEStop={handleTriggerEStop}
            onOpenApkModal={() => setIsApkModalOpen(true)}
            onNavigateToPair={() => setCurrentScreen('pair')}
            onOpenPatientChart={handleOpenPatientChart}
          />
        )}
      </main>

      {/* Floating Nurse Call Button */}
      <div className="fixed bottom-24 right-4 sm:right-6 z-40">
        <button
          id="floating-nurse-call-btn"
          onClick={handleTriggerNurseCall}
          className="h-[58px] px-5 rounded-full bg-secondary-container hover:bg-secondary text-on-primary flex items-center gap-2 shadow-[0_8px_20px_-4px_rgba(251,120,0,0.45)] active:scale-95 transition-all cursor-pointer min-w-[58px]"
        >
          <span className="material-symbols-outlined text-[26px]">
            notifications_active
          </span>
          <span className="text-[13px] font-extrabold uppercase tracking-wider">
            Nurse Call
          </span>
        </button>
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen)}
      />

      {/* Modals */}
      <NurseCallModal
        isOpen={isNurseModalOpen}
        onClose={() => setIsNurseModalOpen(false)}
        bedId={bedState.connectedBedId}
        room={bedState.roomNumber}
      />

      <EStopModal
        isOpen={isEStopModalOpen}
        onReset={handleResetEStop}
        bedId={bedState.connectedBedId}
      />

      <ApkExportModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
      />

      <PatientChartModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        bedState={bedState}
        setBedState={setBedState}
        initialTab={patientModalTab}
      />
    </div>
  );
}
