import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';

interface PWAInstallButtonProps {
  onOpenApkModal?: () => void;
  variant?: 'header' | 'card' | 'badge';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onOpenApkModal,
  variant = 'badge',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled && variant === 'badge') {
    return (
      <button
        onClick={onOpenApkModal}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
        title="App Installed / APK Tools"
      >
        <span className="material-symbols-outlined text-[14px]">
          check_circle
        </span>
        <span>App Installed</span>
      </button>
    );
  }

  if (variant === 'header') {
    return (
      <button
        onClick={() => {
          if (isInstallable) {
            install();
          } else if (onOpenApkModal) {
            onOpenApkModal();
          } else if (isIOS) {
            setShowIOSGuide(true);
          }
        }}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-container text-on-primary font-bold text-xs shadow-xs hover:bg-primary transition-all active:scale-95 cursor-pointer"
        title="Install Android App / APK"
      >
        <span className="material-symbols-outlined text-[16px]">
          install_mobile
        </span>
        <span className="hidden xs:inline">Install App</span>
      </button>
    );
  }

  // Card variant
  return (
    <>
      <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-sm border border-outline-variant/15 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[22px]">
              android
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-on-surface">
              {isInstalled ? 'MarQ Remote App Active' : 'Install as Android App / APK'}
            </div>
            <div className="text-[11px] text-on-surface-variant">
              {isInstalled
                ? 'Running in standalone offline-ready mode'
                : 'Fullscreen bed remote with zero browser latency'}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (isInstallable) {
              install();
            } else if (onOpenApkModal) {
              onOpenApkModal();
            } else if (isIOS) {
              setShowIOSGuide(true);
            } else if (onOpenApkModal) {
              onOpenApkModal();
            }
          }}
          className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">
            {isInstalled ? 'settings' : 'download'}
          </span>
          {isInstalled ? 'APK Guide' : 'Install'}
        </button>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-surface-container-lowest p-5 shadow-2xl border border-outline-variant/20">
            <h3 className="text-base font-bold text-on-surface">
              Install on iOS (iPhone / iPad)
            </h3>
            <p className="mt-2 text-xs text-on-surface-variant leading-relaxed">
              1. Tap the <strong>Share</strong> icon in the Safari toolbar.<br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
              3. Tap <strong>Add</strong> to launch in full clinical remote mode.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full rounded-xl bg-surface-container py-2 text-xs font-bold text-on-surface hover:bg-surface-variant cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
