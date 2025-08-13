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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";


const formSchema = z.object({
  content: z.string().min(10, { message: "Alert content must be at least 10 characters." }),
  display: z.boolean().default(true),
  font: z.string(),
  fontSize: z.string(),
});

export default function PriceAlertManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
      display: true,
      font: "font-body",
      fontSize: "text-sm",
    }
  });

  useEffect(() => {
    const fetchAlert = async () => {
      setLoading(true);
      try {
        const alertDoc = await getDoc(doc(db, "alerts", "current"));
        if (alertDoc.exists()) {
          const data = alertDoc.data() as PriceAlert;
          form.reset(data);
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
        description: "The alert has been successfully saved.",
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Update Customer Price Alert</CardTitle>
            <CardDescription>
              Write a message and customize its appearance. This will be displayed prominently on the customer booking page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                <div className="h-24 w-full bg-muted rounded animate-pulse" />
                <div className="h-10 w-full bg-muted rounded animate-pulse" />
                <div className="h-10 w-full bg-muted rounded animate-pulse" />
              </div>
            ) : (
              <>
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

                <Separator />
                
                <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="display"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Display Alert</FormLabel>
                            <CardDescription>
                              Turn this on to show the alert to customers.
                            </CardDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                     <div className="grid grid-cols-2 gap-4">
                       <FormField control={form.control} name="font" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Font Style</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select a font" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="font-body">PT Sans (Default)</SelectItem>
                                <SelectItem value="font-headline">PT Sans (Headline)</SelectItem>
                                <SelectItem value="font-code">Monospace</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                       <FormField control={form.control} name="fontSize" render={({ field }) => (
                           <FormItem>
                            <FormLabel>Font Size</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select a size" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="text-xs">Extra Small</SelectItem>
                                <SelectItem value="text-sm">Small (Default)</SelectItem>
                                <SelectItem value="text-base">Medium</SelectItem>
                                <SelectItem value="text-lg">Large</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                    </div>
                </div>
              </>
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
