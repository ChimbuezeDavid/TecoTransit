"use client";

import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Route, LayoutDashboard, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  return (
    <header className="bg-card shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-lg text-primary">
            <Route className="h-6 w-6" />
            <span className="font-headline">RouteWise Admin</span>
          </Link>
          <nav className="flex items-center gap-4">
             <Link href="/admin" className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                pathname === '/admin' ? "text-primary" : "text-muted-foreground"
              )}>
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
             <Link href="/admin/pricing" className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                 pathname === '/admin/pricing' ? "text-primary" : "text-muted-foreground"
             )}>
                <span className="font-bold text-base">₦</span>
                <span>Pricing</span>
             </Link>
             <Link href="/admin/price-alert" className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                 pathname === '/admin/price-alert' ? "text-primary" : "text-muted-foreground"
             )}>
                <Megaphone className="h-4 w-4" />
                <span>Price Alert</span>
             </Link>
          </nav>
           <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
