import AdminDashboard from "@/components/admin/admin-dashboard";

export default function AdminDashboardPage() {
  return (
    <div>
        <div className="mb-8">
            <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
            <p className="text-muted-foreground">Manage and review all customer booking requests.</p>
        </div>
        <AdminDashboard />
    </div>
  );
}
