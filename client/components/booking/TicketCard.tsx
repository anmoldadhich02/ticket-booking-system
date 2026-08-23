'use client';

import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Calendar, MapPin, Clock, Ticket as TicketIcon, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '../../lib/utils';

export interface TicketData {
  bookingRef: string;
  eventTitle: string;
  eventType?: string;
  posterUrl?: string;
  venueName: string;
  venueAddress?: string;
  date: string | Date;
  startTime: string;
  seats: Array<{ label: string; category: string; price: number }>;
  totalAmount: number;
  customerName?: string;
  qrPayload?: string;
}

interface TicketCardProps {
  ticket: TicketData;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const qrPayload = ticket.qrPayload || JSON.stringify({
    ref: ticket.bookingRef,
    type: 'TICKET_BOOKING_SYSTEM',
    v: 1,
  });

  return (
    <div className="flex flex-col items-center gap-6 max-w-md w-full mx-auto">
      {/* Visual Ticket Pass */}
      <div
        ref={cardRef}
        className="w-full bg-zinc-900 border border-zinc-700/80 rounded-3xl overflow-hidden shadow-2xl relative text-zinc-100"
      >
        {/* Ticket Header */}
        <div className="bg-gradient-to-r from-cyan-900/60 via-zinc-900 to-cyan-950/40 p-6 border-b border-zinc-800 relative">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" /> CONFIRMED PASS
            </span>
            <span className="font-mono text-xs text-zinc-400 font-semibold">
              {ticket.bookingRef}
            </span>
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
            {ticket.eventTitle}
          </h2>
        </div>

        {/* Ticket Body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">
                Venue
              </span>
              <div className="flex items-start gap-1.5 text-zinc-200 font-medium">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>{ticket.venueName}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">
                Date & Time
              </span>
              <div className="flex items-start gap-1.5 text-zinc-200 font-medium">
                <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  {formatDate(ticket.date)} • {formatTime(ticket.startTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Seats breakdown */}
          <div className="pt-3 border-t border-zinc-800/80">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-2">
              Reserved Seats
            </span>
            <div className="flex flex-wrap gap-2">
              {ticket.seats.map((seat, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800/90 border border-zinc-700 flex items-center gap-2 text-xs"
                >
                  <span className="font-mono font-bold text-cyan-400">{seat.label}</span>
                  <span className="text-zinc-400 text-[10px]">({seat.category})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Perforated Tear Notch Line */}
        <div className="relative flex items-center justify-between my-1">
          <div className="w-5 h-5 bg-zinc-950 rounded-full -ml-2.5 border-r border-zinc-800"></div>
          <div className="w-full border-t-2 border-dashed border-zinc-800 mx-2"></div>
          <div className="w-5 h-5 bg-zinc-950 rounded-full -mr-2.5 border-l border-zinc-800"></div>
        </div>

        {/* QR Section */}
        <div className="p-6 bg-zinc-900/90 flex flex-col items-center justify-center gap-3">
          <div className="p-3 bg-white rounded-2xl shadow-inner inline-block">
            <QRCodeSVG
              value={qrPayload}
              size={150}
              level="H"
              includeMargin={false}
            />
          </div>

          <div className="text-center">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              Scan at Entrance
            </span>
            <p className="font-mono font-bold text-sm text-cyan-400 tracking-widest">
              {ticket.bookingRef}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
