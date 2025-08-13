import PriceAlertManager from "@/components/admin/price-alert-manager";

export default function AdminPriceAlertPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Price Alert Management</h1>
        <p className="text-muted-foreground">Create and update a site-wide alert for your customers.</p>
      </div>
      <PriceAlertManager />
    </div>
  );
}
