'use client';

import React, { useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { motion } from 'framer-motion';
import { cn, formatCurrency } from '../../lib/utils';
import { Lock, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export interface SeatItem {
  id: string; // eventSeatId
  seatId: string;
  row: string;
  column: number;
  seatNumber: string;
  isAisle: boolean;
  category: {
    id: string;
    name: string;
    color: string;
  };
  price: number;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'OFFERED';
  isHeldByMe?: boolean;
  expiresAt?: string;
}

interface SeatMapProps {
  seats: SeatItem[];
  selectedSeatIds: string[];
  currentUserId?: string;
  onSeatToggle: (seat: SeatItem) => void;
}

export function SeatMap({
  seats,
  selectedSeatIds,
  currentUserId,
  onSeatToggle,
}: SeatMapProps) {
  // Organize seats into rows
  const rows = useMemo(() => {
    const map = new Map<string, SeatItem[]>();
    for (const seat of seats) {
      if (!map.has(seat.row)) {
        map.set(seat.row, []);
      }
      map.get(seat.row)!.push(seat);
    }

    return Array.from(map.entries())
      .sort(([rowA], [rowB]) => rowA.localeCompare(rowB))
      .map(([rowName, rowSeats]) => ({
        rowName,
        seats: rowSeats.sort((a, b) => a.column - b.column),
      }));
  }, [seats]);

  // Determine grid width
  const maxColumns = useMemo(() => {
    let max = 8;
    for (const r of rows) {
      if (r.seats.length > max) max = r.seats.length;
    }
    return max;
  }, [rows]);

  return (
    <div className="relative w-full h-[620px] bg-zinc-950/90 rounded-2xl border border-zinc-800/90 overflow-hidden flex flex-col items-center justify-between shadow-2xl select-none">
      {/* Top Cinema Screen Indicator */}
      <div className="w-full pt-8 pb-4 flex flex-col items-center z-10">
        <div className="w-3/4 max-w-lg h-2.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full shadow-[0_0_20px_rgba(6,182,212,0.8)]" />
        <span className="text-[11px] tracking-[0.25em] text-zinc-500 uppercase mt-2 font-mono font-semibold">
          ALL EYES THIS WAY • SCREEN
        </span>
      </div>

      {/* Pan & Zoom Canvas */}
      <TransformWrapper
        initialScale={1}
        minScale={0.7}
        maxScale={2.5}
        centerOnInit
        wheel={{ step: 0.08 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-zinc-900/80 backdrop-blur-md p-1 rounded-lg border border-zinc-800">
              <button
                onClick={() => zoomIn()}
                className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => zoomOut()}
                className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => resetTransform()}
                className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                title="Reset zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="flex items-center justify-center p-12 min-w-full min-h-full"
            >
              <div className="flex flex-col gap-3 py-6">
                {rows.map((row) => (
                  <div key={row.rowName} className="flex items-center gap-4">
                    {/* Left Row Label */}
                    <div className="w-6 text-center text-xs font-mono font-bold text-zinc-500">
                      {row.rowName}
                    </div>

                    {/* Seats in Row */}
                    <div className="flex items-center gap-2.5">
                      {row.seats.map((seat) => {
                        const isSelected = selectedSeatIds.includes(seat.id);
                        const isBooked = seat.status === 'BOOKED';
                        const isHeldByOther =
                          seat.status === 'HELD' && !seat.isHeldByMe;
                        const isHeldByMe =
                          seat.isHeldByMe || (seat.status === 'HELD' && isSelected);
                        const isOffered = seat.status === 'OFFERED';
                        const isClickable = !isBooked && !isHeldByOther && !isOffered;

                        return (
                          <motion.button
                            key={seat.id}
                            disabled={!isClickable}
                            onClick={() => isClickable && onSeatToggle(seat)}
                            whileTap={isClickable ? { scale: 0.92 } : undefined}
                            whileHover={isClickable ? { scale: 1.1 } : undefined}
                            className={cn(
                              'relative group w-8 h-8 rounded-t-lg flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-150',
                              // Selected State (by current user)
                              isSelected || isHeldByMe
                                ? 'bg-cyan-500 text-zinc-950 border border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.8)] z-10 ring-2 ring-cyan-400/40'
                                : // Held by someone else
                                isHeldByOther
                                ? 'bg-red-950/80 text-red-400/70 border border-red-800/80 cursor-not-allowed'
                                : // Booked
                                isBooked
                                ? 'bg-zinc-900/60 text-zinc-600 border border-zinc-900 cursor-not-allowed opacity-30'
                                : // Offered (waitlist)
                                isOffered
                                ? 'bg-amber-950 text-amber-400 border border-amber-600 animate-pulse cursor-not-allowed'
                                : // Available
                                  'bg-zinc-800/90 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:border-cyan-500 hover:text-white cursor-pointer shadow-sm',
                            )}
                            title={`Seat ${seat.seatNumber} • ${seat.category.name} • ${formatCurrency(seat.price)}`}
                          >
                            {/* Seat Number or Lock icon */}
                            {isHeldByOther ? (
                              <Lock className="w-3 h-3 text-red-400/80" />
                            ) : (
                              <span>{seat.column}</span>
                            )}

                            {/* Floating Hover Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                              <div className="bg-zinc-900 text-zinc-100 text-[11px] rounded-lg px-2.5 py-1.5 border border-zinc-700 shadow-xl whitespace-nowrap flex flex-col items-center">
                                <span className="font-bold text-cyan-400">
                                  Seat {seat.seatNumber}
                                </span>
                                <span className="text-[10px] text-zinc-400">
                                  {seat.category.name} • {formatCurrency(seat.price)}
                                </span>
                                <span className="text-[9px] uppercase tracking-wider font-semibold text-zinc-300 mt-0.5">
                                  {isSelected ? 'Click to Deselect' : seat.status}
                                </span>
                              </div>
                              <div className="w-1.5 h-1.5 bg-zinc-900 border-r border-b border-zinc-700 rotate-45 -mt-1"></div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Right Row Label */}
                    <div className="w-6 text-center text-xs font-mono font-bold text-zinc-500">
                      {row.rowName}
                    </div>
                  </div>
                ))}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Bottom Hint */}
      <div className="w-full py-2.5 px-4 bg-zinc-900/40 border-t border-zinc-900 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
        <span>💡 Click to select or deselect seats. Scroll or pinch to zoom.</span>
      </div>
    </div>
  );
}
