
"use client";

import AdminDashboard from "@/components/admin/admin-dashboard";

export default function AdminDashboardPage() {
  // The dashboard component fetches its own data now.
  // We pass empty initial values to prevent prop-drilling issues.
  return (
      <AdminDashboard allBookings={[]} loading={true} />
  );
}
    