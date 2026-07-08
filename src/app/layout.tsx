import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import ReduxProvider from '@/components/providers/ReduxProvider';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'LAKEEE — Redemption Partner Portal',
  description:
    'LAKEEE Redemption Partner portal for managing transactions, balances, and redemption activity securely.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className={plusJakartaSans.className}>
        <ReduxProvider>
          {children}
        </ReduxProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
            },
          }}
        />
        {/* <div className="fixed bottom-4 right-6 z-50 text-xs text-gray-500/80 pointer-events-none select-none">
          © 2026 Lakee e Shopping India Pvt Ltd. All rights reserved.
        </div> */}
      </body>
    </html>
  );
}