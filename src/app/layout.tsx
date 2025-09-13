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
          <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='hsl(52 100% 50%)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'></circle><path d='M12 17.5V12'></path><path d='M12 6.5V12'></path><path d='M17.5 12H12'></path><path d='M6.5 12H12'></path><path d='M15.5 15.5L12 12'></path><path d='M8.5 8.5L12 12'></path><path d='m15.5 8.5-3.5 3.5'></path><path d='m8.5 15.5 3.5-3.5'></path></svg>" />
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
