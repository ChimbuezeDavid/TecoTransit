
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page now simply redirects to the new dashboard page.
export default function AdminRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  // Render a simple loader while redirecting
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="h-12 w-12 border-4 border-t-primary border-transparent rounded-full animate-spin"></div>
    </div>
  );
}
