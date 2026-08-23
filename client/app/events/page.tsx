'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { EventCard, EventItem } from '../../components/events/EventCard';
import { Search, Filter, Calendar, Sparkles, SlidersHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

const EVENT_TYPES = [
  { label: 'All Categories', value: '' },
  { label: 'Movies', value: 'MOVIE' },
  { label: 'Concerts', value: 'CONCERT' },
  { label: 'Theatre', value: 'THEATRE' },
  { label: 'Sports', value: 'SPORTS' },
  { label: 'Comedy', value: 'COMEDY' },
];

export default function EventsPage() {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'price'>('date');

  const queryParams = new URLSearchParams();
  if (search) queryParams.set('search', search);
  if (selectedType) queryParams.set('eventType', selectedType);
  queryParams.set('sortBy', sortBy);

  const { data, isLoading } = useQuery<{ data: EventItem[] }>({
    queryKey: ['events', search, selectedType, sortBy],
    queryFn: () => apiClient(`/events?${queryParams.toString()}`),
  });

  const events = data?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Explore Events & Movies
        </h1>
        <p className="text-sm text-zinc-400">
          Discover upcoming screenings, concerts, and live theatre. Select your preferred seats in real time.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by event title, movie name, or venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-mono text-zinc-500 whitespace-nowrap hidden sm:inline">
              Sort by:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full md:w-auto px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="date">Date (Earliest First)</option>
              <option value="price">Starting Price</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {EVENT_TYPES.map((type) => {
            const isSelected = selectedType === type.value;
            return (
              <button
                key={type.label}
                onClick={() => setSelectedType(type.value)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150',
                  isSelected
                    ? 'bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-zinc-900/90 text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-800',
                )}
              >
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-80 bg-zinc-900 rounded-2xl animate-pulse border border-zinc-800"
            />
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800/80">
          <SlidersHorizontal className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-200">No matching events found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords or resetting category filters to see more events.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedType('');
            }}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-medium bg-zinc-800 text-zinc-300 hover:text-white"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
