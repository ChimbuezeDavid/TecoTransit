
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
  
  // The login page does not need the auth-protected layout.
  // By returning early, we prevent the loading spinner from flashing.
  if (pathname === "/admin/login") {
      return <>{children}</>;
  }

  useEffect(() => {
    // If auth is done loading and there's no user, redirect to login.
    if (!loading && !user) {
      router.push("/admin/login");
    }
  }, [user, loading, router]);
  

  // While checking for the user, show a loading state.
  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen bg-muted/40">
            <div className="h-12 w-12 border-4 border-t-primary border-transparent rounded-full animate-spin"></div>
        </div>
    );
  }
  
  // If there's no user after loading, the useEffect will handle redirection.
  // Return null to prevent a flash of content.
  if (!user) {
    return null;
  }

  // If a user is logged in, show the protected admin layout.
  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader />
      <main className="flex-grow p-4 sm:p-6 lg:p-8 bg-muted/40">
        {children}
      </main>
      <AdminFooter />
    </div>
  );
}
