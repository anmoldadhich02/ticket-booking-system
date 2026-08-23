'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CountdownTimerProps {
  expiresAt: string | number; // ISO string or Epoch ms
  serverTime?: string | number;
  onExpire?: () => void;
  className?: string;
}

export function CountdownTimer({
  expiresAt,
  serverTime,
  onExpire,
  className,
}: CountdownTimerProps) {
  const targetTime = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt;
  const initialServerTime = serverTime
    ? typeof serverTime === 'string'
      ? new Date(serverTime).getTime()
      : serverTime
    : Date.now();

  // Offset between server and client clock
  const serverOffsetRef = useRef<number>(initialServerTime - Date.now());
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const calculateRemaining = useCallback(() => {
    const now = Date.now() + serverOffsetRef.current;
    return Math.max(0, targetTime - now);
  }, [targetTime]);

  const [remainingMs, setRemainingMs] = useState<number>(calculateRemaining);
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    hasExpiredRef.current = false;

    const tick = () => {
      const remaining = calculateRemaining();
      setRemainingMs(remaining);

      if (remaining <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpireRef.current?.();
      }
    };

    tick();
    const interval = setInterval(tick, 500);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [calculateRemaining]);

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const isLowTime = remainingMs < 60000 && remainingMs > 0;
  const isExpired = remainingMs <= 0;

  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold border transition-colors shadow-sm',
        isExpired
          ? 'bg-red-950/80 border-red-800 text-red-400'
          : isLowTime
          ? 'bg-amber-950/80 border-amber-600 text-amber-300 animate-pulse'
          : 'bg-cyan-950/60 border-cyan-800 text-cyan-300',
        className,
      )}
    >
      {isLowTime || isExpired ? (
        <AlertTriangle className="w-3.5 h-3.5 text-inherit" />
      ) : (
        <Timer className="w-3.5 h-3.5 text-cyan-400" />
      )}
      <span>
        {isExpired ? 'Reservation Expired' : `Seats Reserved: ${formattedTime}`}
      </span>
    </div>
  );
}
