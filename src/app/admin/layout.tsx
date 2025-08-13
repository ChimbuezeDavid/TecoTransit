"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import AdminHeader from "@/components/layout/admin-header";
import AdminFooter from "@/components/layout/admin-footer";

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
    <div className="flex flex-col min-h-screen">
      <AdminHeader />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/40 overflow-auto">
        {children}
      </main>
      <AdminFooter />
    </div>
  );
}
