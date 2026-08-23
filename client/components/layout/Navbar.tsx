'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../providers/AuthProvider';
import { Ticket, Calendar, LayoutDashboard, Shield, LogOut, User as UserIcon, Menu, X, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isAdmin, isOrganiser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const navLinks = [
    { href: '/events', label: 'Explore Events', icon: Calendar },
    ...(isAuthenticated
      ? [
          { href: '/dashboard', label: 'My Bookings', icon: Ticket },
          ...(isOrganiser ? [{ href: '/organiser', label: 'Organiser Portal', icon: LayoutDashboard }] : []),
          ...(isAdmin ? [{ href: '/admin', label: 'Admin Console', icon: Shield }] : []),
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-200">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              TICKET<span className="text-cyan-400">FLOW</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono font-medium">PRO</span>
            </span>
            <span className="text-[10px] text-zinc-400 tracking-wider font-mono uppercase">Live Reservation Engine</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-zinc-800/90 text-cyan-400 border border-zinc-700/80 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60',
                )}
              >
                <Icon className="w-4 h-4 text-inherit" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth CTA & User Menu */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 flex items-center justify-center text-xs font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-zinc-200 leading-tight">{user.name}</span>
                  <span className="text-[10px] text-cyan-400/90 font-mono leading-tight">{user.role}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 shadow-md shadow-cyan-600/20 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-800 bg-zinc-950 px-4 py-4 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900"
              >
                <Icon className="w-4 h-4 text-cyan-400" />
                {link.label}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-zinc-800">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-zinc-900"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-zinc-200"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-600 text-white"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
