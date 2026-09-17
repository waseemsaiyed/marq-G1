export type ScreenType = 'home' | 'comfort' | 'advanced' | 'pair' | 'settings';

export interface BedState {
  headAngle: number;       // 0 to 70 deg
  kneeAngle: number;       // 0 to 35 deg (home) / 45 deg (advanced)
  overallHeight: number;   // 40 to 85 cm
  tiltAngle: number;       // -12 to +12 deg
  activePreset: 'cardiac' | 'trendelenburg' | 'sleep' | 'exam' | 'zerog' | 'flat' | null;
  isSafetyLocked: boolean;
  eStopTriggered: boolean;
  nurseCallActive: boolean;
  // Perimeter rails
  rails: {
    headLeft: boolean;
    headRight: boolean;
    footLeft: boolean;
    footRight: boolean;
  };
  castersLocked: boolean;
  // Patient scale
  patientWeight: number;
  tareOffset: number;
  presenceArmed: boolean;
  // Lighting
  underBedLight: {
    enabled: boolean;
    hue: 'amber' | 'blue';
    brightness: number;
    motionSensor: boolean;
  };
  // Connection info
  connectedBedId: string;
  patientName: string;
  roomNumber: string;
  batteryPercent: number;
  isCharging: boolean;
  bleSynced: boolean;
  wifiConnected: boolean;
  hapticFeedback: 'subtle' | 'strong';
  voiceEnabled: boolean;
  highContrast: boolean;
}
