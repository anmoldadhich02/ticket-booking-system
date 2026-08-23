'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api';
import { useAuth } from '../../../../providers/AuthProvider';
import { useSocket } from '../../../../providers/SocketProvider';
import { SeatMap, SeatItem } from '../../../../components/seat-map/SeatMap';
import { SeatLegend } from '../../../../components/seat-map/SeatLegend';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Timer,
  AlertTriangle,
  X,
  Sparkles,
  Lock,
} from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '../../../../lib/utils';

export default function SeatSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch Event metadata & initial Seats state
  const { data: seatData, isLoading, refetch } = useQuery<{
    eventId: string;
    categories: Array<{ id: string; name: string; color: string; price: number }>;
    seats: SeatItem[];
    serverTime: string;
  }>({
    queryKey: ['event-seats', eventId],
    queryFn: () => apiClient(`/events/${eventId}/seats`),
    staleTime: 1000 * 15,
  });

  const { data: eventDetails } = useQuery<any>({
    queryKey: ['event', eventId],
    queryFn: () => apiClient(`/events/${eventId}`),
  });

  // 2. Real-Time WebSocket Delta Subscriptions
  useEffect(() => {
    if (!socket) return;

    // Join room for this event
    socket.emit('event:join', { eventId });

    // Listener for seat:held
    const handleSeatHeld = (payload: any) => {
      if (payload.eventId !== eventId) return;

      queryClient.setQueryData(['event-seats', eventId], (oldData: any) => {
        if (!oldData?.seats) return oldData;
        return {
          ...oldData,
          seats: oldData.seats.map((s: SeatItem) =>
            s.id === payload.eventSeatId
              ? {
                  ...s,
                  status: 'HELD',
                  isHeldByMe: payload.heldByUserId === user?.id,
                }
              : s,
          ),
        };
      });

      // If another user held a seat we had selected locally, remove it
      if (payload.heldByUserId !== user?.id) {
        setSelectedSeatIds((prev) =>
          prev.filter((id) => id !== payload.eventSeatId),
        );
      }
    };

    // Listener for seat:released
    const handleSeatReleased = (payload: any) => {
      if (payload.eventId !== eventId) return;

      queryClient.setQueryData(['event-seats', eventId], (oldData: any) => {
        if (!oldData?.seats) return oldData;
        return {
          ...oldData,
          seats: oldData.seats.map((s: SeatItem) =>
            s.id === payload.eventSeatId
              ? { ...s, status: 'AVAILABLE', isHeldByMe: false }
              : s,
          ),
        };
      });
    };

    // Listener for seat:booked
    const handleSeatBooked = (payload: any) => {
      if (payload.eventId !== eventId) return;

      queryClient.setQueryData(['event-seats', eventId], (oldData: any) => {
        if (!oldData?.seats) return oldData;
        return {
          ...oldData,
          seats: oldData.seats.map((s: SeatItem) =>
            s.id === payload.eventSeatId
              ? { ...s, status: 'BOOKED', isHeldByMe: false }
              : s,
          ),
        };
      });

      setSelectedSeatIds((prev) =>
        prev.filter((id) => id !== payload.eventSeatId),
      );
    };

    // Listener for seat:offered (waitlist)
    const handleSeatOffered = (payload: any) => {
      if (payload.eventId !== eventId) return;

      queryClient.setQueryData(['event-seats', eventId], (oldData: any) => {
        if (!oldData?.seats) return oldData;
        return {
          ...oldData,
          seats: oldData.seats.map((s: SeatItem) =>
            s.id === payload.eventSeatId
              ? {
                  ...s,
                  status: 'OFFERED',
                  isHeldByMe: payload.heldByUserId === user?.id,
                }
              : s,
          ),
        };
      });
    };

    socket.on('seat:held', handleSeatHeld);
    socket.on('seat:released', handleSeatReleased);
    socket.on('seat:booked', handleSeatBooked);
    socket.on('seat:offered', handleSeatOffered);

    return () => {
      socket.emit('event:leave', { eventId });
      socket.off('seat:held', handleSeatHeld);
      socket.off('seat:released', handleSeatReleased);
      socket.off('seat:booked', handleSeatBooked);
      socket.off('seat:offered', handleSeatOffered);
    };
  }, [socket, eventId, user?.id, queryClient]);

  // 3. Tab focus reconciliation
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };
    document.addEventListener('visibilitychange', handleFocus);
    return () => document.removeEventListener('visibilitychange', handleFocus);
  }, [refetch]);

  // Seat toggle handler
  const handleSeatToggle = (seat: SeatItem) => {
    setErrorMessage(null);
    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      } else {
        if (prev.length >= 8) {
          setErrorMessage('Maximum 8 seats can be selected per order.');
          return prev;
        }
        return [...prev, seat.id];
      }
    });
  };

  // 4. Hold Seats Mutation
  const holdMutation = useMutation({
    mutationFn: async (eventSeatIds: string[]) => {
      return apiClient<any>('/holds', {
        method: 'POST',
        body: JSON.stringify({ eventId, eventSeatIds }),
      });
    },
    onSuccess: (data) => {
      router.push(`/checkout/${data.holdId}`);
    },
    onError: (err: any) => {
      setErrorMessage(
        err.message || 'One or more selected seats were taken by another customer. Please choose different seats.',
      );
      refetch(); // Refresh authoritative seat state
    },
  });

  const handleProceedToHold = () => {
    if (!isAuthenticated) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/events/${eventId}/seats`)}`,
      );
      return;
    }

    if (selectedSeatIds.length === 0) {
      setErrorMessage('Please select at least one seat to proceed.');
      return;
    }

    holdMutation.mutate(selectedSeatIds);
  };

  const seats = seatData?.seats || [];
  const selectedSeatsList = seats.filter((s) => selectedSeatIds.includes(s.id));
  const subtotal = selectedSeatsList.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="w-full flex-1 flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="space-y-1">
          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to event details
          </Link>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {eventDetails?.title || 'Seat Selection'}
          </h1>
          <p className="text-xs text-zinc-400">
            {eventDetails?.venue?.name} • {eventDetails?.date && formatDate(eventDetails.date)} at{' '}
            {eventDetails?.startTime && formatTime(eventDetails.startTime)}
          </p>
        </div>

        {/* Real-time sync indicator */}
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-800 self-start md:self-auto">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span>{isConnected ? 'Real-Time Sync Active' : 'Connecting Sync...'}</span>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Seat Map & Sidebar Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 8 Cols: Seat Map & Legend */}
        <div className="lg:col-span-8 space-y-4">
          <SeatLegend categories={seatData?.categories || []} />

          {isLoading ? (
            <div className="w-full h-[620px] bg-zinc-900/40 rounded-2xl border border-zinc-800 flex items-center justify-center animate-pulse">
              <span className="text-xs font-mono text-zinc-500">Loading seat layout...</span>
            </div>
          ) : (
            <SeatMap
              seats={seats}
              selectedSeatIds={selectedSeatIds}
              currentUserId={user?.id}
              onSeatToggle={handleSeatToggle}
            />
          )}
        </div>

        {/* Right 4 Cols: Selection Summary Drawer */}
        <div className="lg:col-span-4 space-y-6 sticky top-24">
          <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white tracking-tight">
                Selected Seats
              </h2>
              <span className="text-xs font-mono font-bold bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-800">
                {selectedSeatsList.length} / 8 Max
              </span>
            </div>

            {/* List of Seats */}
            {selectedSeatsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500 space-y-1">
                <p>No seats selected yet.</p>
                <p className="text-[11px] text-zinc-600">
                  Click available seats on the map to reserve.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {selectedSeatsList.map((seat) => (
                  <div
                    key={seat.id}
                    className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: seat.category.color }}
                      />
                      <span className="font-mono font-bold text-white">
                        Seat {seat.seatNumber}
                      </span>
                      <span className="text-zinc-500 text-[10px]">
                        ({seat.category.name})
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-semibold text-zinc-200">
                        {formatCurrency(seat.price)}
                      </span>
                      <button
                        onClick={() => handleSeatToggle(seat)}
                        className="text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Subtotal & Checkout CTA */}
            <div className="pt-4 border-t border-zinc-800 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Subtotal</span>
                <span className="font-mono font-bold text-lg text-white">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <button
                disabled={selectedSeatsList.length === 0 || holdMutation.isPending}
                onClick={handleProceedToHold}
                className="w-full py-3.5 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                {holdMutation.isPending ? (
                  <span>Reserving Seats...</span>
                ) : (
                  <>
                    <span>Hold Seats & Checkout</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <div className="space-y-1.5 text-[11px] text-zinc-500">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>10-Minute Temporary Hold</span>
                </div>
                <p>
                  Held seats become unavailable to all other buyers while you complete checkout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
