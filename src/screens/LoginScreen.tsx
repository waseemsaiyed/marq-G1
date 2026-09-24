import React, { useState } from 'react';
import { loginWithGoogle } from '../services/firebase';
import { createUserProfile, getUserProfile } from '../services/subscriptionService';
import { MarqLogo } from '../components/MarqLogo';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await loginWithGoogle();
      if (user) {
        // Fetch existing profile or create a new pending one
        let profile = await getUserProfile(user.uid);
        if (!profile) {
          profile = await createUserProfile(user.uid, user.displayName || "Clinician", user.email || "");
        }
        onLoginSuccess(user);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please verify your Google account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface dark:bg-background flex flex-col justify-center items-center px-4 transition-colors duration-200">
      <div className="w-full max-w-md bg-surface-container-lowest dark:bg-surface-container-low rounded-2xl p-6 sm:p-8 shadow-xl border border-outline-variant/15 flex flex-col items-center gap-6 text-center">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center gap-2">
          <MarqLogo height={28} className="text-primary" />
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-outline uppercase tracking-widest font-mono">
            Clinical Bed Control Console
          </span>
        </div>

        {/* Hero Illustrative Badge */}
        <div className="w-16 h-16 rounded-full bg-primary/5 dark:bg-primary/10 border border-primary/15 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[32px]">
            security
          </span>
        </div>

        {/* Pitch Statement */}
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-black text-on-surface uppercase tracking-tight">
            Premium Ward Access Protection
          </h2>
          <p className="text-xs text-on-surface-variant leading-relaxed px-1 sm:px-2">
            This hospital-grade ICU bed controller requires a validated clinical license. Authorize with your Google Account to request approval from the system administrator.
          </p>
        </div>

        {/* Feature Highlights List */}
        <div className="w-full bg-slate-50 dark:bg-surface-container-lowest/60 rounded-xl p-3 border border-outline-variant/10 text-left flex flex-col gap-2">
          <span className="text-[9px] font-extrabold uppercase text-slate-400 dark:text-outline tracking-wider block">
            Unlock Subscription Benefits:
          </span>
          <div className="flex items-center gap-2.5 text-xs text-on-surface font-medium">
            <span className="material-symbols-outlined text-primary text-[16px]">sync</span>
            <span>Real-time ESP32-S3 Redundant Core Link</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-on-surface font-medium">
            <span className="material-symbols-outlined text-primary text-[16px]">shield</span>
            <span>Sentry 4-Quadrant Rail Fall Prevention Sentry</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-on-surface font-medium">
            <span className="material-symbols-outlined text-primary text-[16px]">share</span>
            <span>WhatsApp &amp; Email Clinical Telemetry Broadcaster</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="w-full p-3 rounded-lg bg-error-container/10 border border-error/20 text-error text-xs font-semibold leading-relaxed text-left flex items-start gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Call To Action Buttons */}
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary-container hover:text-white dark:hover:text-background text-on-primary text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
              <span>Authenticating Secure Account...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">key</span>
              <span>Sign In with Google</span>
            </>
          )}
        </button>

        {/* Footer Guarantee */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-outline font-mono">
          <span className="material-symbols-outlined text-[12px] text-emerald-500">lock</span>
          <span>SSL 256-bit HIPAA Compliant Gate</span>
        </div>
      </div>
    </div>
  );
};
