import React, { useState, useEffect } from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-12 h-12" }) => {
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadLogo = () => {
      const settings = JSON.parse(localStorage.getItem('customization_settings') || '{}');
      if (settings.logoUrl) {
        setCustomLogoUrl(settings.logoUrl);
      } else {
        setCustomLogoUrl(null);
      }
    };

    loadLogo();
    window.addEventListener('storage', loadLogo);
    window.addEventListener('customization_updated', loadLogo);

    return () => {
      window.removeEventListener('storage', loadLogo);
      window.removeEventListener('customization_updated', loadLogo);
    };
  }, []);

  if (customLogoUrl) {
    return (
      <img 
        src={customLogoUrl} 
        alt="Custom Logo" 
        className={`${className} object-contain`} 
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Shield for Security */}
      <path 
        d="M50 5L15 20V45C15 68.5 30 90 50 95C70 90 85 68.5 85 45V20L50 5Z" 
        fill="url(#shield-gradient)" 
        stroke="#FDE047" 
        strokeWidth="3"
        strokeLinejoin="round"
      />
      
      {/* Camera Body / Lens Container */}
      <rect x="30" y="35" width="40" height="30" rx="6" fill="#1E3A8A" stroke="#FDE047" strokeWidth="2" />
      <circle cx="50" cy="50" r="10" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" />
      <circle cx="50" cy="50" r="4" fill="#38BDF8" />
      <circle cx="64" cy="41" r="2" fill="#FDE047" />

      {/* Map Pin / Location */}
      <path 
        d="M50 15C44.5 15 40 19.5 40 25C40 32.5 50 42 50 42C50 42 60 32.5 60 25C60 19.5 55.5 15 50 15ZM50 28C48.3 28 47 26.7 47 25C47 23.3 48.3 22 50 22C51.7 22 53 23.3 53 25C53 26.7 51.7 28 50 28Z" 
        fill="#EF4444" 
        stroke="#FFFFFF"
        strokeWidth="1.5"
      />

      {/* Gradients */}
      <defs>
        <linearGradient id="shield-gradient" x1="50" y1="5" x2="50" y2="95" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E3A8A" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
      </defs>
    </svg>
  );
};
