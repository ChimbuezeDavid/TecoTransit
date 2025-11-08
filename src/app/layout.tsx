'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';
import { BookingProvider } from '@/context/booking-context';
import { SettingsProvider } from '@/context/settings-context';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { PT_Sans, Playfair_Display, Roboto_Mono, Lobster, Pacifico, Montserrat, EB_Garamond } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/next"

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

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
});

const garamond = EB_Garamond({
    subsets: ['latin'],
    weight: ['400', '700'],
    variable: '--font-garamond',
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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <title>TecoTransit</title>
        <meta name="description" content="Book Your Trip with TecoTransit. Fast, reliable, and comfortable rides to your destination." />
        <meta name="theme-color" content="#D4AF37" />
      </head>
      <body
        className={`${ptSans.variable} ${playfairDisplay.variable} ${robotoMono.variable} ${lobster.variable} ${pacifico.variable} ${montserrat.variable} ${garamond.variable} font-body antialiased flex flex-col h-full bg-muted/20`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SettingsProvider>
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
            </SettingsProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
