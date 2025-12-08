
import React from 'react';

interface LogoProps {
  className?: string;
  type?: 'standard' | 'white' | 'inverse'; // standard (dark text), white (white text, red icon), inverse (red bg context)
}

export const Logo: React.FC<LogoProps> = ({ className = "", type = 'standard' }) => {
  
  // 'inverse' is for RED backgrounds: White Circle, Red Icon, White Text
  // 'white' is for DARK/BLACK backgrounds: Red Circle, White Icon, White Text
  // 'standard' is for WHITE backgrounds: Red Circle, White Icon, Dark Text
  
  const isInverse = type === 'inverse';
  const isWhite = type === 'white';

  const textColorClass = isInverse || isWhite ? 'text-white' : 'text-brand-gray-900';
  const circleBgClass = isInverse ? 'bg-white' : 'bg-brand-primary';
  const strokeColor = isInverse ? '#F3123C' : 'white';

  return (
    <div className={`flex items-center gap-3 ${textColorClass} ${className}`}>
      {/* Icon Container */}
      <div className={`relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm ${circleBgClass}`}>
         <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Horizontal Line */}
            <path d="M5 12H19" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round"/>
            
            {/* Vertical Lines (H pattern) */}
            <path d="M5 5V19" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M12 5V19" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M19 5V19" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round"/>
         </svg>
      </div>
      
      {/* Text Logo */}
      <div className="flex flex-col items-end translate-y-1">
        <span className="text-[26px] font-bold tracking-tight lowercase leading-[0.85] pb-1">
          serviços
        </span>
        <span className="text-[10px] font-semibold tracking-wider lowercase leading-none opacity-90">
          automotivos
        </span>
      </div>
    </div>
  );
};
