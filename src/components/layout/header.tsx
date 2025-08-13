"use client";

import Link from "next/link";
import { Route } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="bg-card shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
            <Route className="h-6 w-6" />
            <span className="font-headline">RouteWise</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/">Book A Trip</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/trips">My Trips</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
