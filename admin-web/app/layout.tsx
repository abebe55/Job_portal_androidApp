import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobPortal Admin',
  description: 'Admin panel for JobPortal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
