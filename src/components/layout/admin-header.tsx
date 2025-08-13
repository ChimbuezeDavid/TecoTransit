
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Route, LayoutDashboard, Megaphone, Menu, SheetClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  const navLinks = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/pricing", icon: () => <span className="font-bold text-base">₦</span>, label: "Pricing" },
    { href: "/admin/price-alert", icon: Megaphone, label: "Site Alert" },
  ];

  return (
    <header className="bg-card shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-lg text-primary">
            <Route className="h-6 w-6" />
            <span className="font-headline hidden sm:inline">TecoTransit Admin</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
             {navLinks.map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href} className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                    pathname === href ? "text-primary" : "text-muted-foreground"
                    )}>
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                </Link>
             ))}
          </nav>
           <div className="hidden md:flex">
             <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
           </div>
          
          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[240px]">
                 <div className="flex flex-col h-full">
                    <div className="flex-grow">
                        <SheetClose asChild>
                            <Link href="/admin" className="flex items-center gap-2 font-bold text-lg text-primary mb-8">
                                <Route className="h-6 w-6" />
                                <span className="font-headline">TecoTransit Admin</span>
                            </Link>
                        </SheetClose>
                        <nav className="flex flex-col gap-6">
                            {navLinks.map(({ href, icon: Icon, label }) => (
                                <SheetClose asChild key={href}>
                                    <Link href={href} className={cn(
                                        "flex items-center gap-3 text-base font-medium transition-colors hover:text-primary",
                                        pathname === href ? "text-primary" : "text-muted-foreground"
                                    )}>
                                        <Icon className="h-5 w-5" />
                                        <span>{label}</span>
                                    </Link>
                                </SheetClose>
                            ))}
                        </nav>
                    </div>
                     <div className="mt-auto">
                        <SheetClose asChild>
                            <Button variant="ghost" className="w-full justify-start" size="sm" onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </Button>
                        </SheetClose>
                    </div>
                 </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </div>
    </header>
  );
}
