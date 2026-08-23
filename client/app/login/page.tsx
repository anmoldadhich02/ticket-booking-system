'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../providers/AuthProvider';
import { Ticket, Lock, Mail, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      router.push(redirect);
    } catch (err: any) {
      setError(err.message || 'Invalid email address or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="max-w-md w-full space-y-8 bg-zinc-900/90 border border-zinc-800 p-8 rounded-3xl shadow-2xl">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-800 flex items-center justify-center mx-auto text-cyan-400">
          <Ticket className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Sign In to Your Account</h1>
        <p className="text-xs text-zinc-400">Access your live reservations, tickets, and waitlist offers</p>
      </div>

      {/* Demo Account Quick-Fill Buttons */}
      <div className="p-3.5 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>One-Click Reviewer Demo Accounts</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
          <button
            type="button"
            onClick={() => handleDemoFill('alex.customer@gmail.com')}
            className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium border border-zinc-700/60 transition-colors"
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => handleDemoFill('pvr.organiser@cinema.com')}
            className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium border border-zinc-700/60 transition-colors"
          >
            Organiser
          </button>
          <button
            type="button"
            onClick={() => handleDemoFill('admin@ticketbooking.com')}
            className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium border border-zinc-700/60 transition-colors"
          >
            Admin
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-zinc-300 font-semibold mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-zinc-300 font-semibold mb-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      <div className="text-center text-xs text-zinc-500 pt-2 border-t border-zinc-800">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-cyan-400 hover:underline">
          Register here
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 w-full">
      <Suspense fallback={<div className="text-zinc-500 text-xs">Loading login form...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
