'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { CountdownTimer } from '../../../components/booking/CountdownTimer';
import {
  ShieldCheck,
  CreditCard,
  MapPin,
  Calendar,
  Clock,
  Ticket,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '../../../lib/utils';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const holdId = params.holdId as string;

  const [isExpired, setIsExpired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch Hold Info
  const { data: hold, isLoading, error } = useQuery<any>({
    queryKey: ['hold', holdId],
    queryFn: () => apiClient(`/holds/${holdId}`),
    refetchInterval: isExpired ? false : 15000,
  });

  // 2. Booking Mutation
  const bookMutation = useMutation({
    mutationFn: async () => {
      // Generate idempotency key for this session
      const idempotencyKey = `idemp_${holdId}_${Date.now()}`;
      return apiClient<any>('/bookings', {
        method: 'POST',
        body: JSON.stringify({ holdId, idempotencyKey }),
      });
    },
    onSuccess: (booking) => {
      router.push(`/bookings/${booking.id}`);
    },
    onError: (err: any) => {
      setErrorMessage(
        err.message || 'Failed to complete booking. Your hold may have expired.',
      );
    },
  });

  const handleConfirmBooking = () => {
    if (isExpired) return;
    bookMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 animate-pulse space-y-6">
        <div className="h-10 bg-zinc-900 rounded-xl w-1/3" />
        <div className="h-64 bg-zinc-900 rounded-3xl" />
      </div>
    );
  }

  if (error || !hold) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-zinc-900 rounded-2xl border border-zinc-800 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Hold Not Found or Expired</h2>
        <p className="text-xs text-zinc-400">
          This seat hold session is no longer active.
        </p>
        <Link
          href="/events"
          className="inline-block px-4 py-2 bg-zinc-800 text-white rounded-xl text-xs font-semibold"
        >
          Explore Events
        </Link>
      </div>
    );
  }

  const seats = hold.seats || [];
  const event = hold.event;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <Link
            href={`/events/${event.id}/seats`}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to seat map
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Checkout & Confirmation
          </h1>
        </div>

        {/* Expiration Countdown Banner */}
        <CountdownTimer
          expiresAt={hold.expiresAt}
          serverTime={hold.serverTime}
          onExpire={() => setIsExpired(true)}
          className="text-sm px-4 py-2 self-start sm:self-auto"
        />
      </div>

      {/* Expiration Banner if expired */}
      {isExpired && (
        <div className="p-4 rounded-2xl bg-red-950/90 border border-red-800 text-red-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>Reservation Expired</span>
          </div>
          <p>
            Your 10-minute seat hold has ended and the seats have been automatically released. Please return to the seat map to re-select seats.
          </p>
          <Link
            href={`/events/${event.id}/seats`}
            className="inline-block mt-2 px-3.5 py-1.5 rounded-lg bg-red-900 text-white font-semibold text-xs"
          >
            Return to Seat Selection
          </Link>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-200">
          {errorMessage}
        </div>
      )}

      {/* Main Grid: Event Details & Order Summary */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Event & Seat Summary */}
        <div className="md:col-span-7 space-y-6">
          {/* Event Card */}
          <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
            <h2 className="text-base font-bold text-white tracking-tight">Event Information</h2>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-cyan-400">{event.title}</h3>
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>{event.venueName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {formatDate(event.date)} at {formatTime(event.startTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Reserved Seats List */}
          <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
            <h2 className="text-base font-bold text-white tracking-tight">
              Reserved Seats ({seats.length})
            </h2>

            <div className="divide-y divide-zinc-800/80">
              {seats.map((seat: any) => (
                <div
                  key={seat.eventSeatId}
                  className="py-3 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono font-bold flex items-center justify-center">
                      {seat.seatNumber}
                    </span>
                    <div>
                      <span className="font-semibold text-zinc-200 block">
                        Seat {seat.seatNumber}
                      </span>
                      <span className="text-zinc-500 text-[10px]">
                        Row {seat.row} • {seat.categoryName}
                      </span>
                    </div>
                  </div>

                  <span className="font-mono font-bold text-zinc-200">
                    {formatCurrency(seat.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Payment & Final Confirmation Card */}
        <div className="md:col-span-5 space-y-6 sticky top-24">
          <div className="p-6 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl space-y-6">
            <h2 className="text-base font-bold text-white tracking-tight border-b border-zinc-800 pb-3">
              Payment Summary
            </h2>

            <div className="space-y-2 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>Tickets Subtotal ({seats.length})</span>
                <span className="font-mono text-zinc-200">{formatCurrency(hold.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Booking & Platform Fee</span>
                <span className="font-mono text-emerald-400">₹0.00 (Waived)</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-3 border-t border-zinc-800">
                <span>Total Amount</span>
                <span className="font-mono text-xl text-cyan-400">
                  {formatCurrency(hold.totalAmount)}
                </span>
              </div>
            </div>

            {/* Confirm CTA */}
            <button
              disabled={isExpired || bookMutation.isPending}
              onClick={handleConfirmBooking}
              className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-zinc-950 transition-all flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {bookMutation.isPending ? (
                <span>Processing Reservation...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Confirm & Book Tickets</span>
                </>
              )}
            </button>

            {/* Guarantees */}
            <div className="space-y-2 text-[11px] text-zinc-500 pt-2 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Instant Ticket Confirmation Guarantee</span>
              </div>
              <p>
                Upon confirmation, your digital pass with verified QR code is generated and emailed immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
