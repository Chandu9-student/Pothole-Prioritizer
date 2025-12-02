import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  className = '', 
  showText = true 
}) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const textSizes = {
    small: 'text-sm',
    medium: 'text-xl',
    large: 'text-2xl'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`flex items-center justify-center ${sizeClasses[size]}`}>
        <img 
          src="/logo.png" 
          alt="Pothole Prioritizer Logo" 
          className={`${sizeClasses[size]} object-contain`}
          onError={(e) => {
            // Fallback to styled emoji if logo fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className={`hidden ${sizeClasses[size]} bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg`}>
          <span className="text-white font-bold text-xl">🛣️</span>
        </div>
      </div>
      {showText && (
        <div>
          <h1 className={`${textSizes[size]} font-bold text-gray-900`}>
            Pothole Prioritizer
          </h1>
          {size !== 'small' && (
            <p className="text-xs text-gray-500">AI-Powered Road Analysis</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
