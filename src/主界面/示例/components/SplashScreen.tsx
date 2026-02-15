import React, { useEffect, useState } from 'react';
import { Maximize, Settings, Play, Github } from 'lucide-react';

interface SplashScreenProps {
  onStart: () => void;
  onToggleFullscreen: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart, onToggleFullscreen }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className={`
      relative w-full h-full flex flex-col items-center justify-center 
      bg-[#050505] text-[#eaddcf] overflow-hidden transition-opacity duration-1000
      ${isVisible ? 'opacity-100' : 'opacity-0'}
    `}>
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(60,40,30,0.3),_#000000_90%)] z-0"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30 z-0 mix-blend-overlay animate-pulse-slow"></div>
      
      {/* Ornamental Frame */}
      <div className="absolute top-8 left-8 w-64 h-64 border-t-2 border-l-2 border-[#2c1a0e] opacity-50"></div>
      <div className="absolute bottom-8 right-8 w-64 h-64 border-b-2 border-r-2 border-[#2c1a0e] opacity-50"></div>

      {/* Main Content */}
      <div className="z-10 flex flex-col items-center space-y-12 transform transition-transform duration-1000 translate-y-0">
        
        {/* Title Section */}
        <div className="text-center space-y-4 relative">
          <div className="w-1 h-24 bg-gradient-to-b from-transparent via-[#d4af37] to-transparent absolute -left-12 top-0 opacity-50"></div>
          <div className="w-1 h-24 bg-gradient-to-b from-transparent via-[#d4af37] to-transparent absolute -right-12 top-0 opacity-50"></div>
          
          <h1 className="text-6xl md:text-8xl font-heading text-transparent bg-clip-text bg-gradient-to-b from-[#f9e6a0] to-[#8a7122] drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] tracking-wide">
            深渊笔记
          </h1>
          <h2 className="text-xl md:text-2xl font-body text-[#8a7122] tracking-[0.5em] uppercase border-t border-[#2c1a0e] pt-4 mt-2">
            The Witch's Deck
          </h2>
        </div>

        {/* Menu Actions */}
        <div className="flex flex-col space-y-4 w-64">
          <button 
            onClick={onStart}
            className="group relative px-8 py-4 bg-[#1a0f08] hover:bg-[#2c1a0e] border border-[#d4af37]/30 hover:border-[#d4af37] transition-all duration-300 flex items-center justify-center space-x-3 overflow-hidden"
          >
            <div className="absolute inset-0 w-0 bg-[#d4af37]/10 transition-all duration-300 group-hover:w-full"></div>
            <Play className="w-5 h-5 text-[#d4af37] group-hover:scale-110 transition-transform" />
            <span className="font-heading text-lg tracking-widest text-[#eaddcf] group-hover:text-[#d4af37]">开始旅程</span>
          </button>

          <button 
            disabled
            className="group px-8 py-3 bg-black/50 border border-[#2c1a0e] text-gray-600 font-heading tracking-widest cursor-not-allowed flex items-center justify-center"
          >
            <span>继续游戏</span>
          </button>

          <div className="flex space-x-4 pt-2">
             <button 
               onClick={onToggleFullscreen}
               className="flex-1 py-3 bg-[#0a0a0c] border border-[#2c1a0e] hover:border-[#8a7122] text-[#8a7122] hover:text-[#d4af37] transition-all flex items-center justify-center"
               title="全屏模式"
             >
               <Maximize className="w-5 h-5" />
             </button>
             <button 
               className="flex-1 py-3 bg-[#0a0a0c] border border-[#2c1a0e] hover:border-[#8a7122] text-[#8a7122] hover:text-[#d4af37] transition-all flex items-center justify-center"
               title="设置"
             >
               <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-[#2c1a0e] text-xs font-mono tracking-widest flex flex-col items-center space-y-2 opacity-60 hover:opacity-100 transition-opacity">
        <div className="w-12 h-[1px] bg-[#2c1a0e] mb-2"></div>
        <p>VER 0.1.0 // ETHEREAL ENGINE</p>
        <div className="flex items-center space-x-2">
           <Github className="w-3 h-3" />
           <span>DESIGNED BY TAVERN HELPER</span>
        </div>
      </div>

    </div>
  );
};