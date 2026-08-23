import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../providers';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

export const metadata: Metadata = {
  title: 'TicketFlow Pro — Real-Time Ticket Reservation Engine',
  description:
    'High-concurrency ticket booking platform for movies, concerts, and live events with visual seat maps, temporary holds, and automatic waitlist cascades.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-zinc-950">
        <Providers>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
