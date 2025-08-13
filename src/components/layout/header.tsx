"use client";

import Link from "next/link";
import { usePathname } from 'next/navigation';
import { Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-card shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
            <Route className="h-6 w-6" />
            <span className="font-headline">RouteWise</span>
          </Link>
          <nav className="flex items-center gap-2">
             <Button variant={pathname === '/trips' ? "secondary" : "ghost"} asChild>
              <Link href="/trips">My Trips</Link>
            </Button>
            <Button variant={pathname === '/' ? "default" : "outline"} asChild>
              <Link href="/">Book A Trip</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
