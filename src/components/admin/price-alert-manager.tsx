"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { PriceAlert } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  content: z.string().min(10, { message: "Alert content must be at least 10 characters." }),
});

export default function PriceAlertManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    }
  });

  useEffect(() => {
    const fetchAlert = async () => {
      setLoading(true);
      try {
        const alertDoc = await getDoc(doc(db, "alerts", "current"));
        if (alertDoc.exists()) {
          const data = alertDoc.data() as PriceAlert;
          form.setValue("content", data.content);
        }
      } catch (error) {
        console.error("Error fetching alert:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch the current alert." });
      } finally {
        setLoading(false);
      }
    };
    fetchAlert();
  }, [form, toast]);

  async function onSubmit(data: z.infer<typeof formSchema>) {
    const alertRef = doc(db, "alerts", "current");
    const alertData: PriceAlert = {
      ...data,
      updatedAt: Date.now(),
    };

    try {
      await setDoc(alertRef, alertData, { merge: true });
      toast({
        title: "Price Alert Saved",
        description: "The alert has been successfully saved and is now live.",
      });
    } catch (error) {
      console.error("Error saving alert:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save the alert. Please try again.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Customer Price Alert</CardTitle>
        <CardDescription>
          The content you write here will be displayed as a prominent alert on the main customer booking page. You can use markdown for basic formatting like **bold** or *italics*.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <div className="h-4 w-1/4 bg-muted rounded animate-pulse" />
                <div className="h-32 w-full bg-muted rounded animate-pulse" />
              </div>
            ) : (
                <FormField control={form.control} name="content" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="E.g., Special notice: Fares to Lagos will be increasing by 10% starting next month."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={form.formState.isSubmitting || loading}>
              {form.formState.isSubmitting ? "Saving..." : "Save and Publish Alert"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
