import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/layout/header';
import './globals.css';

export const metadata: Metadata = {
  title: 'RouteWise',
  description: 'Your Journey, Simplified. Book your ride in minutes.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        ></link>
      </head>
      <body className="font-body antialiased flex flex-col h-full">
          <Header />
          <main className="flex-grow">{children}</main>
          <Toaster />
      </body>
    </html>
  );
}
