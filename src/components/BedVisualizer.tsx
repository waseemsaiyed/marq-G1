import React from 'react';

interface BedVisualizerProps {
  headAngle: number;
  overallHeight: number;
  kneeAngle: number;
  tiltAngle?: number;
}

export const BedVisualizer: React.FC<BedVisualizerProps> = ({
  headAngle,
  overallHeight,
  kneeAngle,
  tiltAngle = 0,
}) => {
  // Height vertical translation offset: 40cm = 10px down, 85cm = 12px up
  const heightOffset = ((overallHeight - 58) / 27) * 12;

  // Base platform Y level (default 82)
  const baseY = 82 - heightOffset;
  const pivotHeadX = 140;
  const pivotHeadY = baseY;

  // Head calculation: length ~70px (allows full 0° to 90° articulation without clipping)
  const headRad = (headAngle * Math.PI) / 180;
  const headLength = 70;
  const headEndX = pivotHeadX - Math.cos(headRad) * headLength;
  const headEndY = pivotHeadY - Math.sin(headRad) * headLength;

  // Mattress offset perpendicular to head
  const matOffset = 8;
  const matHeadEndX = headEndX + Math.sin(headRad) * matOffset;
  const matHeadEndY = headEndY - Math.cos(headRad) * matOffset;
  const matPivotHeadX = pivotHeadX;
  const matPivotHeadY = pivotHeadY - matOffset;

  // Pelvis / Central static section: (140, baseY) to (195, baseY)
  const pivotKneeX = 195;
  const pivotKneeY = baseY;

  // Knee calculation: Thigh length ~52px
  const kneeRad = (kneeAngle * Math.PI) / 180;
  const thighLen = 52;
  const kneeApexX = pivotKneeX + Math.cos(kneeRad * 0.8) * thighLen;
  const kneeApexY = pivotKneeY - Math.sin(kneeRad) * 40;

  // Foot calculation: calf length ~52px dropping back down
  const footEndX = kneeApexX + 50;
  const footEndY = Math.min(baseY, kneeApexY + Math.sin(kneeRad * 0.7) * 35 + (35 - kneeAngle) * 0.4);

  return (
    <div className="bg-surface-container-lowest rounded-xl p-3 sm:p-4 shadow-md flex flex-col items-center relative overflow-hidden border border-outline-variant/15 w-full">
      {/* Overlay Angle Badges - 5% shrink with auto-fit layout */}
      <div className="w-full flex justify-between items-start z-10 gap-1 sm:gap-1.5">
        <div className="flex flex-col bg-surface-container-low px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-xs border border-outline-variant/15">
          <span className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            Head Incline
          </span>
          <span className="text-[23px] sm:text-[25px] leading-tight text-primary font-extrabold tabular-nums">
            {headAngle}°
          </span>
          <span className="text-[8.5px] sm:text-[9px] text-outline font-semibold">0°-90° Limit</span>
        </div>

        {tiltAngle !== 0 ? (
          <div className="flex flex-col items-center bg-secondary/10 border border-secondary/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-xs">
            <span className="text-[9px] sm:text-[10px] font-bold text-secondary uppercase tracking-wider">
              {tiltAngle < 0 ? 'Trendelenburg' : 'Rev Trend'}
            </span>
            <span className="text-[23px] sm:text-[25px] leading-tight text-secondary font-extrabold tabular-nums">
              {Math.abs(tiltAngle)}°
            </span>
            <span className="text-[8.5px] sm:text-[9px] text-secondary font-bold">0°-90° Limit</span>
          </div>
        ) : (
          <div className="flex flex-col items-center bg-surface-container-low px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-xs border border-outline-variant/15">
            <span className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              Overall Height
            </span>
            <span className="text-[23px] sm:text-[25px] leading-tight text-secondary font-extrabold tabular-nums">
              {overallHeight}{' '}
              <span className="text-[11px] font-normal text-on-surface-variant">
                cm
              </span>
            </span>
            <span className="text-[8.5px] sm:text-[9px] text-outline font-semibold">40-85 cm</span>
          </div>
        )}

        <div className="flex flex-col items-end bg-surface-container-low px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-xs border border-outline-variant/15">
          <span className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            Knee Flexion
          </span>
          <span className="text-[23px] sm:text-[25px] leading-tight text-primary font-extrabold tabular-nums">
            {kneeAngle}°
          </span>
          <span className="text-[8.5px] sm:text-[9px] text-outline font-semibold">0°-35° Limit</span>
        </div>
      </div>

      {/* Stylized Vector Articulated Bed SVG - Shrunk by 5% and auto-responsive */}
      <div className="w-full h-[152px] sm:h-44 my-1.5 sm:my-2 flex items-center justify-center relative">
        <svg
          className="w-full h-full max-w-[320px] transition-all duration-200"
          fill="none"
          viewBox="0 0 360 160"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Bed Base & Castors */}
          <path
            d="M70 142H290"
            stroke="#717782"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <line
            stroke="#004f8c"
            strokeLinecap="round"
            strokeWidth="6"
            x1="90"
            x2="90"
            y1="142"
            y2="120"
          />
          <line
            stroke="#004f8c"
            strokeLinecap="round"
            strokeWidth="6"
            x1="270"
            x2="270"
            y1="142"
            y2="120"
          />

          {/* Central Scissor Elevation Frame */}
          <path
            d={`M120 120L180 ${baseY + 6}L240 120`}
            stroke="#c1c7d3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <path
            d={`M120 ${baseY + 6}L180 120L240 ${baseY + 6}`}
            stroke="#c1c7d3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />

          {/* Castor Wheels */}
          <circle cx="90" cy="147" fill="#414751" r="5" />
          <circle cx="270" cy="147" fill="#414751" r="5" />

          {/* Articulated Sub-frame Platform (Supports 0° to 90° Trendelenburg Tilt) */}
          <g
            className="transition-transform duration-200"
            transform={tiltAngle ? `rotate(${Math.max(-90, Math.min(90, tiltAngle)) * 0.35}, 180, ${baseY + 4})` : undefined}
          >
            {/* 1. Head Section */}
            <g className="transition-all duration-150">
              {/* Base head beam */}
              <line
                stroke="#004f8c"
                strokeLinecap="round"
                strokeWidth="9"
                x1={headEndX}
                x2={pivotHeadX}
                y1={headEndY}
                y2={pivotHeadY}
              />
              {/* Mattress Head Cushion Layer */}
              <line
                stroke="#a2c9ff"
                strokeLinecap="round"
                strokeWidth="7"
                x1={matHeadEndX}
                x2={matPivotHeadX}
                y1={matHeadEndY}
                y2={matPivotHeadY}
              />
              {/* Safety Rail Head */}
              <line
                stroke="#004f8c"
                strokeLinecap="round"
                strokeWidth="4"
                x1={headEndX + 15}
                x2={headEndX + 55}
                y1={headEndY - 8}
                y2={pivotHeadY - (pivotHeadY - headEndY) * 0.45 - 8}
                opacity="0.85"
              />
            </g>

            {/* 2. Pelvis / Central Static Section */}
            <line
              stroke="#004f8c"
              strokeLinecap="round"
              strokeWidth="9"
              x1={pivotHeadX}
              x2={pivotKneeX}
              y1={baseY}
              y2={baseY}
            />
            <line
              stroke="#a2c9ff"
              strokeLinecap="round"
              strokeWidth="7"
              x1={pivotHeadX}
              x2={pivotKneeX}
              y1={baseY - matOffset}
              y2={baseY - matOffset}
            />

            {/* 3. Thigh & Knee Section */}
            <g className="transition-all duration-150">
              {/* Thigh beam */}
              <line
                stroke="#004f8c"
                strokeLinecap="round"
                strokeWidth="9"
                x1={pivotKneeX}
                x2={kneeApexX}
                y1={pivotKneeY}
                y2={kneeApexY}
              />
              <line
                stroke="#a2c9ff"
                strokeLinecap="round"
                strokeWidth="7"
                x1={pivotKneeX}
                x2={kneeApexX}
                y1={pivotKneeY - matOffset}
                y2={kneeApexY - matOffset}
              />

              {/* Calf beam */}
              <line
                stroke="#004f8c"
                strokeLinecap="round"
                strokeWidth="9"
                x1={kneeApexX}
                x2={footEndX}
                y1={kneeApexY}
                y2={footEndY}
              />
              <line
                stroke="#a2c9ff"
                strokeLinecap="round"
                strokeWidth="7"
                x1={kneeApexX}
                x2={footEndX}
                y1={kneeApexY - matOffset}
                y2={footEndY - matOffset}
              />

              {/* Footboard */}
              <rect
                fill="#004f8c"
                height="30"
                rx="3"
                width="6"
                x={footEndX}
                y={footEndY - 20}
              />
            </g>

            {/* Live Pivot Indicator Dots */}
            <circle cx={pivotHeadX} cy={pivotHeadY} fill="#fb7800" r="4.5" />
            <circle cx={pivotKneeX} cy={pivotKneeY} fill="#fb7800" r="4.5" />
            <circle cx={kneeApexX} cy={kneeApexY} fill="#fb7800" r="4.5" />

            {/* Vector Arc Measurement Head Incline */}
            {headAngle > 5 && (
              <path
                d={`M ${pivotHeadX - 25} ${pivotHeadY} A 25 25 0 0 0 ${
                  pivotHeadX - Math.cos(headRad) * 25
                } ${pivotHeadY - Math.sin(headRad) * 25}`}
                fill="none"
                stroke="#fb7800"
                strokeDasharray="2 2"
                strokeWidth="2"
              />
            )}

            {/* Vector Arc Measurement Knee */}
            {kneeAngle > 5 && (
              <path
                d={`M ${pivotKneeX + 25} ${pivotKneeY} A 25 25 0 0 1 ${
                  pivotKneeX + Math.cos(kneeRad * 0.8) * 25
                } ${pivotKneeY - Math.sin(kneeRad) * 20}`}
                fill="none"
                stroke="#fb7800"
                strokeDasharray="2 2"
                strokeWidth="2"
              />
            )}
          </g>
        </svg>

        {/* Ambient Gradient glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none" />
      </div>

      <div className="flex items-center gap-1.5 text-on-surface-variant bg-surface-container px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-xs">
        <span className="material-symbols-outlined text-[15px] sm:text-[16px] text-primary">
          touch_app
        </span>
        <span className="text-[10px] sm:text-[11px] font-bold">
          Press &amp; hold mechanical pads below to articulate
        </span>
      </div>
    </div>
  );
};
