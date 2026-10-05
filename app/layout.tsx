import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#05070a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'CHATU — Talk to an AI Robot',
  description:
    'Talk naturally with CHATU, an interactive 3D AI companion powered by real-time voice AI.',
  keywords: [
    'CHATU',
    '3D AI Robot',
    'Voice AI Companion',
    'Gemini Live',
    'Three.js',
    'Interactive 3D',
  ],
  authors: [{ name: 'CHATU' }],
  openGraph: {
    title: 'CHATU — Talk to an AI Robot',
    description:
      'Talk naturally with CHATU, an interactive 3D AI companion powered by real-time voice AI.',
    url: 'https://chatu.app',
    siteName: 'CHATU',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CHATU — Talk to an AI Robot',
    description:
      'Talk naturally with CHATU, an interactive 3D AI companion powered by real-time voice AI.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="h-full w-full bg-[#05070a] text-slate-100 overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
