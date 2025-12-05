import './globals.css';
import type { Metadata } from 'next';
import { NavBar } from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'CSE412 Event Recommendation',
  description: 'Event recommendation dashboard for CSE412 final project'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="app-shell">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
