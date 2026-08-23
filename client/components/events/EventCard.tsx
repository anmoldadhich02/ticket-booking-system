'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Ticket, Sparkles } from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '../../lib/utils';

export interface EventItem {
  id: string;
  title: string;
  description?: string;
  posterUrl?: string;
  eventType: string;
  date: string;
  startTime: string;
  status: string;
  venue: {
    id: string;
    name: string;
    address?: string;
  };
  availableSeats: number;
  minPrice: number;
  maxPrice: number;
  isSoldOut: boolean;
}

export function EventCard({ event }: { event: EventItem }) {
  const defaultPoster =
    event.eventType === 'CONCERT'
      ? 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80';

  const poster = event.posterUrl || defaultPoster;

  return (
    <div className="group relative bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/50 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-cyan-950/20 hover:-translate-y-1 flex flex-col justify-between">
      {/* Poster Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-950">
        <img
          src={poster}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/40" />

        {/* Event Type Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-cyan-400 border border-white/10">
            {event.eventType}
          </span>
        </div>

        {/* Availability Badge */}
        <div className="absolute top-3 right-3">
          {event.isSoldOut ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-950/80 backdrop-blur-md text-red-400 border border-red-800">
              Sold Out • Waitlist Available
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 backdrop-blur-md text-emerald-400 border border-emerald-800">
              {event.availableSeats} Seats Left
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 justify-between gap-4">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1 tracking-tight">
            {event.title}
          </h3>

          <div className="space-y-1.5 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="line-clamp-1">{event.venue.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                {formatDate(event.date)} at {formatTime(event.startTime)}
              </span>
            </div>
          </div>
        </div>

        {/* Price & Action */}
        <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono text-zinc-500 block">
              Starting from
            </span>
            <span className="text-base font-bold text-white font-mono">
              {formatCurrency(event.minPrice)}
            </span>
          </div>

          <Link
            href={`/events/${event.id}`}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 group-hover:bg-cyan-600 text-zinc-200 group-hover:text-white transition-all duration-200 shadow-sm"
          >
            {event.isSoldOut ? 'Join Waitlist' : 'Select Seats'}
          </Link>
        </div>
      </div>
    </div>
  );
}
