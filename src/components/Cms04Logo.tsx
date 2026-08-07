import React from 'react';

interface Cms04LogoProps {
  className?: string;
  size?: number; // Size in pixels
  showText?: boolean;
}

export default function Cms04Logo({ className = '', size = 48, showText = false }: Cms04LogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div 
        style={{ width: size, height: size }}
        className="relative shrink-0 flex items-center justify-center select-none"
      >
        <svg 
          viewBox="0 0 100 116" 
          className="w-full h-full drop-shadow-[0_2px_8px_rgba(220,38,38,0.15)]"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Shield Background: Solid White Fill, Solid Red Border */}
          <path
            d="M 50 6 L 90 14 L 90 54 C 90 84 70 104 50 112 C 30 104 10 84 10 54 L 10 14 Z"
            fill="#ffffff"
            stroke="#dc2626"
            strokeWidth="7"
            strokeLinejoin="round"
          />

          {/* Large "04" Number: Solid Red */}
          <text
            x="50"
            y="55"
            fill="#dc2626"
            fontSize="44"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            textAnchor="middle"
            letterSpacing="-1"
          >
            04
          </text>

          {/* Stylized "CMS" Text: Solid Red */}
          <text
            x="50"
            y="88"
            fill="#dc2626"
            fontSize="26"
            fontWeight="900"
            fontStyle="italic"
            fontFamily="system-ui, -apple-system, sans-serif"
            textAnchor="middle"
            letterSpacing="0.5"
          >
            CMS
          </text>
        </svg>
      </div>

      {showText && (
        <div className="min-w-0 text-left">
          <span className="font-black text-slate-800 text-lg tracking-tight block leading-none">
            CMS<span className="text-red-600">04</span>
          </span>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mt-1">
            PORTAL WARGA CMS RT04
          </span>
        </div>
      )}
    </div>
  );
}
