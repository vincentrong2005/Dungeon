import React, { useState, useEffect } from 'react';
import { GamePhase } from './types';
import { CombatView } from './components/CombatView';
import { SplashScreen } from './components/SplashScreen';
import { Modal } from './components/Modal';
import { Card } from './components/Card';
import { STARTING_DECK } from './constants';
import { Map, Scroll, Box, Settings, Sword, ArrowLeft } from 'lucide-react';

// App State Definition conforming to Tavern Spec
type AppState = 'SPLASH' | 'GAME';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('SPLASH');
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.EXPLORE);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Fullscreen Logic
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Lifecycle handling (simplified for React vs jQuery)
  useEffect(() => {
    // Prevent accidental back navigation or gestures if needed
    const preventDefault = (e: Event) => e.preventDefault();
    // document.addEventListener('contextmenu', preventDefault); 
    return () => {
      // document.removeEventListener('contextmenu', preventDefault);
    };
  }, []);

  // Mock LLM Text Stream
  const [storyText] = useState(`你踏入了古老的地牢入口。空气中弥漫着陈旧的书页和干涸血迹的味道。\n\n眼前的石门紧闭，但你能感受到门后传来的微弱震动。墙上的火把摇曳着，照亮了一行模糊的铭文。\n\n“唯有命运的赌徒，方能窥见真理。”\n\n突然，一只【深渊潜行者】从阴影中显现！`);

  const handleCombatEnd = (win: boolean) => {
    setGamePhase(GamePhase.EXPLORE);
    // In a real app, logic for rewards or game over would go here
    alert(win ? "战斗胜利！获得 50 金币。" : "你被打败了...");
  };

  const SidebarIcon = ({ icon: Icon, onClick, active }: { icon: any, onClick: () => void, active?: boolean }) => (
    <button 
      onClick={onClick}
      className={`
        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg border
        ${active 
          ? 'bg-[#d4af37] text-black border-[#eaddcf] shadow-[0_0_15px_#d4af37]' 
          : 'bg-[#1a0f08] text-[#8a7122] border-[#2c1a0e] hover:bg-[#2c1a0e] hover:text-[#d4af37] hover:border-[#d4af37]/50'}
      `}
    >
      <Icon className="w-5 h-5" />
    </button>
  );

  // --- Render based on AppState ---

  if (appState === 'SPLASH') {
    return (
      <div className="w-full h-full">
        <SplashScreen 
          onStart={() => setAppState('GAME')} 
          onToggleFullscreen={toggleFullScreen} 
        />
      </div>
    );
  }

  // --- Game Dashboard Render ---
  return (
    <div className="flex h-screen w-full bg-[#050505] font-body text-[#eaddcf] overflow-hidden relative">
      
      {/* Return to Title (Hidden in Combat) */}
      {gamePhase === GamePhase.EXPLORE && (
         <button 
           onClick={() => setAppState('SPLASH')}
           className="fixed top-6 left-6 z-50 text-[#8a7122] hover:text-[#d4af37] flex items-center space-x-2 transition-colors opacity-50 hover:opacity-100"
         >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-heading tracking-widest">返回标题</span>
         </button>
      )}

      {/* Sidebar: Floating Icon Dock */}
      {/* Hides off-screen during combat */}
      <div className={`
        fixed left-6 top-1/2 -translate-y-1/2 z-50
        flex flex-col items-center space-y-6
        transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1)
        ${gamePhase === GamePhase.COMBAT ? '-translate-x-32' : 'translate-x-0'}
      `}>
         {/* Glass container */}
         <div className="py-6 px-3 bg-[#0a0a0c]/80 backdrop-blur-md border border-[#2c1a0e] rounded-full shadow-2xl flex flex-col space-y-4">
           <SidebarIcon icon={Map} onClick={() => setActiveModal('map')} active={activeModal === 'map'} />
           <SidebarIcon icon={Scroll} onClick={() => setActiveModal('deck')} active={activeModal === 'deck'} />
           <SidebarIcon icon={Box} onClick={() => setActiveModal('relics')} active={activeModal === 'relics'} />
           <div className="w-6 h-[1px] bg-[#d4af37]/20 mx-auto"></div>
           <SidebarIcon icon={Settings} onClick={() => setActiveModal('settings')} active={activeModal === 'settings'} />
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative h-full w-full">
        
        {gamePhase === GamePhase.EXPLORE ? (
          <div className="h-full w-full p-12 max-w-4xl mx-auto flex flex-col justify-center pl-24">
             {/* Story Text Area - "Terminal" style but fantasy */}
             <div className="relative bg-[#0f0f0f]/50 p-8 rounded-lg border border-[#2c1a0e] shadow-2xl backdrop-blur-sm min-h-[500px] flex flex-col">
                <div className="prose prose-invert max-w-none flex-grow">
                  <p className="whitespace-pre-wrap text-lg leading-relaxed text-[#eaddcf] drop-shadow-sm font-ui">
                    {storyText}
                  </p>
                </div>

                <div className="mt-8 flex space-x-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                   <button 
                     onClick={() => setGamePhase(GamePhase.COMBAT)}
                     className="px-8 py-3 bg-[#660a0a] hover:bg-[#8a0e0e] text-white rounded-sm border border-red-800 font-heading tracking-widest flex items-center space-x-2 shadow-[0_0_15px_rgba(102,10,10,0.5)] hover:shadow-[0_0_25px_rgba(102,10,10,0.7)] transition-all transform hover:-translate-y-1"
                   >
                     <Sword className="w-4 h-4" />
                     <span>发起战斗</span>
                   </button>
                   
                   <button className="px-8 py-3 bg-transparent hover:bg-[#2c1a0e] text-[#d4af37] rounded-sm border border-[#d4af37]/30 font-heading tracking-widest transition-all">
                     <span>悄悄绕行</span>
                   </button>
                </div>
             </div>
          </div>
        ) : (
          // Combat Mode Overlay
          <div className="absolute inset-0 z-30 bg-[#050505]">
             <CombatView onEndCombat={handleCombatEnd} />
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal title="地牢地图" isOpen={activeModal === 'map'} onClose={() => setActiveModal(null)}>
         <div className="w-full h-64 bg-[#1a0f08] border border-[#d4af37]/20 flex items-center justify-center rounded">
            <span className="font-heading text-[#d4af37]/30 text-2xl">MAP_RENDER_TARGET</span>
         </div>
      </Modal>

      <Modal title="符文卡组 (当前)" isOpen={activeModal === 'deck'} onClose={() => setActiveModal(null)}>
        <div className="grid grid-cols-3 gap-4 overflow-y-auto max-h-[60vh] p-2">
            {STARTING_DECK.map((card, i) => (
              <div key={i} className="transform scale-90 hover:scale-100 transition-transform">
                <Card card={card} disabled />
              </div>
            ))}
        </div>
      </Modal>

      <Modal title="圣遗物" isOpen={activeModal === 'relics'} onClose={() => setActiveModal(null)} />
      <Modal title="游戏设置" isOpen={activeModal === 'settings'} onClose={() => setActiveModal(null)}>
          <div className="flex flex-col space-y-4 w-full">
             <button onClick={toggleFullScreen} className="p-3 border border-[#d4af37]/30 hover:bg-[#2c1a0e] text-[#d4af37]">
                切换全屏模式
             </button>
             <button onClick={() => setAppState('SPLASH')} className="p-3 border border-red-900/50 hover:bg-red-950/30 text-red-500">
                退出到标题
             </button>
          </div>
      </Modal>

    </div>
  );
};

export default App;