"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, onSnapshot, deleteDoc, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { locations, vehicleOptions } from "@/lib/constants";
import type { PriceRule } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

function NairaIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 18V6h10"/>
      <path d="M17 18L7 6"/>
      <path d="M17 6L7 18"/>
      <path d="M6 12h12"/>
    </svg>
  );
}

const formSchema = z.object({
  pickup: z.string({ required_error: 'Please select a pickup location.' }),
  destination: z.string({ required_error: 'Please select a destination.' }),
  vehicleType: z.string({ required_error: 'You need to select a vehicle type.' }),
  price: z.coerce.number().positive({ message: "Price must be a positive number." }),
});

export default function PricingManager() {
  const { toast } = useToast();
  const [priceList, setPriceList] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const q = query(collection(db, "prices"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const prices: PriceRule[] = [];
      querySnapshot.forEach((doc) => {
        prices.push({ id: doc.id, ...doc.data() } as PriceRule);
      });
      setPriceList(prices);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching prices:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch price list." });
      setLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  async function onSubmit(data: z.infer<typeof formSchema>) {
    const priceId = `${data.pickup}_${data.destination}_${data.vehicleType}`.toLowerCase().replace(/\s+/g, '-');
    const priceRef = doc(db, "prices", priceId);

    try {
      await setDoc(priceRef, data, { merge: true });
      toast({
        title: "Price Rule Saved",
        description: "The price has been successfully added or updated.",
      });
      form.reset();
    } catch (error) {
      console.error("Error saving price:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save the price rule. Please try again.",
      });
    }
  }

  async function handleDelete(priceId: string) {
    try {
      await deleteDoc(doc(db, "prices", priceId));
      toast({
        title: "Price Rule Deleted",
        description: "The price rule has been removed.",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Could not delete the price rule. Please try again.",
      });
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Add New Price Rule</CardTitle>
            <CardDescription>Set a fare for a specific route and vehicle.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="pickup" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup Location</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger></FormControl>
                      <SelectContent>{locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="destination" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger></FormControl>
                      <SelectContent>{locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="vehicleType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a vehicle" /></SelectTrigger></FormControl>
                      <SelectContent>{Object.values(vehicleOptions).map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <NairaIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="number" step="0.01" placeholder="50.00" {...field} className="pl-9" />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Save Price"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
      <div className="md:col-span-2">
        <Card>
            <CardHeader>
                <CardTitle>Current Price List</CardTitle>
                <CardDescription>A list of all active pricing rules.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Route</TableHead>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {loading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-10">Loading prices...</TableCell></TableRow>
                        ) : priceList.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-10">No price rules set yet.</TableCell></TableRow>
                        ) : (
                            priceList.map((rule) => (
                                <TableRow key={rule.id}>
                                    <TableCell>
                                        <div className="font-medium">{rule.pickup}</div>
                                        <div className="text-sm text-muted-foreground">to {rule.destination}</div>
                                    </TableCell>
                                    <TableCell>{rule.vehicleType}</TableCell>
                                    <TableCell>₦{rule.price.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the price rule for this route and vehicle. This action cannot be undone.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(rule.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
