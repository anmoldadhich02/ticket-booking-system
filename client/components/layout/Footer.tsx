import React from 'react';
import { Ticket, ShieldCheck, Zap, RefreshCw, Lock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-zinc-900 bg-zinc-950 text-zinc-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center">
                <Ticket className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white tracking-tight">TICKET<span className="text-cyan-400">FLOW</span></span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Enterprise high-concurrency ticket reservation engine. Engineered with PostgreSQL row-level locks, transactional holds, and real-time state synchronization.
            </p>
          </div>

          {/* Core Guarantees */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">P0 Concurrency</h4>
            <ul className="text-xs text-zinc-500 space-y-1.5">
              <li className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-cyan-400" /> Row-Level Locking</li>
              <li className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Zero Double-Booking</li>
              <li className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-cyan-400" /> Instant Real-Time Delta</li>
            </ul>
          </div>

          {/* Reservation Engine */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Lifecycle Engine</h4>
            <ul className="text-xs text-zinc-500 space-y-1.5">
              <li className="flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> 10-Min Temporary Hold TTL</li>
              <li className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-cyan-400" /> Auto-Release Background Worker</li>
              <li className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> FIFO Waitlist Offer Cascades</li>
            </ul>
          </div>

          {/* Quick Access */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Portals</h4>
            <ul className="text-xs text-zinc-500 space-y-1.5">
              <li><a href="/events" className="hover:text-cyan-400 transition-colors">Browse Movies & Concerts</a></li>
              <li><a href="/organiser" className="hover:text-cyan-400 transition-colors">Organiser Analytics</a></li>
              <li><a href="/admin" className="hover:text-cyan-400 transition-colors">Admin Venue Layout Builder</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-600 gap-4">
          <p>© 2026 TicketFlow Pro. Built for high-demand ticket sales.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
