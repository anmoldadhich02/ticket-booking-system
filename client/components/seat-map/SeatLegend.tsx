import React from 'react';
import { cn } from '../../lib/utils';

export interface CategoryInfo {
  id: string;
  name: string;
  color: string;
  price: number;
}

interface SeatLegendProps {
  categories: CategoryInfo[];
}

export function SeatLegend({ categories }: SeatLegendProps) {
  return (
    <div className="w-full flex flex-wrap items-center justify-center gap-6 py-4 px-6 bg-zinc-900/60 rounded-xl border border-zinc-800/80 backdrop-blur-sm text-xs">
      {/* Availability States */}
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-t-md bg-zinc-700 border border-zinc-600"></div>
        <span className="text-zinc-300 font-medium">Available</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-t-md bg-cyan-500 border border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></div>
        <span className="text-cyan-400 font-semibold">Selected (You)</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-t-md bg-red-900/80 border border-red-700"></div>
        <span className="text-red-400 font-medium">Held (Others)</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-t-md bg-zinc-950 border border-zinc-900 opacity-40"></div>
        <span className="text-zinc-500">Booked</span>
      </div>

      {/* Category Pricing Tiers */}
      {categories.length > 0 && (
        <div className="flex items-center gap-4 pl-4 border-l border-zinc-800">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: cat.color }}
              ></span>
              <span className="text-zinc-300 font-medium">{cat.name}:</span>
              <span className="text-zinc-100 font-mono font-semibold">₹{cat.price}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
