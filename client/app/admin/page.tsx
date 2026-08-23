'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import {
  Shield,
  Building,
  Users,
  Calendar,
  Ticket,
  DollarSign,
  Activity,
  Plus,
  RefreshCw,
  Lock,
  Layers,
  CheckCircle2,
  Trash2,
  Eye,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

export default function AdminConsolePage() {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'venues' | 'audit'>('overview');

  // Venue Builder State
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueDesc, setVenueDesc] = useState('');
  const [rowCount, setRowCount] = useState(6);
  const [seatsPerRow, setSeatsPerRow] = useState(8);
  const [builderSuccess, setBuilderSuccess] = useState<string | null>(null);

  // 1. Fetch Admin Stats
  const { data: adminStats, isLoading, refetch } = useQuery<any>({
    queryKey: ['admin-stats'],
    queryFn: () => apiClient('/analytics/admin'),
    enabled: isAuthenticated && isAdmin,
    refetchInterval: 15000,
  });

  // 2. Fetch Venues List
  const { data: venues } = useQuery<any[]>({
    queryKey: ['venues-admin'],
    queryFn: () => apiClient('/venues'),
    enabled: isAuthenticated && isAdmin,
  });

  // Create Venue Mutation
  const createVenueMutation = useMutation({
    mutationFn: async () => {
      // 1. Create Venue
      const newVenue: any = await apiClient('/venues', {
        method: 'POST',
        body: JSON.stringify({
          name: venueName,
          address: venueAddress,
          description: venueDesc,
          categories: [
            { name: 'VIP', color: '#f59e0b', displayOrder: 1 },
            { name: 'Premium', color: '#06b6d4', displayOrder: 2 },
            { name: 'Standard', color: '#3b82f6', displayOrder: 3 },
          ],
        }),
      });

      // 2. Generate Seat Grid Layout
      const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'];
      const seats: any[] = [];

      for (let r = 0; r < rowCount; r++) {
        const rowChar = rowLetters[r] || `R${r + 1}`;
        const categoryName = r === 0 ? 'VIP' : r <= 2 ? 'Premium' : 'Standard';

        for (let col = 1; col <= seatsPerRow; col++) {
          seats.push({
            row: rowChar,
            column: col,
            seatNumber: `${rowChar}${col}`,
            categoryName,
            isAisle: false,
          });
        }
      }

      // 3. Save Seat Layout
      await apiClient(`/venues/${newVenue.id}/layout`, {
        method: 'PUT',
        body: JSON.stringify({ seats }),
      });

      return newVenue;
    },
    onSuccess: (v) => {
      setBuilderSuccess(`Venue "${v.name}" with ${rowCount * seatsPerRow} seats created successfully!`);
      setVenueName('');
      setVenueAddress('');
      setVenueDesc('');
      queryClient.invalidateQueries({ queryKey: ['venues-admin'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-zinc-900 rounded-2xl border border-zinc-800 text-center space-y-4">
        <Shield className="w-12 h-12 text-cyan-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Administrator Access Required</h2>
        <p className="text-xs text-zinc-400">
          Sign in with an Administrator account to view platform operations, venue configurations, and real-time inventory audit logs.
        </p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-cyan-500 text-zinc-950 rounded-xl text-xs font-bold">
          Log In as Admin
        </Link>
      </div>
    );
  }

  const overview = adminStats?.overview;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-1">
            Platform Operations
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Administrator Command Console
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time monitoring of concurrency holds, platform revenue, venue layouts, and inventory lifecycle.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Live Metrics
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-mono">Platform Revenue</span>
          <p className="text-lg font-bold text-cyan-400 font-mono">
            {formatCurrency(overview?.totalRevenue || 0)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-mono">Total Bookings</span>
          <p className="text-lg font-bold text-white font-mono">
            {overview?.confirmedBookingsCount || 0}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-mono">Active Holds</span>
          <p className="text-lg font-bold text-amber-400 font-mono">
            {overview?.activeHolds || 0}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-mono">Expired Holds</span>
          <p className="text-lg font-bold text-zinc-400 font-mono">
            {overview?.expiredHolds || 0}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-mono">Waitlist Queue</span>
          <p className="text-lg font-bold text-emerald-400 font-mono">
            {overview?.activeWaitlistEntries || 0}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-mono">Total Users</span>
          <p className="text-lg font-bold text-zinc-200 font-mono">
            {overview?.totalUsers || 0}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'overview'
              ? 'bg-zinc-800 text-cyan-400 border border-zinc-700'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Recent Bookings
        </button>
        <button
          onClick={() => setActiveTab('venues')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'venues'
              ? 'bg-zinc-800 text-cyan-400 border border-zinc-700'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          Venue & Seat Builder ({venues?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-zinc-800 text-cyan-400 border border-zinc-700'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Live Audit Log
        </button>
      </div>

      {/* Tab: Overview (Recent Bookings) */}
      {activeTab === 'overview' && (
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <h2 className="text-base font-bold text-white tracking-tight">Recent Platform Bookings</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px]">
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4 text-center">Seats</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {adminStats?.recentBookings?.map((b: any) => (
                  <tr key={b.id} className="hover:bg-zinc-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                      {b.bookingRef}
                    </td>
                    <td className="py-3 px-4 text-zinc-200">
                      <div>{b.customerName}</div>
                      <div className="text-[10px] text-zinc-500">{b.customerEmail}</div>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{b.eventTitle}</td>
                    <td className="py-3 px-4 text-center font-mono text-zinc-300">{b.seatCount}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {formatCurrency(b.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-mono font-bold text-[10px] uppercase ${
                          b.status === 'CONFIRMED' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Venue & Seat Builder */}
      {activeTab === 'venues' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Builder Form */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" /> Create Venue & Layout
            </h3>

            {builderSuccess && (
              <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{builderSuccess}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Venue Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Cineplex Arena 1"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Address</label>
                <input
                  type="text"
                  placeholder="e.g. 100 Main Blvd, City Center"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Rows</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={rowCount}
                    onChange={(e) => setRowCount(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Seats / Row</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={seatsPerRow}
                    onChange={(e) => setSeatsPerRow(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  disabled={!venueName || createVenueMutation.isPending}
                  onClick={() => createVenueMutation.mutate()}
                  className="w-full py-3 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 transition-all disabled:opacity-50"
                >
                  {createVenueMutation.isPending ? 'Generating...' : `Save Venue (${rowCount * seatsPerRow} Seats)`}
                </button>
              </div>
            </div>
          </div>

          {/* Existing Venues List */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight">Active Venues ({venues?.length || 0})</h3>
            <div className="space-y-3">
              {venues?.map((v) => (
                <div
                  key={v.id}
                  className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-zinc-200 text-sm">{v.name}</h4>
                    <p className="text-xs text-zinc-400">{v.address || 'Standard Location'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-mono bg-zinc-800 px-2 py-0.5 rounded text-cyan-400 font-semibold">
                        Capacity: {v.capacity} seats
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {v.seatCategories?.map((c: any) => c.name).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Live Audit Log */}
      {activeTab === 'audit' && (
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <h2 className="text-base font-bold text-white tracking-tight">System & Transaction Audit Trail</h2>

          <div className="divide-y divide-zinc-800/60">
            {adminStats?.recentActivity?.map((log: any) => (
              <div key={log.id} className="py-3 flex items-start justify-between text-xs gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded text-[10px] border border-cyan-800/60">
                      {log.action}
                    </span>
                    <span className="text-zinc-300 font-medium">{log.userName}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">({log.userRole})</span>
                  </div>
                  {log.details && (
                    <p className="text-[11px] font-mono text-zinc-400">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
                <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">
                  {formatDate(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
