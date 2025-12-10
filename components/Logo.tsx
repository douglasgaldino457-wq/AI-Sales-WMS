
import React from 'react';

// Logo Secundário - Exclusivo para Propostas Comerciais (Pagmotors)
export const PagmotorsLogo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-3 text-current ${className}`}>
      {/* Icon: White Circle with 3 equal vertical lines and horizontal connecting them (Red Lines) */}
      <div className="relative w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12H19" stroke="#F3123C" strokeWidth="3" strokeLinecap="round"/>
            <path d="M5 5V19" stroke="#F3123C" strokeWidth="3" strokeLinecap="round"/>
            <path d="M12 5V19" stroke="#F3123C" strokeWidth="3" strokeLinecap="round"/>
            <path d="M19 5V19" stroke="#F3123C" strokeWidth="3" strokeLinecap="round"/>
         </svg>
      </div>
      
      {/* Text Logo */}
      <span className="text-2xl font-bold tracking-tight lowercase leading-none pb-0.5 font-sans">
        pagmotors
      </span>
    </div>
  );
};

// Logo Principal - Webmotors Serviços Automotivos (Menu e Login)
// "webserviçoslogo" implementation
export const Logo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
       {/* Icon: Red Circle with Gear Shift Pattern (H-gate style) */}
       <div className="relative w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center shrink-0 shadow-lg border-2 border-white/10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
             {/* Horizontal Line - Connects EXACTLY the outer verticals (6 to 18) */}
             <path d="M6 12H18" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
             {/* Vertical Lines */}
             <path d="M6 6V18" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
             <path d="M12 6V18" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
             <path d="M18 6V18" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
          </svg>
       </div>
       
       <div className="relative">
           {/* Primary Text: serviços 
               Using absolute positioning for the subtitle ('automotivos') ensures that 'serviços'
               is perfectly centered vertically relative to the icon (handled by flex items-center on parent).
           */}
           <span className="text-2xl font-bold tracking-tight leading-none font-sans text-white lowercase block">
             serviços
           </span>
           {/* Secondary Text: automotivos 
               - absolute top-full: positions it directly below 'serviços' without affecting flow.
               - right-0 w-[63%]: aligns right edge to 's', spans back to roughly 'v'.
               - flex justify-between: spreads letters to fill the 63% width evenly.
           */}
           <div className="absolute top-full right-0 w-[63%] flex justify-between mt-1 select-none pointer-events-none">
              {"automotivos".split('').map((char, i) => (
                <span key={i} className="text-[9px] font-medium leading-none text-white lowercase">
                  {char}
                </span>
              ))}
           </div>
       </div>
    </div>
  );
};
