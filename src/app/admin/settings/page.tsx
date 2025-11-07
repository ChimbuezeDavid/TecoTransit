
"use client";

import { useSettings } from "@/context/settings-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, TestTube2 } from "lucide-react";

export default function AdminSettingsPage() {
  const { isPaystackEnabled, setIsPaystackEnabled } = useSettings();
  const { toast } = useToast();

  const handleToggle = (enabled: boolean) => {
    setIsPaystackEnabled(enabled);
    toast({
      title: "Settings Updated",
      description: `Paystack integration is now ${enabled ? "enabled" : "disabled"}.`,
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Application Settings</h1>
        <p className="text-muted-foreground">Manage integrations and other application settings.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Developer Settings</CardTitle>
          <CardDescription>
            These settings are for testing and development purposes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="paystack-toggle" className="text-base font-semibold">
                Enable Paystack Payments
              </Label>
              <p className="text-sm text-muted-foreground">
                When disabled, the booking form will bypass Paystack and create a 'Pending' booking for testing.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {isPaystackEnabled ? (
                <CreditCard className="h-5 w-5 text-primary" />
              ) : (
                <TestTube2 className="h-5 w-5 text-amber-500" />
              )}
              <Switch
                id="paystack-toggle"
                checked={isPaystackEnabled}
                onCheckedChange={handleToggle}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
