// THIS FILE IS MANAGED BY AN AI ASSISTANT. DO NOT EDIT DIRECTLY.

'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';
import { BookingProvider } from '@/context/booking-context';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { PT_Sans, Playfair_Display, Roboto_Mono, Lobster, Pacifico } from 'next/font/google';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-playfair-display',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-roboto-mono',
});

const lobster = Lobster({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-lobster',
});

const pacifico = Pacifico({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-pacifico',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <title>TecoTransit</title>
        <meta name="description" content="Book Your Trip with TecoTransit. Fast, reliable, and comfortable rides to your destination." />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#D4AF37" />
      </head>
      <body
        className={`${ptSans.variable} ${playfairDisplay.variable} ${robotoMono.variable} ${lobster.variable} ${pacifico.variable} font-body antialiased flex flex-col h-full bg-muted/20`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <BookingProvider>
              {isAdminPage ? (
                <>{children}</>
              ) : (
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-grow">{children}</main>
                  <Footer />
                </div>
              )}
              <Toaster />
            </BookingProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
