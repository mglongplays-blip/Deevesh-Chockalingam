import React from 'react';

interface MGLogoProps {
  compact?: boolean;
  showSubtext?: boolean;
}

export const MGLogo: React.FC<MGLogoProps> = ({ compact = false, showSubtext = false }) => {
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <svg
        width="32"
        height="32"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="mgMarkGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="55%" stopColor="#6D28D9" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="#0B1120" />
        <rect x="1" y="1" width="62" height="62" rx="13" stroke="url(#mgMarkGrad)" strokeOpacity="0.45" strokeWidth="1.5" />
        <path
          d="M32 11C34.2 16.4 37.5 19.2 37.5 22.6C37.5 25.6 35.0 28 32 28C29.0 28 26.5 25.6 26.5 22.6C26.5 19.2 29.8 16.4 32 11Z"
          fill="#60A5FA"
        />
        <path
          d="M15 28L25.5 37.5L32 29.5L38.5 37.5L49 28V47H43.5V38L32 48.5L20.5 38V47H15V28Z"
          fill="url(#mgMarkGrad)"
        />
        <path d="M19 52H45" stroke="#A78BFA" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">
            MG Meet Genie
          </span>
          {showSubtext && (
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Academic AI Platform
            </span>
          )}
        </span>
      )}
    </span>
  );
};
