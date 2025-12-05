import './globals.css';
import type { Metadata } from 'next';

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
      <body>{children}</body>
    </html>
  );
}
