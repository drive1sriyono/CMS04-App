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
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(220,38,38,0.3)]"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Outer Shield Border Gradient: Crimson Red to Warm Gold */}
            <linearGradient id="shieldBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* Inner Fill Gradient */}
            <linearGradient id="shieldBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Text Fill Gradient */}
            <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>

          {/* Outer Shield Background */}
          <path
            d="M 50 6 L 90 14 L 90 54 C 90 84 70 104 50 112 C 30 104 10 84 10 54 L 10 14 Z"
            fill="url(#shieldBgGrad)"
            stroke="url(#shieldBorderGrad)"
            strokeWidth="5"
            strokeLinejoin="round"
          />

          {/* Inner Shield Accent Line */}
          <path
            d="M 50 11 L 85 18 L 85 53 C 85 80 67 98 50 106 C 33 98 15 80 15 53 L 15 18 Z"
            fill="none"
            stroke="#b91c1c"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />

          {/* Large "04" Number */}
          <text
            x="50"
            y="55"
            fill="url(#textGrad)"
            fontSize="44"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            textAnchor="middle"
            letterSpacing="-1"
          >
            04
          </text>

          {/* Stylized "CMS" Text */}
          <text
            x="50"
            y="88"
            fill="url(#textGrad)"
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
        <div className="min-w-0">
          <span className="font-black text-white text-lg tracking-tight block leading-none">
            CMS<span className="gold-gradient-text">04</span>
          </span>
          <span className="text-[9px] text-amber-400 font-bold uppercase tracking-widest block mt-1">
            PORTAL WARGA CMS RT04
          </span>
        </div>
      )}
    </div>
  );
}
