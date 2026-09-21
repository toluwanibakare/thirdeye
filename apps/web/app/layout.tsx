import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from './shell';

export const metadata: Metadata = {
  title: 'ThirdEye — Third-party trust layer',
  description: 'Continuous trust layer for third-party e-commerce integrations.',
  icons: {
    icon: '/logo.jpeg',
    shortcut: '/logo.jpeg',
    apple: '/logo.jpeg',
  },
};

export const viewport = {
  themeColor: '#071426',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-noise min-h-screen font-sans text-ink antialiased selection:bg-brand selection:text-white" suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
