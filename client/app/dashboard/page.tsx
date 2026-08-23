'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import { CountdownTimer } from '../../components/booking/CountdownTimer';
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Sparkles,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '../../lib/utils';

export default function CustomerDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'waitlist'>('upcoming');

  // Fetch Bookings
  const { data: bookings, isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ['my-bookings'],
    queryFn: () => apiClient('/bookings'),
    enabled: isAuthenticated,
  });

  // Fetch Waitlists
  const { data: waitlists, isLoading: waitlistsLoading } = useQuery<any[]>({
    queryKey: ['my-waitlists'],
    queryFn: () => apiClient('/waitlist/my-status'),
    enabled: isAuthenticated,
    refetchInterval: 10000, // Poll for live offers
  });

  // Accept Waitlist Offer Mutation
  const acceptOfferMutation = useMutation({
    mutationFn: (offerId: string) =>
      apiClient('/waitlist/accept-offer', {
        method: 'POST',
        body: JSON.stringify({ offerId }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-waitlists'] });
      window.location.href = `/bookings/${data.bookingId}`;
    },
  });

  if (authLoading) {
    return <div className="max-w-5xl mx-auto p-12 text-center text-zinc-500">Loading profile...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-zinc-900 rounded-2xl border border-zinc-800 text-center space-y-4">
        <Ticket className="w-12 h-12 text-cyan-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Sign In to View Bookings</h2>
        <p className="text-xs text-zinc-400">Access your digital tickets, booking history, and waitlist offers.</p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-cyan-500 text-zinc-950 rounded-xl text-xs font-bold">
          Log In
        </Link>
      </div>
    );
  }

  const allBookings = bookings || [];
  const upcomingBookings = allBookings.filter((b) => b.status === 'CONFIRMED');
  const pastOrCancelledBookings = allBookings.filter((b) => b.status === 'CANCELLED');
  const waitlistItems = waitlists || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 space-y-8">
      {/* User Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-1">
            Customer Dashboard
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">{user?.email}</p>
        </div>

        <Link
          href="/events"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all self-start sm:self-auto"
        >
          <Ticket className="w-4 h-4" /> Book New Tickets
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-xs text-zinc-500 uppercase font-mono">Active Passes</span>
          <p className="text-2xl font-bold text-white font-mono">{upcomingBookings.length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-xs text-zinc-500 uppercase font-mono">Queued Waitlists</span>
          <p className="text-2xl font-bold text-cyan-400 font-mono">{waitlistItems.length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-xs text-zinc-500 uppercase font-mono">Total Bookings</span>
          <p className="text-2xl font-bold text-zinc-200 font-mono">{allBookings.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'upcoming'
              ? 'bg-zinc-800 text-cyan-400 border border-zinc-700'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Upcoming Bookings ({upcomingBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('waitlist')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'waitlist'
              ? 'bg-zinc-800 text-cyan-400 border border-zinc-700'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Waitlists & Offers ({waitlistItems.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'past'
              ? 'bg-zinc-800 text-cyan-400 border border-zinc-700'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Cancelled / Past ({pastOrCancelledBookings.length})
        </button>
      </div>

      {/* Tab Content: Upcoming Bookings */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {upcomingBookings.length === 0 ? (
            <div className="py-16 text-center bg-zinc-900/30 rounded-2xl border border-zinc-800 space-y-3">
              <Ticket className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-300">No active bookings found</p>
              <Link href="/events" className="inline-block text-xs font-semibold text-cyan-400 hover:underline">
                Explore upcoming shows & movies
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition-colors space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                        {b.bookingRef}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                        CONFIRMED
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white line-clamp-1">{b.event.title}</h3>

                    <div className="space-y-1 text-xs text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="line-clamp-1">{b.event.venueName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{formatDate(b.event.date)} at {formatTime(b.event.startTime)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 block font-mono">Seats ({b.seats.length})</span>
                      <span className="text-xs font-bold text-zinc-200">
                        {b.seats.map((s: any) => s.label).join(', ')}
                      </span>
                    </div>

                    <Link
                      href={`/bookings/${b.id}`}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-cyan-600 text-zinc-200 hover:text-white transition-colors"
                    >
                      View Ticket QR
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Waitlists & Offers */}
      {activeTab === 'waitlist' && (
        <div className="space-y-4">
          {waitlistItems.length === 0 ? (
            <div className="py-16 text-center bg-zinc-900/30 rounded-2xl border border-zinc-800 space-y-2">
              <Users className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-300">You are not currently in any waitlists</p>
              <p className="text-xs text-zinc-500">
                When popular events sell out, you can join category-specific waitlists to receive time-limited offers when seats are cancelled.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {waitlistItems.map((item) => {
                const hasActiveOffer = !!item.activeOffer;

                return (
                  <div
                    key={item.id}
                    className={`p-6 rounded-2xl border transition-colors space-y-4 ${
                      hasActiveOffer
                        ? 'bg-amber-950/30 border-amber-500/80 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/40'
                        : 'bg-zinc-900/60 border-zinc-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-cyan-400 bg-zinc-800 px-2 py-0.5 rounded">
                            {item.categoryName} Category
                          </span>
                          <span className="text-xs font-mono text-zinc-500">
                            Joined {formatDate(item.createdAt)}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white">{item.eventTitle}</h3>
                        <p className="text-xs text-zinc-400">{item.venueName}</p>
                      </div>

                      <div className="text-right self-start sm:self-auto">
                        <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                          FIFO Queue Position
                        </span>
                        <span className="text-xl font-extrabold text-white font-mono">
                          #{item.position}
                        </span>
                      </div>
                    </div>

                    {/* Active Offer Banner */}
                    {hasActiveOffer && (
                      <div className="p-4 rounded-xl bg-amber-900/40 border border-amber-600/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                            <span className="text-xs font-bold text-amber-300">
                              Seat Available: {item.activeOffer.seatNumber}!
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-300">
                            A seat opened up via cancellation. Accept this offer before the timer expires to confirm your reservation.
                          </p>
                          <CountdownTimer
                            expiresAt={item.activeOffer.expiresAt}
                            className="mt-1"
                          />
                        </div>

                        <button
                          disabled={acceptOfferMutation.isPending}
                          onClick={() =>
                            acceptOfferMutation.mutate(item.activeOffer.offerId)
                          }
                          className="px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-md shadow-amber-400/20 whitespace-nowrap"
                        >
                          {acceptOfferMutation.isPending
                            ? 'Confirming...'
                            : 'Accept & Book Now'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Cancelled Bookings */}
      {activeTab === 'past' && (
        <div className="space-y-4">
          {pastOrCancelledBookings.length === 0 ? (
            <div className="py-16 text-center bg-zinc-900/30 rounded-2xl border border-zinc-800">
              <p className="text-sm text-zinc-500">No cancelled bookings.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pastOrCancelledBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <span className="font-mono text-zinc-500">{b.bookingRef}</span>
                    <h4 className="font-bold text-zinc-300">{b.event.title}</h4>
                    <p className="text-[11px] text-zinc-500">{formatDate(b.event.date)}</p>
                  </div>
                  <span className="text-red-400 font-mono font-semibold uppercase">
                    CANCELLED
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
