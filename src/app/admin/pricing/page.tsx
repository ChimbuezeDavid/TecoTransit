
import PricingManager from "@/components/admin/pricing-manager";

export default function AdminPricingPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Pricing Management</h1>
        <p className="text-muted-foreground">Set and manage fares for different routes and vehicle types.</p>
      </div>
      <PricingManager />
    </div>
  );
}
