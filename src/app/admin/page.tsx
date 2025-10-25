
"use client";

import AdminDashboard from "@/components/admin/admin-dashboard";
import { useBooking } from "@/context/booking-context";

export default function AdminDashboardPage() {
  const { bookings, loading } = useBooking();

  return (
    <div>
        <div className="mb-8">
            <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
            <p className="text-muted-foreground">Review key metrics and manage customer booking requests.</p>
        </div>
        <AdminDashboard allBookings={bookings} loading={loading} />
    </div>
  );
}
