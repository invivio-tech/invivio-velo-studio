'use client';

import React from 'react';
import { Delete } from 'lucide-react';

interface VirtualKeypadProps {
  value: string;
  onChange: (val: string) => void;
  onEnter?: () => void;
  maxLength?: number;
}

export function VirtualKeypad({ value, onChange, onEnter, maxLength = 11 }: VirtualKeypadProps) {
  const handlePress = (num: string) => {
    if (value.length < maxLength) {
      onChange(value + num);
    }
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
      {keys.map((key, i) => (
        <button
          key={key}
          onClick={() => handlePress(key)}
          className={`h-20 text-3xl font-bold bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-primary/20 hover:border-primary/50 transition-all active:scale-95 ${key === '0' ? 'col-start-2' : ''}`}
        >
          {key}
        </button>
      ))}
      <button
        onClick={handleDelete}
        className="h-20 text-3xl font-bold bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500/20 transition-all active:scale-95 col-start-3"
      >
        <Delete className="w-8 h-8" />
      </button>
      
      {onEnter && value.length >= 10 && (
        <button
          onClick={onEnter}
          className="col-span-3 h-20 text-2xl font-bold bg-primary text-white rounded-2xl hover:opacity-90 transition-all active:scale-95 mt-4 shadow-lg shadow-primary/25"
        >
          Confirmar
        </button>
      )}
    </div>
  );
}
