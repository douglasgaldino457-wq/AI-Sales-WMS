
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-3 text-current ${className}`}>
      {/* Icon: Red Circle with 3 equal vertical lines and horizontal connecting them */}
      <div className="relative w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center shrink-0">
         <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Horizontal Line - Connects the first and last vertical line (x=5 to x=19) */}
            <path d="M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            
            {/* Vertical Lines */}
            <path d="M5 5V19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M12 5V19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M19 5V19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
         </svg>
      </div>
      
      {/* Text Logo - Uses currentColor to inherit from parent className */}
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
