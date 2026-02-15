import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ title, isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-1 bg-[#2c1a0e] rounded-lg shadow-2xl border border-[#d4af37]/40 transform transition-all scale-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#d4af37]/20 bg-[#1a0f08] rounded-t-lg">
          <h2 className="text-xl font-heading text-[#d4af37] tracking-widest">{title}</h2>
          <button onClick={onClose} className="text-[#8a7122] hover:text-[#d4af37] transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 min-h-[300px] flex flex-col items-center justify-center text-[#eaddcf]/60 bg-[#2c1a0e]">
          {children ? children : (
             <div className="text-center">
               <div className="mb-4 text-4xl opacity-20 animate-pulse">❖</div>
               <p className="font-ui text-sm uppercase tracking-widest">模块已加载 // 等待数据同步</p>
             </div>
          )}
        </div>

        {/* Ornamental Corners */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#d4af37] -mt-1 -ml-1"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#d4af37] -mt-1 -mr-1"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#d4af37] -mb-1 -ml-1"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#d4af37] -mb-1 -mr-1"></div>
      </div>
    </div>
  );
};
