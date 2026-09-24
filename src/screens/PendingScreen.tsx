import React, { useState } from 'react';
import { UserProfile } from '../types';
import { logout } from '../services/firebase';
import { getUserProfile } from '../services/subscriptionService';
import { MarqLogo } from '../components/MarqLogo';

interface PendingScreenProps {
  userProfile: UserProfile;
  onRefresh: (profile: UserProfile) => void;
  onLogout: () => void;
}

export const PendingScreen: React.FC<PendingScreenProps> = ({
  userProfile,
  onRefresh,
  onLogout,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      const updated = await getUserProfile(userProfile.uid);
      if (updated) {
        onRefresh(updated);
        if (updated.subscriptionStatus === 'active') {
          setMessage('Subscription activated! Redirecting...');
        } else {
          setMessage('Status checked. Still awaiting administrative approval.');
        }
      }
    } catch (err) {
      console.error(err);
      setMessage('Failed to fetch status. Check your connection.');
    } finally {
      setRefreshing(false);
      setTimeout(() => setMessage(null), 3500);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onLogout();
    } catch (err) {
      console.error(err);
    }
  };

  const isSuspended = userProfile.subscriptionStatus === 'suspended';

  return (
    <div className="min-h-screen bg-surface dark:bg-background flex flex-col justify-center items-center px-4 transition-colors duration-200">
      <div className="w-full max-w-md bg-surface-container-lowest dark:bg-surface-container-low rounded-2xl p-6 sm:p-8 shadow-xl border border-outline-variant/15 flex flex-col items-center gap-6 text-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-2">
          <MarqLogo height={24} className="text-primary" />
          <span className="text-[9px] font-extrabold text-slate-400 dark:text-outline uppercase tracking-widest font-mono">
            Licensing &amp; Gate Sentry
          </span>
        </div>

        {/* Status Indicator */}
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
            isSuspended 
              ? 'bg-rose-500/5 border-rose-500/20 text-rose-500' 
              : 'bg-amber-500/5 border-amber-500/20 text-amber-500'
          }`}>
            <span className="material-symbols-outlined text-[28px] animate-pulse">
              {isSuspended ? 'block' : 'hourglass_empty'}
            </span>
          </div>
          
          <div className="flex flex-col gap-1">
            <h2 className="text-md font-black text-on-surface uppercase tracking-tight">
              {isSuspended ? 'Subscription Suspended' : 'Awaiting Subscription Approval'}
            </h2>
            
            {/* Zero-Pill unboxed status marker */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-black tracking-wider uppercase mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-rose-500' : 'bg-amber-500'} animate-ping`} />
              <span className={isSuspended ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}>
                {isSuspended ? 'License Suspended' : 'Pending Approver Audit'}
              </span>
            </div>
          </div>
        </div>

        {/* Informative Explanation */}
        <div className="text-xs text-on-surface-variant leading-relaxed text-left flex flex-col gap-2.5 bg-slate-50 dark:bg-surface-container-lowest/60 p-4 rounded-xl border border-outline-variant/10">
          <p>
            {isSuspended ? (
              <span>Your access license to this smart bed console has been <strong>suspended</strong>. Please contact the administrator to renew or active your monthly subscription terms.</span>
            ) : (
              <span>Your registered clinical account is awaiting authorization. The system administrator and license owner (<strong>waseemsaiyed@gmail.com</strong>) has been notified of your subscription request.</span>
            )}
          </p>
          
          <div className="flex flex-col gap-1 font-mono text-[10px] text-slate-400 dark:text-outline border-t border-outline-variant/10 pt-2.5">
            <div>User: <strong className="text-on-surface-variant font-bold">{userProfile.name}</strong></div>
            <div>Email: <strong className="text-on-surface-variant font-bold">{userProfile.email}</strong></div>
            <div>UID: <span className="font-mono text-[9px] select-all truncate block">{userProfile.uid}</span></div>
          </div>
        </div>

        {/* Feedback Messages */}
        {message && (
          <div className="w-full p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold animate-in fade-in">
            {message}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full h-11 rounded-lg bg-primary hover:bg-primary-container hover:text-white dark:hover:text-background text-on-primary text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] ${refreshing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{refreshing ? 'Refreshing...' : 'Verify Status'}</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full h-10 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/50"
          >
            <span className="material-symbols-outlined text-[16px]">
              logout
            </span>
            <span>Sign Out / Switch Account</span>
          </button>
        </div>

        {/* Contact direct link */}
        <a 
          href={`mailto:waseemsaiyed@gmail.com?subject=MARQ%20W-1%20Console%20Approval%20Request%20(${userProfile.email})`}
          className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
        >
          Contact Licensing Admin
        </a>
      </div>
    </div>
  );
};
