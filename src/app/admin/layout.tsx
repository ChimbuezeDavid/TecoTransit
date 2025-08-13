"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";
import { LayoutDashboard, Settings, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== "/admin/login") {
      router.push("/admin/login");
    }
  }, [user, loading, router, pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };
  
  // If we are on the login page, don't render the layout
  if (pathname === "/admin/login") {
      return <>{children}</>;
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="h-12 w-12 border-4 border-t-primary border-transparent rounded-full animate-spin"></div>
        </div>
    );
  }
  
  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
        <Sidebar>
            <SidebarHeader>
                <div className="font-headline font-bold text-lg text-sidebar-primary-foreground p-2">RouteWise Admin</div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => router.push('/admin')} tooltip="Dashboard" isActive={pathname === '/admin'}>
                            <LayoutDashboard />
                            <span>Dashboard</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => {}} tooltip="Settings" disabled>
                            <Settings />
                            <span>Pricing Settings</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={handleLogout}>
                            <LogOut />
                            <span>Logout</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
        <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/40 overflow-auto">
            {children}
        </div>
    </SidebarProvider>
  );
}