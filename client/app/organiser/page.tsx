'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import {
  LayoutDashboard,
  Calendar,
  DollarSign,
  Ticket,
  TrendingUp,
  Plus,
  Users,
  ShieldCheck,
  AlertCircle,
  X,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

export default function OrganiserDashboardPage() {
  const { user, isOrganiser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('MOVIE');
  const [venueId, setVenueId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [prices, setPrices] = useState<Record<string, number>>({});

  // 1. Fetch Organiser Analytics
  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ['organiser-analytics'],
    queryFn: () => apiClient('/analytics/organiser'),
    enabled: isAuthenticated && isOrganiser,
  });

  // 2. Fetch Venues for Event Creation
  const { data: venues } = useQuery<any[]>({
    queryKey: ['venues-list'],
    queryFn: () => apiClient('/venues'),
  });

  const selectedVenue = venues?.find((v) => v.id === venueId);

  // Create Event Mutation
  const createEventMutation = useMutation({
    mutationFn: (payload: any) =>
      apiClient('/events', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setCreateModalOpen(false);
      setTitle('');
      setDescription('');
      setPrices({});
      queryClient.invalidateQueries({ queryKey: ['organiser-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create event.');
    },
  });

  const handleSubmitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedVenue) {
      setFormError('Please select a venue.');
      return;
    }

    const categoryPrices = selectedVenue.seatCategories.map((cat: any) => ({
      categoryId: cat.id,
      price: prices[cat.id] !== undefined ? Number(prices[cat.id]) : 500,
    }));

    createEventMutation.mutate({
      title,
      description,
      eventType,
      venueId,
      date,
      startTime,
      endTime: endTime || undefined,
      posterUrl: posterUrl || undefined,
      categoryPrices,
    });
  };

  if (!isAuthenticated || !isOrganiser) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-zinc-900 rounded-2xl border border-zinc-800 text-center space-y-4">
        <LayoutDashboard className="w-12 h-12 text-cyan-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Organiser Access Required</h2>
        <p className="text-xs text-zinc-400">
          Sign in with an Organiser account to manage shows, set category pricing, and monitor revenue analytics.
        </p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-cyan-500 text-zinc-950 rounded-xl text-xs font-bold">
          Log In as Organiser
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-1">
            Organiser Portal
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Event Management & Revenue Analytics
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage your live event inventory, review seat occupancy, and publish new shows.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create New Event
        </button>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-xs text-zinc-500 uppercase font-mono">Total Revenue</span>
          <p className="text-2xl font-extrabold text-cyan-400 font-mono">
            {formatCurrency(analytics?.totalRevenue || 0)}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-xs text-zinc-500 uppercase font-mono">Tickets Sold</span>
          <p className="text-2xl font-extrabold text-white font-mono">
            {analytics?.totalTicketsSold || 0}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-xs text-zinc-500 uppercase font-mono">Overall Occupancy</span>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono">
            {analytics?.overallOccupancyRate || 0}%
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-xs text-zinc-500 uppercase font-mono">Active Events</span>
          <p className="text-2xl font-extrabold text-zinc-200 font-mono">
            {analytics?.totalEvents || 0}
          </p>
        </div>
      </div>

      {/* Events Table */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Your Events & Shows</h2>

        {isLoading ? (
          <div className="py-12 text-center text-xs font-mono text-zinc-500">Loading performance data...</div>
        ) : !analytics?.events || analytics.events.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
            <p>You have not published any events yet.</p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="text-xs font-semibold text-cyan-400 hover:underline"
            >
              Create your first event
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px]">
                  <th className="py-3 px-4">Event Title</th>
                  <th className="py-3 px-4">Venue</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4 text-center">Occupancy</th>
                  <th className="py-3 px-4 text-center">Booked / Total</th>
                  <th className="py-3 px-4 text-right">Revenue</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {analytics.events.map((ev: any) => (
                  <tr key={ev.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <Link href={`/events/${ev.id}`} className="hover:text-cyan-400">
                        {ev.title}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">{ev.venueName}</td>
                    <td className="py-3.5 px-4 text-zinc-300 font-mono">
                      {formatDate(ev.date)} {ev.startTime}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-emerald-400">
                        {ev.occupancyRate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-zinc-300">
                      {ev.booked} / {ev.capacity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-cyan-400">
                      {formatCurrency(ev.revenue)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/events/${ev.id}/seats`}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-cyan-600 text-zinc-300 hover:text-white font-medium transition-colors"
                      >
                        Live Map
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-xl font-bold text-white">Create New Event</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitEvent} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dune: Part Two IMAX Experience"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Event Type *</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="MOVIE">Movie</option>
                    <option value="CONCERT">Concert</option>
                    <option value="THEATRE">Theatre</option>
                    <option value="SPORTS">Sports</option>
                    <option value="COMEDY">Comedy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Host Venue *</label>
                  <select
                    required
                    value={venueId}
                    onChange={(e) => setVenueId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select a Venue...</option>
                    {venues?.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.capacity} seats)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Date (YYYY-MM-DD) *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Start Time (HH:MM) *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">End Time (HH:MM)</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Cover / Poster Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide event details, synopsis, and duration..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Dynamic Category Pricing based on selected venue */}
              {selectedVenue && (
                <div className="pt-3 border-t border-zinc-800 space-y-3">
                  <h4 className="font-bold text-white text-xs">
                    Configure Category Pricing (INR) for {selectedVenue.name}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedVenue.seatCategories?.map((cat: any) => (
                      <div key={cat.id} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                        <span className="font-semibold text-zinc-200">{cat.name}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-500 font-mono">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            placeholder="Price"
                            value={prices[cat.id] ?? ''}
                            onChange={(e) =>
                              setPrices({ ...prices, [cat.id]: parseFloat(e.target.value) || 0 })
                            }
                            className="w-24 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-right font-mono font-bold text-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold disabled:opacity-50"
                >
                  {createEventMutation.isPending ? 'Publishing Event...' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
