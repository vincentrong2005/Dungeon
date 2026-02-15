import React, { useState, useEffect } from 'react';
import { CardData, EntityStats, CombatState, CombatPhase, CardType } from '../types';
import { Card } from './Card';
import { Dice } from './Dice';
import { Skull, Layers, Trash2, X } from 'lucide-react';
import { ENEMY_DECK, INITIAL_ENEMY_STATS, INITIAL_PLAYER_STATS, STARTING_DECK } from '../constants';

interface CombatViewProps {
  onEndCombat: (win: boolean) => void;
}

export const CombatView: React.FC<CombatViewProps> = ({ onEndCombat }) => {
  // --- State ---
  const [playerStats, setPlayerStats] = useState<EntityStats>({...INITIAL_PLAYER_STATS});
  const [enemyStats, setEnemyStats] = useState<EntityStats>({...INITIAL_ENEMY_STATS});
  
  const [combatState, setCombatState] = useState<CombatState>({
    turn: 1,
    phase: CombatPhase.INIT,
    playerDice: 1,
    enemyDice: 1,
    playerHand: [],
    playerDeck: [...STARTING_DECK].sort(() => Math.random() - 0.5),
    discardPile: [],
    enemyIntentCard: null,
    playerSelectedCard: null,
    logs: ['战斗开始！遭遇了一只 <span class="text-red-500 font-bold">深渊潜行者</span>'],
  });

  const [isRolling, setIsRolling] = useState(false);
  const [clashResult, setClashResult] = useState<{message: string, winner: 'player' | 'enemy' | 'tie' | null} | null>(null);
  
  // Animation States
  const [showClashAnimation, setShowClashAnimation] = useState(false);
  const [shatteringTarget, setShatteringTarget] = useState<'player' | 'enemy' | null>(null);
  const [screenShake, setScreenShake] = useState(false);

  // Deck/Discard Modal States
  const [overlayOpen, setOverlayOpen] = useState<'deck' | 'discard' | null>(null);

  // --- Helper Functions ---
  const log = (msg: string) => {
    setCombatState(prev => ({
      ...prev,
      logs: [msg, ...prev.logs].slice(0, 5)
    }));
  };

  const drawCards = (count: number, currentDeck: CardData[], currentDiscard: CardData[]) => {
    let deck = [...currentDeck];
    let discard = [...currentDiscard];
    const drawn: CardData[] = [];

    for (let i = 0; i < count; i++) {
      if (deck.length === 0) {
        if (discard.length === 0) break; // No cards left at all
        deck = [...discard].sort(() => Math.random() - 0.5);
        discard = [];
        log('<span class="text-yellow-500">弃牌堆已洗入牌库。</span>');
      }
      const card = deck.pop();
      if (card) drawn.push(card);
    }
    return { drawn, newDeck: deck, newDiscard: discard };
  };

  // --- Phase Management ---

  // 1. Start Turn / Init
  useEffect(() => {
    if (combatState.phase === CombatPhase.INIT) {
      setTimeout(() => {
        startTurn();
      }, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combatState.phase]);

  const startTurn = () => {
    setCombatState(prev => ({ ...prev, phase: CombatPhase.ROLL_PHASE, playerSelectedCard: null, enemyIntentCard: null }));
    setIsRolling(true);
    setShatteringTarget(null);
    setShowClashAnimation(false);
    setClashResult(null);
    
    // Simulate Roll Time
    setTimeout(() => {
      const pRoll = Math.floor(Math.random() * (playerStats.maxDice - playerStats.minDice + 1)) + playerStats.minDice;
      const eRoll = Math.floor(Math.random() * (enemyStats.maxDice - enemyStats.minDice + 1)) + enemyStats.minDice;
      
      setIsRolling(false);
      setCombatState(prev => ({
        ...prev,
        playerDice: pRoll,
        enemyDice: eRoll,
        phase: CombatPhase.DRAW_PHASE
      }));
      log(`掷骰结果：我方 [${pRoll}] vs 敌方 [${eRoll}]`);
    }, 1500);
  };

  // 2. Draw & Enemy Intent
  useEffect(() => {
    if (combatState.phase === CombatPhase.DRAW_PHASE && !isRolling) {
      const eCard = ENEMY_DECK[Math.floor(Math.random() * ENEMY_DECK.length)];
      const { drawn, newDeck, newDiscard } = drawCards(3, combatState.playerDeck, combatState.discardPile);
      
      setCombatState(prev => ({
        ...prev,
        enemyIntentCard: eCard,
        playerHand: drawn,
        playerDeck: newDeck,
        discardPile: newDiscard,
        phase: CombatPhase.PLAYER_ACTION
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combatState.phase, isRolling]);

  // 3. Player Selection
  const handleCardSelect = (card: CardData) => {
    if (card.type === CardType.MAGIC) {
      if (playerStats.mp < card.cost) {
        log('<span class="text-red-400">魔力不足！</span>');
        return;
      }
      setPlayerStats(prev => ({ ...prev, mp: prev.mp - card.cost }));
    }
    
    setCombatState(prev => ({
      ...prev,
      playerSelectedCard: card,
      phase: CombatPhase.RESOLUTION
    }));
  };

  // 4. Resolution
  useEffect(() => {
    if (combatState.phase === CombatPhase.RESOLUTION && combatState.playerSelectedCard && combatState.enemyIntentCard && !showClashAnimation && !clashResult) {
      resolveCombat(combatState.playerSelectedCard, combatState.enemyIntentCard, combatState.playerDice, combatState.enemyDice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combatState.phase]);

  // Check if two cards trigger a dice clash
  const isClashable = (t1: CardType, t2: CardType): boolean => {
    // Physical vs Physical
    if (t1 === CardType.PHYSICAL && t2 === CardType.PHYSICAL) return true;
    // Magic vs Magic
    if (t1 === CardType.MAGIC && t2 === CardType.MAGIC) return true;
    // Dodge interactions
    if (t1 === CardType.DODGE && (t2 === CardType.PHYSICAL || t2 === CardType.MAGIC)) return true;
    if (t2 === CardType.DODGE && (t1 === CardType.PHYSICAL || t1 === CardType.MAGIC)) return true;
    
    return false;
  };

  const resolveCombat = async (pCard: CardData, eCard: CardData, pDice: number, eDice: number) => {
    const shouldClash = isClashable(pCard.type, eCard.type);

    let pSuccess = true;
    let eSuccess = true;
    let resultMsg = "";
    let clashWinner: 'player' | 'enemy' | 'tie' | null = null;

    if (shouldClash) {
        // --- ANIMATION SEQUENCE START ---
        setShowClashAnimation(true);
        
        // Wait for DICE to fly to center
        await new Promise(r => setTimeout(r, 600));

        // IMPACT!
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 500);

        // --- CLASH LOGIC ---
        // 1. Same Type Clash
        if (pCard.type === eCard.type) {
            if (pDice > eDice) {
                eSuccess = false;
                clashWinner = 'player';
                resultMsg = "拼点胜利！";
            } else if (eDice > pDice) {
                pSuccess = false;
                clashWinner = 'enemy';
                resultMsg = "拼点失败！";
            } else {
                pSuccess = false;
                eSuccess = false;
                clashWinner = 'tie';
                resultMsg = "势均力敌！";
            }
        }
        // 2. Dodge Logic
        else if (pCard.type === CardType.DODGE) {
            // Player Dodging
            if (eDice > pDice) {
                // If enemy rolls higher, dodge fails? Or logic says "Dodge succeeds if enemy higher"?
                // Prompt: "若我方使用闪避，对方...且对方点数比我方高，则对方卡牌失效"
                // This means Player WINs if Enemy > Player (Low roll dodge mechanic or just specific rule)
                eSuccess = false;
                clashWinner = 'player';
                resultMsg = "闪避成功！";
            } else {
                // Dodge failed
                pSuccess = false; // Dodge card itself usually has no effect value, but we mark it as 'failed' interaction
                clashWinner = 'enemy'; // Enemy attack lands
                resultMsg = "闪避失败！";
            }
        } else if (eCard.type === CardType.DODGE) {
             // Enemy Dodging
             if (pDice > eDice) {
                 pSuccess = false;
                 clashWinner = 'enemy';
                 resultMsg = "攻击被闪避！";
             } else {
                 eSuccess = false;
                 clashWinner = 'player';
                 resultMsg = "敌方闪避失败！";
             }
        }

        // Trigger Shatter
        if (clashWinner === 'player') setShatteringTarget('enemy');
        else if (clashWinner === 'enemy') setShatteringTarget('player');
        else if (clashWinner === 'tie') { 
            setShatteringTarget('player');
            setTimeout(() => setShatteringTarget('enemy'), 100);
        }

        setClashResult({ message: resultMsg, winner: clashWinner });
        
        // Wait for Shatter and Text reading
        await new Promise(r => setTimeout(r, 1500));
        setShowClashAnimation(false);

    } else {
        // --- NO CLASH SEQUENCE ---
        // Just a brief pause to let user realize turns are happening
        await new Promise(r => setTimeout(r, 500));
        log('<span class="text-gray-400">双方卡牌互不干扰，直接结算。</span>');
        // Both succeed by default in non-clash scenarios
        pSuccess = true;
        eSuccess = true;
    }

    // --- EXECUTION PHASE ---
    
    const executeCard = (source: 'player' | 'enemy', card: CardData) => {
      if (source === 'player') {
        if (card.type === CardType.ACTION) {
           if (card.id === 'c5') setPlayerStats(s => ({...s, mp: Math.min(s.maxMp, s.mp + 5)}));
           log(`我方使用了【${card.name}】`);
        } else if (card.type !== CardType.DODGE) {
           setEnemyStats(s => ({...s, hp: Math.max(0, s.hp - card.value)}));
           log(`我方【${card.name}】造成 ${card.value} 点伤害`);
        }
      } else {
        if (card.type === CardType.ACTION) {
           // Enemy action implementation
           log(`敌方使用了【${card.name}】`);
        } else if (card.type !== CardType.DODGE) {
           setPlayerStats(s => ({...s, hp: Math.max(0, s.hp - card.value)}));
           log(`敌方【${card.name}】造成 ${card.value} 点伤害`);
        }
      }
    };

    // Queue actions
    const queue = [];
    if (pSuccess) queue.push({ source: 'player', card: pCard, type: pCard.type });
    if (eSuccess) queue.push({ source: 'enemy', card: eCard, type: eCard.type });

    // Order: Action > Magic > Physical
    const typePriority = (t: CardType) => {
        if (t === CardType.ACTION) return 3;
        if (t === CardType.MAGIC) return 2;
        if (t === CardType.PHYSICAL) return 1;
        return 0;
    };

    queue.sort((a, b) => typePriority(b.type) - typePriority(a.type));

    for (const action of queue) {
       executeCard(action.source as any, action.card);
       await new Promise(r => setTimeout(r, 500));
    }
    
    // Cleanup Hand & Reset
    setCombatState(prev => ({
        ...prev,
        playerHand: [],
        discardPile: [...prev.discardPile, ...prev.playerHand],
        turn: prev.turn + 1,
        phase: CombatPhase.INIT
    }));
  };

  useEffect(() => {
     if (playerStats.hp <= 0) onEndCombat(false);
     else if (enemyStats.hp <= 0) onEndCombat(true);
  }, [playerStats.hp, enemyStats.hp, onEndCombat]);

  // --- Render ---

  return (
    <div className={`h-full w-full bg-black/80 text-[#eaddcf] font-ui relative overflow-hidden select-none ${screenShake ? 'animate-shake' : ''}`}>
      
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(60,40,30,0.4),_#000000_90%)] z-0"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30 z-0 mix-blend-overlay"></div>

      {/* --- Battlefield Layer --- */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        
        {/* Enemy Position: Top Right (Scaled Up) */}
        <div className="absolute top-[5%] right-[5%] md:top-[8%] md:right-[10%] w-96 h-[32rem] flex flex-col items-center justify-end group transition-transform duration-1000">
           
           {/* Enemy Intent Card */}
           {combatState.enemyIntentCard && (
               <div className="absolute -left-48 top-20 animate-in slide-in-from-right-8 duration-700">
                  <div className="relative">
                      <div className="absolute -top-6 left-0 bg-red-900/80 text-white text-xs px-2 py-1 rounded border border-red-500/30">敌方意图</div>
                      <div className="transform rotate-[-5deg] scale-90 shadow-[0_0_20px_rgba(255,0,0,0.2)]">
                         <Card card={combatState.enemyIntentCard} isEnemy disabled />
                      </div>
                  </div>
               </div>
           )}

           {/* Enemy Dice: Only visible if NOT animating clash, OR if animating but this specific interaction is NOT a clash */}
           {(!showClashAnimation) && (
             <div className="absolute -left-12 bottom-32 z-20 animate-float">
                 <Dice value={combatState.enemyDice} rolling={isRolling} color="red" size="md" />
             </div>
           )}

           {/* Enemy Portrait (Scaled Up) */}
           <div className="relative w-full h-full">
              {/* Shadow */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-12 bg-black/80 blur-xl"></div>
              {/* Image Frame */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-72 h-96 bg-[#1a0f08] border-2 border-red-900/50 rounded-lg shadow-[0_0_40px_rgba(153,27,27,0.3)] flex items-center justify-center overflow-hidden">
                 <Skull className="w-48 h-48 text-red-900/30" />
                 <div className="absolute inset-0 bg-gradient-to-t from-red-950/80 to-transparent"></div>
              </div>
           </div>

           {/* Enemy Status Bar */}
           <div className="mt-4 w-72 bg-black/80 border border-red-900/30 p-3 rounded shadow-lg backdrop-blur-sm z-10">
              <div className="flex justify-between text-sm text-red-400 font-bold mb-1">
                 <span>深渊潜行者</span>
                 <span>{enemyStats.hp}/{enemyStats.maxHp} HP</span>
              </div>
              <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden">
                 <div className="h-full bg-red-700 transition-all duration-500" style={{width: `${(enemyStats.hp/enemyStats.maxHp)*100}%`}}></div>
              </div>
           </div>
        </div>


        {/* Player Position: Bottom Left */}
        <div className="absolute bottom-[20%] left-[5%] md:bottom-[25%] md:left-[10%] w-64 h-80 flex flex-col items-center justify-end z-20">
           
           {/* Player Dice */}
           {(!showClashAnimation) && (
             <div className="absolute -top-24 left-1/2 -translate-x-1/2 z-20 animate-float" style={{animationDelay: '1s'}}>
                <Dice value={combatState.playerDice} rolling={isRolling} color="gold" size="md" />
             </div>
           )}

           {/* Player Portrait */}
           <div className="relative w-full h-full">
               <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-8 bg-black/80 blur-xl"></div>
               <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-64 bg-[#1a0f08] border-2 border-[#d4af37]/50 rounded-lg shadow-[0_0_30px_rgba(212,175,55,0.2)] flex items-center justify-center overflow-hidden">
                  <div className="w-20 h-20 bg-[#d4af37]/20 blur-2xl rounded-full"></div>
                  <div className="absolute bottom-0 w-full h-2/3 bg-gradient-to-t from-[#d4af37]/10 to-transparent"></div>
               </div>
           </div>

           {/* Player Status Bar */}
           <div className="mt-2 w-60 bg-black/90 border border-[#d4af37]/50 p-2 rounded shadow-xl backdrop-blur-sm z-10">
              <div className="flex justify-between text-xs text-[#d4af37] font-bold mb-1">
                 <span>冒险者</span>
                 <div className="flex space-x-3">
                    <span className="text-[#660a0a] drop-shadow-sm">{playerStats.hp} HP</span>
                    <span className="text-blue-400 drop-shadow-sm">{playerStats.mp} MP</span>
                 </div>
              </div>
              <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden mb-1">
                 <div className="h-full bg-[#660a0a] transition-all duration-500" style={{width: `${(playerStats.hp/playerStats.maxHp)*100}%`}}></div>
              </div>
              <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-600 transition-all duration-500" style={{width: `${(playerStats.mp/playerStats.maxMp)*100}%`}}></div>
              </div>
           </div>
        </div>

      </div>

      {/* --- UI Layer (HUD) --- */}
      <div className="absolute inset-0 z-30 flex flex-col pointer-events-none">
         
         {/* Center: Clash Zone (Only active during Clash Animation) */}
         <div className="flex-1 flex items-center justify-center relative">
            
            {/* The Stage for Animations */}
            {showClashAnimation && (
               <div className="relative w-full h-64 flex items-center justify-center z-50">
                  {/* Player Dice Flying In */}
                  <div className={`
                    absolute right-1/2 mr-[-0.5rem] transition-all duration-300
                    ${shatteringTarget === 'player' ? 'animate-shatter' : 'animate-clash-left'}
                  `}>
                     <Dice value={combatState.playerDice} rolling={false} color="gold" size="lg" className="shadow-[0_0_50px_#d4af37]" />
                  </div>

                  {/* Enemy Dice Flying In */}
                  <div className={`
                    absolute left-1/2 ml-[-0.5rem] transition-all duration-300
                    ${shatteringTarget === 'enemy' ? 'animate-shatter' : 'animate-clash-right'}
                  `}>
                     <Dice value={combatState.enemyDice} rolling={false} color="red" size="lg" className="shadow-[0_0_50px_#ff0000]" />
                  </div>
               </div>
            )}

            {/* Clash Result Banner (After animation) */}
            {clashResult && !showClashAnimation && (
               <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-black/80 py-6 border-y border-[#d4af37]/50 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-in fade-in slide-in-from-bottom-4">
                  <h1 className={`text-4xl font-heading mb-2 ${clashResult.winner === 'player' ? 'text-green-400' : clashResult.winner === 'enemy' ? 'text-red-500' : 'text-gray-400'}`}>
                    {clashResult.winner === 'player' ? '>>> 压制成功 <<<' : clashResult.winner === 'enemy' ? '>>> 遭到反击 <<<' : '>>> 势均力敌 <<<'}
                  </h1>
                  <p className="text-[#eaddcf] font-ui tracking-wider">{clashResult.message}</p>
               </div>
            )}
         </div>

         {/* Bottom Bar: Hand & Piles */}
         <div className="pointer-events-auto min-h-[180px] w-full bg-gradient-to-t from-black via-black/80 to-transparent flex items-end justify-center pb-8 px-4 space-x-4 relative">
             
             {/* Center: Hand Cards */}
             <div className="flex space-x-6 items-end mb-4 z-40">
                {combatState.playerHand.map((card, idx) => {
                   const isSelected = combatState.playerSelectedCard?.id === card.id;
                   const isNotSelected = combatState.playerSelectedCard && !isSelected;
                   
                   return (
                    <div key={`${card.id}-${idx}`} 
                         className={`
                           transition-all duration-500 transform origin-bottom 
                           ${isSelected ? '-translate-y-12 scale-110 z-50 ring-2 ring-[#d4af37] rounded-lg shadow-[0_0_30px_#d4af37]' : ''}
                           ${isNotSelected ? 'opacity-30 scale-90 translate-y-8 grayscale' : 'hover:scale-110 hover:-translate-y-4 hover:z-50'}
                           ${combatState.phase !== CombatPhase.PLAYER_ACTION && !isSelected ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}
                         `}
                    >
                      <Card 
                        card={card} 
                        onClick={() => combatState.phase === CombatPhase.PLAYER_ACTION && handleCardSelect(card)}
                        disabled={combatState.phase !== CombatPhase.PLAYER_ACTION && !isSelected}
                      />
                    </div>
                  );
                })}
             </div>

             {/* Right Corner: Deck & Discard Piles */}
             <div className="absolute right-6 bottom-6 flex space-x-3 z-50">
                <div className="relative group">
                    <button 
                      onClick={() => setOverlayOpen('deck')}
                      className="w-16 h-16 bg-[#1a0f08] border border-[#2c1a0e] rounded-lg flex flex-col items-center justify-center hover:border-[#d4af37] transition-colors shadow-lg"
                    >
                      <Layers className="w-6 h-6 text-[#d4af37]" />
                      <span className="text-[10px] text-gray-400 mt-1">{combatState.playerDeck.length}</span>
                    </button>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">牌库</div>
                </div>

                <div className="relative group">
                    <button 
                      onClick={() => setOverlayOpen('discard')}
                      className="w-16 h-16 bg-[#1a0f08] border border-[#2c1a0e] rounded-lg flex flex-col items-center justify-center hover:border-gray-500 transition-colors shadow-lg"
                    >
                      <Trash2 className="w-6 h-6 text-gray-500" />
                      <span className="text-[10px] text-gray-400 mt-1">{combatState.discardPile.length}</span>
                    </button>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">弃牌堆</div>
                </div>
             </div>
         </div>
      </div>
      
      {/* Mini Overlay for Deck/Discard Views (omitted for brevity, same as before) */}
      {overlayOpen && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200" onClick={() => setOverlayOpen(null)}>
           <div className="bg-[#1a0f08] border border-[#d4af37]/30 p-6 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 border-b border-[#2c1a0e] pb-2">
                 <h3 className="font-heading text-xl text-[#d4af37]">
                    {overlayOpen === 'deck' ? '当前牌库' : '弃牌堆'}
                 </h3>
                 <button onClick={() => setOverlayOpen(null)}><X className="w-6 h-6 hover:text-red-500" /></button>
              </div>
              <div className="overflow-y-auto grid grid-cols-4 gap-4 p-2">
                 {(overlayOpen === 'deck' ? combatState.playerDeck : combatState.discardPile).map((card, i) => (
                    <div key={i} className="transform scale-75 origin-top-left">
                       <Card card={card} disabled />
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}
      
      {/* Log Feed Overlay */}
      <div className="absolute top-4 left-4 z-40 w-64 pointer-events-none opacity-80">
         <div className="space-y-1 text-[10px] font-mono text-gray-400">
           {combatState.logs.map((l, i) => (
             <div key={i} className="bg-black/50 p-1 rounded border-l-2 border-gray-700" dangerouslySetInnerHTML={{__html: l}}></div>
           ))}
         </div>
      </div>

    </div>
  );
};