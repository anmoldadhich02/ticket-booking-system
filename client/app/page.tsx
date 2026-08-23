'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { EventCard, EventItem } from '../components/events/EventCard';
import {
  Ticket,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  ArrowRight,
  Lock,
  Layers,
  ChevronRight,
} from 'lucide-react';

export default function HomePage() {
  const { data: eventsData, isLoading } = useQuery<{ data: EventItem[] }>({
    queryKey: ['featured-events'],
    queryFn: () => apiClient('/events?limit=6'),
  });

  const events = eventsData?.data || [];

  return (
    <div className="flex flex-col w-full">
      {/* ─── Hero Section ─── */}
      <section className="relative w-full py-24 md:py-32 overflow-hidden border-b border-zinc-900 bg-gradient-to-b from-zinc-950 via-zinc-900/30 to-zinc-950">
        {/* Background glow ambient effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[250px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center text-center">
          {/* Engineering Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-cyan-800/60 text-cyan-300 text-xs font-mono font-medium mb-8 shadow-inner shadow-cyan-950/40">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>High-Demand Real-Time Ticketing Engine</span>
          </div>

          {/* Hero Heading */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
            YOUR NEXT <br />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500 bg-clip-text text-transparent">
              GREAT EXPERIENCE
            </span>{' '}
            <br />
            STARTS HERE.
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl font-normal leading-relaxed mb-10">
            Experience ultra-low latency seat selection, concurrency-protected holds, guaranteed zero double-bookings, and automated FIFO waitlist allocations.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <Link
              href="/events"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-zinc-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:from-cyan-300 hover:to-teal-200 shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 group"
            >
              Explore Events
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              How It Works
            </a>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 mt-20 pt-10 border-t border-zinc-900/80 w-full max-w-4xl text-left">
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono block">
                0%
              </span>
              <span className="text-xs text-zinc-500 uppercase font-mono">
                Double Booking Rate
              </span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono block">
                10 Min
              </span>
              <span className="text-xs text-zinc-500 uppercase font-mono">
                Hold TTL Protection
              </span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono block">
                FIFO
              </span>
              <span className="text-xs text-zinc-500 uppercase font-mono">
                Waitlist Ordering
              </span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-teal-400 font-mono block">
                &lt; 50ms
              </span>
              <span className="text-xs text-zinc-500 uppercase font-mono">
                Live Seat State Delta
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Featured Events Section ─── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold block mb-2">
              Live & Upcoming
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Featured Events & Movies
            </h2>
          </div>

          <Link
            href="/events"
            className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-400 hover:text-cyan-300"
          >
            View All Shows <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-80 bg-zinc-900 rounded-2xl animate-pulse border border-zinc-800"
              />
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-zinc-900/40 rounded-2xl border border-zinc-800">
            <Ticket className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-zinc-300">No events currently scheduled</h3>
            <p className="text-xs text-zinc-500 mt-1">Please check back soon for upcoming releases.</p>
          </div>
        )}
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 border-t border-zinc-900 bg-zinc-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold block mb-2">
              Architecture & Flow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              How the Reservation Engine Works
            </h2>
            <p className="text-sm text-zinc-400 mt-3">
              Built as a transactional inventory system where every state change is guaranteed by database-level concurrency control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 font-mono font-bold">
                01
              </div>
              <h3 className="font-bold text-white text-base">Select Visual Seats</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Interact with high-resolution venue seat grids with live real-time color indications across all connected users.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 font-mono font-bold">
                02
              </div>
              <h3 className="font-bold text-white text-base">Atomic Seat Hold</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                PostgreSQL row locks ensure that under simultaneous requests for the same seat, exactly one succeeds.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 font-mono font-bold">
                03
              </div>
              <h3 className="font-bold text-white text-base">10-Minute Hold TTL</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                You have 10 minutes to complete checkout. Abandoned holds are automatically recycled back by background workers.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 font-mono font-bold">
                04
              </div>
              <h3 className="font-bold text-white text-base">Instant QR Ticket</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Confirmed bookings generate digital passes with secure QR tokens, emailed directly to your inbox.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA Strip ─── */}
      <section className="py-16 border-t border-zinc-900 bg-gradient-to-r from-cyan-950/40 via-zinc-950 to-teal-950/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to book your next live experience?
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            Browse trending blockbusters, international concerts, and live theatre shows now.
          </p>
          <div>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-lg shadow-cyan-500/20 transition-all"
            >
              Browse All Events <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
