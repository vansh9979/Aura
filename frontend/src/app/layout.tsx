import type { Metadata } from 'next';
import { Geist_Mono, Outfit, Syne } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
});

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AURA — AI Search Intelligence Dashboard',
  description:
    'Monitor, analyze, forecast, and optimize brand visibility across generative AI search engines.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${syne.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-[#07060f] text-slate-100 flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
