/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BedState, ScreenType } from './types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { NurseCallModal } from './components/NurseCallModal';
import { EStopModal } from './components/EStopModal';
import { ApkExportModal } from './components/ApkExportModal';
import { HomeDashboard } from './screens/HomeDashboard';
import { ComfortScreen } from './screens/ComfortScreen';
import { AdvancedScreen } from './screens/AdvancedScreen';
import { PairScreen } from './screens/PairScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [isNurseModalOpen, setIsNurseModalOpen] = useState(false);
  const [isEStopModalOpen, setIsEStopModalOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);

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
      />

      {/* Main Screen Content */}
      <main className="flex-1 w-full px-4 sm:px-5 pt-32 pb-36 max-w-lg mx-auto transition-opacity duration-200">
        {currentScreen === 'home' && (
          <HomeDashboard
            bedState={bedState}
            setBedState={setBedState}
            onTriggerEStop={handleTriggerEStop}
            onTriggerNurseCall={handleTriggerNurseCall}
          />
        )}

        {currentScreen === 'comfort' && (
          <ComfortScreen
            bedState={bedState}
            setBedState={setBedState}
            onTriggerEStop={handleTriggerEStop}
            onTriggerNurseCall={handleTriggerNurseCall}
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
    </div>
  );
}
