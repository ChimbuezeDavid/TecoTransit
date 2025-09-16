
"use client";

import { useState } from 'react';
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { Route, Menu, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { ThemeToggle } from '../theme-toggle';

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (pathname.startsWith('/admin')) {
    return null;
  }

  const getNavLinks = () => {
    const links = [
      { href: "/", label: "Book a Trip", icon: Route },
      { href: "/faqs", label: "FAQs", icon: Menu },
    ];

    if (user) {
      links.push({ href: "/admin", label: "Admin", icon: Shield });
    }
    
    return links;
  };
  
  const navLinks = getNavLinks();
  
  const NavLink = ({ href, label, className = '' }: { href: string; label: string; className?: string }) => (
      <Link href={href} className={cn(
          "font-medium transition-colors hover:text-primary",
          (pathname === href || (href === "/" && pathname.startsWith("/#"))) ? "text-primary" : "text-muted-foreground",
          className
       )}>
        {label}
      </Link>
  );

  return (
    <header className="bg-card shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
            
            <span className="font-headline">TecoTransit</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
             {navLinks.map(link => <NavLink key={link.href} {...link}/>)}
             <ThemeToggle />
          </nav>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                 <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px]">
                <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary mb-8" onClick={() => setIsSheetOpen(false)}>
                    
                    <span className="font-headline">TecoTransit</span>
                </Link>
                <nav className="flex flex-col gap-6">
                    {navLinks.map(link => (
                        <SheetClose asChild key={link.href}>
                             <Link href={link.href} className={cn(
                                "flex items-center gap-3 text-lg font-medium transition-colors hover:text-primary",
                                pathname === link.href ? "text-primary" : "text-muted-foreground",
                             )}>
                                <link.icon className="h-5 w-5" />
                                <span>{link.label}</span>
                            </Link>
                        </SheetClose>
                    ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
