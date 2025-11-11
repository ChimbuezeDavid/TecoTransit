
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, TestTube2, Loader2 } from "lucide-react";

const settingsDocRef = doc(db, "settings", "payment");

export default function AdminSettingsPage() {
  const [isPaystackEnabled, setIsPaystackEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsPaystackEnabled(docSnap.data().isPaystackEnabled);
      } else {
        // If the document doesn't exist, create it with a default value
        setDoc(settingsDocRef, { isPaystackEnabled: true });
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch payment settings.",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleToggle = async (enabled: boolean) => {
    try {
      await setDoc(settingsDocRef, { isPaystackEnabled: enabled });
      toast({
        title: "Settings Updated",
        description: `Paystack integration is now ${enabled ? "enabled" : "disabled"}.`,
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update payment settings.",
      });
    }
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
            {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
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
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
