

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

  // --- PWA Configuration ---
  const userManifest = {
    name: "TecoTransit",
    short_name: "TecoTransit",
    description: "Book your trip with TecoTransit",
    display: "standalone",
    background_color: "#F0F5FB",
    theme_color: "#FFDF00",
    icons: [
      {
        "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOTIgMTkyIiB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiI+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRkZGRjAwIiBmb250LXNpemU9IjEwMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSJib2xkIj5UPC90ZXh0Pjwvc3ZnPg==",
        "sizes": "192x192",
        "type": "image/svg+xml"
      },
      {
        "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRkZGRjAwIiBmb250LXNpemU9IjI1MCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSJib2xkIj5UPC90ZXh0Pjwvc3ZnPg==",
        "sizes": "512x512",
        "type": "image/svg+xml"
      }
    ]
  };

  const adminManifest = {
    name: "TecoTransit Admin",
    short_name: "Teco Admin",
    description: "Admin dashboard for TecoTransit",
    display: "standalone",
    background_color: "#111827",
    theme_color: "#FFDF00",
    icons: [
       {
        "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOTIgMTkyIiB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiI+PGcgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iIzExMTgyNyIgZD0iTTAgMGgxOTJ2MTkySDB6Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRkZGRjAwIiBmb250LXNpemU9IjYwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9ImJvbGQiPlRjQTwvdGV4dD48L2c+PC9zdmc+",
        "sizes": "192x192",
        "type": "image/svg+xml"
      },
      {
        "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+PGcgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iIzExMTgyNyIgZD0iTTAgMGg1MTJ2NTEySDB6Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRkZGRjAwIiBmb250LXNpemU9IjE1MCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSJib2xkIj5UY0E8L3RleHQ+PC9nPgjwvdGV4dD48L2c+PC9zdmc+",
        "sizes": "512x512",
        "type": "image/svg+xml"
      }
    ]
  };
  
  const manifest = isAdminPage ? adminManifest : userManifest;
  const manifestBase64 = Buffer.from(JSON.stringify(manifest)).toString('base64');
  const manifestDataUrl = `data:application/manifest+json;base64,${manifestBase64}`;

  const userFaviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="90" font-family="sans-serif" font-weight="bold" fill="#FFDF00">T</text></svg>`;
  const adminFaviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="hsl(var(--background))" /><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="75" font-family="sans-serif" font-weight="bold" fill="hsl(var(--primary))">TA</text></svg>`;
  const faviconSvg = isAdminPage ? adminFaviconSvg : userFaviconSvg;
  const faviconDataUrl = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`;
  
  // --- End PWA Configuration ---

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
          <meta name="theme-color" content={manifest.theme_color} />
          <link rel="manifest" href={manifestDataUrl} />
          <link rel="apple-touch-icon" href={faviconDataUrl} />
          <link rel="icon" href={faviconDataUrl} type="image/svg+xml" />
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
