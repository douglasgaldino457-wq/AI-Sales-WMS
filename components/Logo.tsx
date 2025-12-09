
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-3 text-current ${className}`}>
      {/* Icon: Red Circle with 3 equal vertical lines and horizontal connecting them */}
      <div className="relative w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center shrink-0 shadow-sm">
         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Horizontal Line */}
            <path d="M5 12H19" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            
            {/* Vertical Lines */}
            <path d="M5 5V19" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <path d="M12 5V19" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <path d="M19 5V19" stroke="white" strokeWidth="3" strokeLinecap="round"/>
         </svg>
      </div>
      
      {/* Text Logo */}
      <span className="text-2xl font-bold tracking-tight lowercase leading-none pb-0.5 font-sans">
        pagmotors
      </span>
    </div>
  );
};
