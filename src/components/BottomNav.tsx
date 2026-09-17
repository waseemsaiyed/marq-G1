import React from 'react';
import { ScreenType } from '../types';

interface BottomNavProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onNavigate,
}) => {
  const navItems: { id: ScreenType; label: string; icon: string }[] = [
    { id: 'pair', label: 'Pair', icon: 'sensors' },
    { id: 'home', label: 'Home', icon: 'bed' },
    { id: 'advanced', label: 'Advanced', icon: 'tune' },
    { id: 'comfort', label: 'Comfort', icon: 'shield_with_heart' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <nav
      className="fixed bottom-0 w-full z-40 pb-safe bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_-1px_8px_rgba(0,0,0,0.04)] border-t border-outline-variant/20"
      id="main-bottom-navigation"
    >
      <div className="flex justify-between items-center h-16 sm:h-20 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-14 transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface font-medium'
              }`}
            >
              <div className="relative">
                <span
                  className="material-symbols-outlined text-[22px] transition-transform duration-150"
                  style={{
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {item.icon}
                </span>
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[11px] leading-tight tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
