'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { TicketCard } from '../../../components/booking/TicketCard';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Download,
  ArrowLeft,
  Calendar,
  XCircle,
  AlertTriangle,
  Ticket as TicketIcon,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../lib/utils';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const queryClient = useQueryClient();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const { data: booking, isLoading, error } = useQuery<any>({
    queryKey: ['booking', bookingId],
    queryFn: () => apiClient(`/bookings/${bookingId}`),
  });

  // Confetti on confirmation
  useEffect(() => {
    if (booking && booking.status === 'CONFIRMED') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#14b8a6', '#f59e0b', '#38bdf8'],
        });
      } catch {}
    }
  }, [booking]);

  const cancelMutation = useMutation({
    mutationFn: () =>
      apiClient(`/bookings/${bookingId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      setCancelSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto my-20 animate-pulse space-y-6">
        <div className="h-96 bg-zinc-900 rounded-3xl" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-zinc-900 rounded-2xl border border-zinc-800 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Booking Not Found</h2>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-zinc-800 text-white rounded-xl text-xs font-semibold"
        >
          Go to My Bookings
        </Link>
      </div>
    );
  }

  const isCancelled = booking.status === 'CANCELLED';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Bookings
        </Link>

        <span
          className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
            isCancelled
              ? 'bg-red-950/80 text-red-400 border border-red-800'
              : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
          }`}
        >
          {booking.status}
        </span>
      </div>

      {/* Confirmation Header */}
      {!isCancelled && (
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Booking Confirmed!
          </h1>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Your reservation is complete. A confirmation email has been dispatched with your digital ticket.
          </p>
        </div>
      )}

      {isCancelled && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800 text-center text-xs text-red-300 space-y-1">
          <p className="font-bold">This booking was cancelled.</p>
          <p className="text-zinc-400">
            The seats were released and allocated to waiting customers via automated FIFO waitlist cascade.
          </p>
        </div>
      )}

      {/* Digital Ticket Pass */}
      <TicketCard
        ticket={{
          bookingRef: booking.bookingRef,
          eventTitle: booking.event.title,
          venueName: booking.event.venueName,
          venueAddress: booking.event.venueAddress,
          date: booking.event.date,
          startTime: booking.event.startTime,
          seats: booking.seats,
          totalAmount: booking.totalAmount,
          qrPayload: booking.ticket?.qrPayload,
        }}
      />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-zinc-900">
        <Link
          href="/events"
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors text-center"
        >
          Browse More Events
        </Link>

        {!isCancelled && (
          <button
            onClick={() => setCancelModalOpen(true)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-300 transition-colors"
          >
            Cancel Booking
          </button>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Cancel this Booking?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to cancel booking <span className="font-mono text-cyan-400 font-bold">{booking.bookingRef}</span>? The reserved seats will be made available immediately and offered to customers in the waitlist queue.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white"
              >
                Keep Booking
              </button>
              <button
                disabled={cancelMutation.isPending}
                onClick={async () => {
                  await cancelMutation.mutateAsync();
                  setCancelModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
