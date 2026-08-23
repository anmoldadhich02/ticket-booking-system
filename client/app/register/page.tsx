'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../providers/AuthProvider';
import { Ticket, Lock, Mail, User, ArrowRight, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register(name, email, password, role);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. An account with this email may already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 w-full">
      <div className="max-w-md w-full space-y-8 bg-zinc-900/90 border border-zinc-800 p-8 rounded-3xl shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-800 flex items-center justify-center mx-auto text-cyan-400">
            <Ticket className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create an Account</h1>
          <p className="text-xs text-zinc-400">Join TicketFlow Pro to book seats in real time</p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Full Name *</label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Email Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Account Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="CUSTOMER">Customer (Book Movies & Events)</option>
              <option value="ORGANISER">Organiser (Host & Manage Shows)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="text-center text-xs text-zinc-500 pt-2 border-t border-zinc-800">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-cyan-400 hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
