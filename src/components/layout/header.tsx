"use client";

import Link from "next/link";
import { usePathname } from 'next/navigation';
import { Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Don't render the header on admin pages
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="bg-card shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
            <Route className="h-6 w-6" />
            <span className="font-headline">RouteWise</span>
          </Link>
          <nav className="flex items-center gap-6">
             <Link href="/" className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === '/' ? "text-primary" : "text-muted-foreground"
              )}>
                Book a Trip
              </Link>
             <Link href="/faqs" className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === '/faqs' ? "text-primary" : "text-muted-foreground"
             )}>
                FAQs
             </Link>
              {user && (
                 <Link href="/admin" className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    pathname.startsWith('/admin') ? "text-primary" : "text-muted-foreground"
                 )}>
                    Admin
                 </Link>
              )}
          </nav>
        </div>
      </div>
    </header>
  );
}
