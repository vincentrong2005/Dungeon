import React from 'react';
import { CardData, CardType } from '../types';
import { Sword, Sparkles, Footprints, RefreshCcw } from 'lucide-react';

interface CardProps {
  card: CardData;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  faceDown?: boolean;
  isEnemy?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ card, onClick, disabled, selected, faceDown, isEnemy, className = '' }) => {
  
  if (faceDown) {
    return (
      <div className={`w-40 h-60 rounded-lg bg-[#2c1a0e] border-2 border-[#5c3a21] shadow-xl relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300 ${className}`}>
        <div className="absolute inset-2 border border-[#4a2e1a] opacity-50 flex items-center justify-center">
           <div className="w-16 h-16 rounded-full border-2 border-[#5c3a21] opacity-30"></div>
        </div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20"></div>
      </div>
    );
  }

  const getTypeColor = (type: CardType) => {
    switch (type) {
      case CardType.PHYSICAL: return 'border-red-900 bg-red-950/30';
      case CardType.MAGIC: return 'border-purple-900 bg-purple-950/30';
      case CardType.ACTION: return 'border-emerald-900 bg-emerald-950/30';
      case CardType.DODGE: return 'border-blue-900 bg-blue-950/30';
      default: return 'border-gray-700 bg-gray-800';
    }
  };

  const getIcon = (type: CardType) => {
    switch (type) {
      case CardType.PHYSICAL: return <Sword className="w-5 h-5 text-red-400" />;
      case CardType.MAGIC: return <Sparkles className="w-5 h-5 text-purple-400" />;
      case CardType.ACTION: return <RefreshCcw className="w-5 h-5 text-emerald-400" />;
      case CardType.DODGE: return <Footprints className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`
        relative w-40 h-60 rounded-lg shadow-2xl transition-all duration-300 transform preserve-3d
        ${selected ? 'ring-4 ring-[#d4af37] -translate-y-6 scale-105 z-20' : 'hover:-translate-y-2 hover:z-10'}
        ${disabled ? 'opacity-80 cursor-default' : 'cursor-pointer'}
        bg-[#1a110d] border-2
        ${getTypeColor(card.type)}
        ${className}
      `}
    >
      {/* Texture Overlay */}
      <div className="absolute inset-0 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-40"></div>
      
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-start z-10">
        <div className={`bg-black/60 px-2 py-0.5 rounded text-[#d4af37] font-bold font-heading text-xs border border-[#d4af37]/30 ${card.type !== CardType.MAGIC ? 'opacity-0' : ''}`}>
          MP {card.cost}
        </div>
        <div className="bg-black/60 p-1 rounded-full border border-white/10">
          {getIcon(card.type)}
        </div>
      </div>

      {/* Image Placeholder */}
      <div className="absolute top-8 left-2 right-2 h-24 bg-black/40 rounded border border-white/5 flex items-center justify-center overflow-hidden">
        {/* Abstract Art based on Type */}
        <div className={`w-full h-full opacity-60 ${
          card.type === CardType.PHYSICAL ? 'bg-gradient-to-tr from-red-900 to-black' :
          card.type === CardType.MAGIC ? 'bg-gradient-to-tr from-purple-900 to-black' :
          card.type === CardType.DODGE ? 'bg-gradient-to-tr from-blue-900 to-black' :
          'bg-gradient-to-tr from-emerald-900 to-black'
        }`}></div>
        <span className="absolute font-heading text-white/20 text-4xl select-none">
           {card.name[0]}
        </span>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 w-full h-26 p-3 z-10 flex flex-col justify-end">
        <h3 className="text-[#eaddcf] font-heading font-bold text-sm tracking-wide mb-1 text-center shadow-black drop-shadow-md">
          {card.name}
        </h3>
        <div className="bg-[#0f0f0f]/80 border border-[#d4af37]/20 p-2 rounded text-[10px] text-gray-300 font-ui leading-tight min-h-[50px] flex items-center justify-center text-center">
          {card.description}
        </div>
        <div className="mt-1 text-center text-[#d4af37] font-bold text-xs font-ui">
            {card.type} · {card.value > 0 ? `强度 ${card.value}` : '特殊'}
        </div>
      </div>
    </div>
  );
};