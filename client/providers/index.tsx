'use client';

import React from 'react';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { SocketProvider } from './SocketProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <SocketProvider>{children}</SocketProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
