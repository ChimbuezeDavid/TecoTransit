
import PaymentsManager from "@/components/admin/payments-manager";

export default function AdminPaymentsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Payment Management</h1>
        <p className="text-muted-foreground">Review and verify all customer payment receipts.</p>
      </div>
      <PaymentsManager />
    </div>
  );
}
