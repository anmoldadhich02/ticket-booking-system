'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { useAuth } from '../../../providers/AuthProvider';
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  Users,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '../../../lib/utils';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [waitlistCategory, setWaitlistCategory] = useState<string>('');
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistError, setWaitlistError] = useState('');

  const { data: event, isLoading, error } = useQuery<any>({
    queryKey: ['event', eventId],
    queryFn: () => apiClient(`/events/${eventId}`),
  });

  const joinWaitlistMutation = useMutation({
    mutationFn: (categoryId: string) =>
      apiClient('/waitlist/join', {
        method: 'POST',
        body: JSON.stringify({ eventId, categoryId }),
      }),
    onSuccess: () => {
      setWaitlistSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
    onError: (err: any) => {
      setWaitlistError(err.message || 'Failed to join waitlist.');
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 animate-pulse space-y-6">
        <div className="h-80 bg-zinc-900 rounded-3xl" />
        <div className="h-10 bg-zinc-900 rounded-xl w-2/3" />
        <div className="h-32 bg-zinc-900 rounded-2xl" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-zinc-900 rounded-2xl border border-zinc-800 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Event Not Found</h2>
        <p className="text-xs text-zinc-400">The requested event could not be found or has been removed.</p>
        <Link href="/events" className="inline-block px-4 py-2 bg-zinc-800 text-white rounded-xl text-xs font-semibold">
          Back to Events
        </Link>
      </div>
    );
  }

  const isSoldOut = event.stats?.isSoldOut;

  const defaultPoster =
    event.eventType === 'CONCERT'
      ? 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80';

  const poster = event.posterUrl || defaultPoster;

  return (
    <div className="w-full flex flex-col pb-20">
      {/* Back Button */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to all events
        </Link>
      </div>

      {/* Cinematic Hero Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
        <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl">
          {/* Backdrop Image */}
          <div className="relative h-72 sm:h-96 w-full overflow-hidden">
            <img
              src={poster}
              alt={event.title}
              className="w-full h-full object-cover brightness-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
          </div>

          {/* Hero Overlay Info */}
          <div className="absolute bottom-0 inset-x-0 p-6 sm:p-10 space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-cyan-950/90 text-cyan-400 border border-cyan-800/80">
                {event.eventType}
              </span>
              {isSoldOut ? (
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-red-950/90 text-red-400 border border-red-800">
                  Sold Out
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-emerald-950/90 text-emerald-400 border border-emerald-800">
                  {event.stats?.available} Seats Available
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-3xl">
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-xs sm:text-sm text-zinc-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{event.venue.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  {formatDate(event.date)} at {formatTime(event.startTime)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Description & Categories */}
        <div className="lg:col-span-2 space-y-8">
          {/* About */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">About this Experience</h2>
            <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">
              {event.description || 'Join us for this premier live screening and event experience.'}
            </p>
          </div>

          {/* Pricing Tiers */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <h2 className="text-lg font-bold text-white tracking-tight">Seat Categories & Pricing</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {event.eventSeatPrices?.map((p: any) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/90 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: p.category.color }}
                    />
                    <div>
                      <span className="font-semibold text-zinc-200 text-sm block">
                        {p.category.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        Assigned Seating
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-white text-base">
                    {formatCurrency(p.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Venue Info */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
            <h2 className="text-base font-bold text-white tracking-tight">Venue Information</h2>
            <p className="text-sm font-medium text-zinc-300">{event.venue.name}</p>
            <p className="text-xs text-zinc-500">{event.venue.address || 'Address provided upon booking.'}</p>
          </div>
        </div>

        {/* Right Column: Sticky Booking Action Card */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl space-y-6 sticky top-24">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                Pricing Starts From
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white font-mono">
                  {formatCurrency(event.stats?.minPrice || 0)}
                </span>
                <span className="text-xs text-zinc-500">per ticket</span>
              </div>
            </div>

            {/* Inventory Status Progress */}
            <div className="space-y-2 pt-4 border-t border-zinc-800 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Seats Available</span>
                <span className="font-mono font-bold text-zinc-200">
                  {event.stats?.available} / {event.stats?.totalCapacity}
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      event.stats?.totalCapacity
                        ? ((event.stats.totalCapacity - event.stats.available) /
                            event.stats.totalCapacity) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            {isSoldOut ? (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      router.push('/login?redirect=' + encodeURIComponent(`/events/${eventId}`));
                      return;
                    }
                    setWaitlistModalOpen(true);
                  }}
                  className="w-full py-3.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Users className="w-4 h-4" />
                  Join Category Waitlist
                </button>
                <p className="text-[11px] text-zinc-500 text-center">
                  If seats open up through cancellation, FIFO offers will be sent automatically.
                </p>
              </div>
            ) : (
              <Link
                href={`/events/${eventId}/seats`}
                className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-zinc-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 group"
              >
                <Ticket className="w-4 h-4" />
                Select Seats
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            <div className="pt-4 border-t border-zinc-800/80 space-y-2 text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Instant 10-Minute Hold Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>QR Pass sent immediately via email</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Waitlist Modal */}
      {waitlistModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Join Event Waitlist</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Select the seat category you would like to queue for. If a customer cancels, our automated FIFO engine will reserve the seat and notify you with a time-limited offer.
            </p>

            {waitlistSuccess ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-xl text-center space-y-2">
                <p className="text-xs font-bold text-emerald-300">You have been added to the waitlist!</p>
                <p className="text-[11px] text-zinc-400">
                  You will receive an email and in-app alert when a seat opens up.
                </p>
                <button
                  onClick={() => setWaitlistModalOpen(false)}
                  className="mt-2 px-4 py-1.5 rounded-lg bg-zinc-800 text-xs font-semibold text-white"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                {waitlistError && (
                  <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-300">
                    {waitlistError}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300">Choose Category:</label>
                  <div className="space-y-2">
                    {event.eventSeatPrices?.map((p: any) => (
                      <label
                        key={p.categoryId}
                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-cyan-500"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="category"
                            value={p.categoryId}
                            checked={waitlistCategory === p.categoryId}
                            onChange={() => setWaitlistCategory(p.categoryId)}
                            className="text-cyan-500 focus:ring-cyan-400"
                          />
                          <span className="text-xs font-medium text-zinc-200">{p.category.name}</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-white">{formatCurrency(p.price)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    onClick={() => setWaitlistModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!waitlistCategory || joinWaitlistMutation.isPending}
                    onClick={() => joinWaitlistMutation.mutate(waitlistCategory)}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 disabled:opacity-50"
                  >
                    {joinWaitlistMutation.isPending ? 'Joining...' : 'Confirm Waitlist'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
