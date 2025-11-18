import React from 'react';
import { ImageStyle } from '../types';

interface StyleCardProps {
  style: ImageStyle;
  isSelected: boolean;
  onSelect: (style: ImageStyle) => void;
}

const StyleCard: React.FC<StyleCardProps> = ({ style, isSelected, onSelect }) => {
  const baseClasses = 'h-28 flex items-center justify-center p-4 text-center rounded-xl cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105';
  
  const selectionClasses = isSelected
    ? 'bg-red-700 text-white ring-4 ring-offset-4 ring-offset-slate-900 ring-yellow-400 scale-105 shadow-lg'
    : 'bg-green-900/60 text-gray-200 hover:bg-green-800/80 ring-2 ring-gray-600 hover:ring-yellow-400';

  return (
    <div
      onClick={() => onSelect(style)}
      className={`${baseClasses} ${selectionClasses}`}
      role="button"
      aria-pressed={isSelected}
      aria-label={`Selecionar estilo ${style.name}`}
    >
      <h3 className="text-sm sm:text-base font-bold">
        {style.name}
      </h3>
    </div>
  );
};

export default StyleCard;