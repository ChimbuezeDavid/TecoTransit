
import TestPaystackButton from "@/components/test-paystack-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestPaymentPage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Paystack Integration Test</CardTitle>
            <CardDescription>
              Click the button below to initiate a test transaction with Paystack.
              This uses hardcoded data to verify the core integration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TestPaystackButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
