// THIS FILE IS MANAGED BY AN AI ASSISTANT. DO NOT EDIT DIRECTLY.

'use client';

import {usePathname} from 'next/navigation';
import type {Metadata} from 'next';
import {Toaster} from '@/components/ui/toaster';
import {AuthProvider} from '@/context/auth-context';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import './globals.css';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');

  if (isAdminPage) {
    return (
      <html lang="en" className="h-full">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Roboto+Mono:ital,wght@0,100..700;1,100..700&family=Lobster&family=Pacifico&display=swap"
            rel="stylesheet"
          ></link>
        </head>
        <body className="font-body antialiased flex flex-col h-full bg-muted/20">
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </body>
      </html>
    );
  }

  const metadata: Metadata = {
    title: 'RouteWise',
    description: 'Your Journey, Simplified. Book your ride in minutes.',
  };

  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
         href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Roboto+Mono:ital,wght@0,100..700;1,100..700&family=Lobster&family=Pacifico&display=swap"
          rel="stylesheet"
        ></link>
      </head>
      <body className="font-body antialiased flex flex-col h-full bg-muted/20">
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
