import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HomeBase Admin',
  description: 'Internal ops dashboard for the HomeBase founding team',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-cream text-ink-900">{children}</body>
    </html>
  );
}
