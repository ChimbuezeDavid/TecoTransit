
"use client";

import AdminDashboard from "@/components/admin/admin-dashboard";
import { useBooking } from "@/context/booking-context";

export default function AdminDashboardPage() {
  // Although the dashboard component fetches its own data now,
  // we keep the context provider structure for other potential uses.
  const { bookings, loading } = useBooking();

  return (
      <AdminDashboard allBookings={bookings} loading={loading} />
  );
}

    