

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
        <link rel="icon" href="data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3e%3ctext x='50' y='50' text-anchor='middle' dominant-baseline='middle' font-size='55' font-weight='bold' fill='yellow'%3eTeco%3c/text%3e%3c/svg%3e" />
        <link rel="manifest" href="data:application/json;base64,ew0KICAic2hvcnRfbmFtZSI6ICJUZWNvVHJhbnNpdCIsDQogICJuYW1lIjogIlRlY29UcmFuc2l0IiwNCiAgImRlc2NyaXB0aW9uIjogIkJvb2sgWW91ciBUcmlwIHdpdGggVGVjb1RyYW5zaXQuIEZhc3QsIHJlbGlhYmxlLCBhbmQgY29tZm9ydGFibGUgcmlkZXMgdG8geW91ciBkZXN0aW5hdGlvbi4iLA0KICAiaWNvbnMiOiBbDQogICAgew0KICAgICAgInNyYyI6ICIvZmF2aWNvbi5pY28iLA0KICAgICAgInNpemVzIjogIjY0eDY0IDMyeDMyIDI0eDI0IDE2eDE2IiwNCiAgICAgICJ0eXBlIjogImltYWdlL3gtbGNvbiINCiAgICB9LA0KICAgIHsNCiAgICAgICJzcmMiOiAiL2ljb24tMTkyeDE5Mi5wbmciLA0KICAgICAgInR5cGUiOiAiaW1hZ2UvcG5nIiwNCiAgICAgICJzaXplcyI6ICIxOTJ4MTkyIg0KICAgIH0sDQogICAgew0KICAgICAgInNyYyI6ICIvaWNvbi01MTJ4NTEyLnBuZyIsDQogICAgICJ0eXBlIjogImltYWdlL3BuZyIsDQogICAgICAic2l6ZXMiOiAiNTEyeDUxMiINCiAgICB9DQogIF0sDQogICJzdGFydF91cmwiOiAiLyIsDQogICJkaXNwbGF5IjogInN0YW5kYWxvbmUiLA0KICAidGhlbWVfY29sb3IiOiAiIzAwMDAwMCIsDQogICJiYWNrZ3JvdW5kX2NvbG9yIjogIiMwMDAwMDAiDQp9" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png"></link>
        <meta name="theme-color" content="#fff" />
        <title>TecoTransit</title>
        <meta name="description" content="Book Your Trip with TecoTransit. Fast, reliable, and comfortable rides to your destination." />
        <meta name="mobile-web-app-capable" content="yes"></meta>
        <meta name="apple-mobile-web-app-status-bar-style" content="default"></meta>
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
