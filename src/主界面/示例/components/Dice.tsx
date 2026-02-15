import React, { useEffect, useState } from 'react';

interface DiceProps {
  value: number;
  rolling: boolean;
  color?: 'gold' | 'red';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Dice: React.FC<DiceProps> = ({ value, rolling, color = 'gold', size = 'md', className = '' }) => {
  const [displayValue, setDisplayValue] = useState(1);

  useEffect(() => {
    let interval: any;
    if (rolling) {
      interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 80);
    } else {
      setDisplayValue(value);
    }
    return () => clearInterval(interval);
  }, [rolling, value]);

  const sizeClasses = {
    sm: 'w-12 h-12 text-xl',
    md: 'w-20 h-20 text-3xl',
    lg: 'w-32 h-32 text-5xl',
  };

  const borderColor = color === 'gold' ? '#4d331f' : '#2a0505';
  const textColor = color === 'gold' ? 'text-[#2c1a0e]' : 'text-[#2c0e0e]';
  const gradientId = `grad-${color}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`relative flex items-center justify-center filter drop-shadow-xl transition-all duration-300 ${rolling ? 'animate-bounce' : ''} ${className}`}>
      {/* Hexagon Shape using SVG */}
      <div className={`${sizeClasses[size]} relative flex items-center justify-center`}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" style={{ filter: 'drop-shadow(0 5px 5px rgba(0,0,0,0.6))' }}>
          <defs>
             <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
               {color === 'gold' ? (
                 <>
                   <stop offset="0%" stopColor="#f9e6a0" />
                   <stop offset="50%" stopColor="#d4af37" />
                   <stop offset="100%" stopColor="#8a7122" />
                 </>
               ) : (
                 <>
                   <stop offset="0%" stopColor="#fca5a5" />
                   <stop offset="50%" stopColor="#ef4444" />
                   <stop offset="100%" stopColor="#7f1d1d" />
                 </>
               )}
             </linearGradient>
          </defs>
          
          {/* Main Hexagon */}
          <polygon 
            points="50 2, 93 25, 93 75, 50 98, 7 75, 7 25" 
            fill={`url(#${gradientId})`}
            stroke={borderColor} 
            strokeWidth="3"
          />
          
          {/* Inner Detail Line for 3D effect */}
          <polygon 
            points="50 8, 87 29, 87 71, 50 92, 13 71, 13 29" 
            fill="none" 
            stroke={borderColor} 
            strokeWidth="1" 
            opacity="0.4"
          />
        </svg>
        
        {/* Number */}
        <span className={`relative z-10 font-heading font-bold ${textColor} ${size === 'lg' ? 'text-6xl' : size === 'sm' ? 'text-xl' : 'text-3xl'} drop-shadow-sm`}>
          {displayValue}
        </span>
      </div>
    </div>
  );
};