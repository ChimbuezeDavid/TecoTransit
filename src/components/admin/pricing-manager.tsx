
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Edit, PlusCircle } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

const formSchema = z.object({
  pickup: z.string({ required_error: 'Please select a pickup location.' }),
  destination: z.string({ required_error: 'Please select a destination.' }),
  vehicleType: z.string({ required_error: 'You need to select a vehicle type.' }),
  price: z.coerce.number().positive({ message: "Price must be a positive number." }),
}).refine(data => data.pickup !== data.destination, {
  message: "Pickup and destination cannot be the same.",
  path: ["destination"],
});

function PricingManagerSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <Skeleton className="h-5 w-20" />
                                    <Skeleton className="h-4 w-28 mt-2" />
                                </TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                <TableCell className="text-right flex justify-end gap-2">
                                    <Skeleton className="h-8 w-8" />
                                    <Skeleton className="h-8 w-8" />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function PricingManager() {
  const { toast } = useToast();
  const [priceList, setPriceList] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<PriceRule | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        pickup: "",
        destination: "",
        vehicleType: "",
        price: 0,
    }
  });

  useEffect(() => {
    const q = query(collection(db, "prices"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const prices: PriceRule[] = [];
      querySnapshot.forEach((doc) => {
        prices.push({ id: doc.id, ...doc.data() } as PriceRule);
      });
      prices.sort((a,b) => a.pickup.localeCompare(b.pickup) || a.destination.localeCompare(b.destination));
      setPriceList(prices);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching prices:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch price list. Please ensure Firestore rules are correctly set up." });
      setLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);
  

  useEffect(() => {
    if (isDialogOpen) {
        if (editMode) {
            form.reset({
                pickup: editMode.pickup,
                destination: editMode.destination,
                vehicleType: editMode.vehicleType,
                price: editMode.price
            });
        } else {
            form.reset({
                pickup: "",
                destination: "",
                vehicleType: "",
                price: 0,
            });
        }
    }
  }, [isDialogOpen, editMode, form]);

  const handleAddNew = () => {
    setEditMode(null);
    setIsDialogOpen(true);
  };
  
  const handleEdit = (rule: PriceRule) => {
    setEditMode(rule);
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    // Give time for dialog to close before resetting state
    setTimeout(() => {
      setEditMode(null);
    }, 300);
  }

  const formatNumberWithCommas = (value: string | number) => {
    const num = String(value).replace(/,/g, '');
    if (num === '' || isNaN(Number(num))) return '';
    const parts = num.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };
  
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (/^\d*\.?\d*$/.test(rawValue)) {
      field.onChange(rawValue ? Number(rawValue) : '');
    }
  };

  async function onSubmit(data: z.infer<typeof formSchema>) {
    const priceId = `${data.pickup}_${data.destination}_${data.vehicleType}`.toLowerCase().replace(/\s+/g, '-');
    
    if (!editMode && priceList.some(p => p.id === priceId)) {
        toast({
            variant: "destructive",
            title: "Duplicate Rule",
            description: "A price rule for this route and vehicle already exists. Please edit the existing one.",
        });
        return;
    }

    if (editMode && editMode.id !== priceId && priceList.some(p => p.id === priceId)) {
       toast({
            variant: "destructive",
            title: "Duplicate Rule",
            description: "This combination already exists. Please edit that rule instead.",
        });
        return;
    }

    const reciprocalPriceId = `${data.destination}_${data.pickup}_${data.vehicleType}`.toLowerCase().replace(/\s+/g, '-');
    
    const priceRef = doc(db, "prices", priceId);
    const reciprocalPriceRef = doc(db, "prices", reciprocalPriceId);

    const reciprocalData = {
        ...data,
        pickup: data.destination,
        destination: data.pickup,
    };

    try {
      await setDoc(priceRef, data, { merge: true });
      await setDoc(reciprocalPriceRef, reciprocalData, { merge: true });
      
      if (editMode && editMode.id !== priceId) {
          const oldReciprocalId = `${editMode.destination}_${editMode.pickup}_${editMode.vehicleType}`.toLowerCase().replace(/\s+/g, '-');
          await deleteDoc(doc(db, "prices", editMode.id));
          await deleteDoc(doc(db, "prices", oldReciprocalId));
      }

      toast({
        title: `Price Rule ${editMode ? 'Updated' : 'Saved'}`,
        description: `The prices for the trip and its return have been ${editMode ? 'updated' : 'saved'}.`,
      });
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving price:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save the price rules. Please try again.",
      });
    }
  }

  async function handleDelete(rule: PriceRule) {
    const reciprocalId = `${rule.destination}_${rule.pickup}_${rule.vehicleType}`.toLowerCase().replace(/\s+/g, '-');
    try {
      await deleteDoc(doc(db, "prices", rule.id));
      await deleteDoc(doc(db, "prices", reciprocalId));
      toast({
        title: "Price Rules Deleted",
        description: "The price rule and its reciprocal have been removed.",
      });
      if (editMode && editMode.id === rule.id) {
          handleCloseDialog();
      }
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Could not delete the price rules. Please try again.",
      });
    }
  }

  if (loading) {
    return <PricingManagerSkeleton />;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div>
                    <CardTitle>Current Price List</CardTitle>
                    <CardDescription>A list of all active pricing rules.</CardDescription>
                </div>
                 <Button onClick={handleAddNew}>
                    <PlusCircle className="mr-2" />
                    Add New Rule
                 </Button>
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead className="hidden sm:table-cell">Vehicle</TableHead>
                  <TableHead className="hidden sm:table-cell">Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceList.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-10">No price rules set yet.</TableCell></TableRow>
                ) : (
                  priceList.map((rule) => (
                    <TableRow key={rule.id} className={editMode?.id === rule.id ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <div className="font-medium">{rule.pickup}</div>
                        <div className="text-sm text-muted-foreground">to {rule.destination}</div>
                        <div className="sm:hidden text-sm text-muted-foreground mt-1">{rule.vehicleType} - ₦{rule.price.toLocaleString()}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{rule.vehicleType}</TableCell>
                      <TableCell className="hidden sm:table-cell">₦{rule.price.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}><Edit className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the price rule for this route and its reciprocal. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(rule)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{editMode ? 'Edit Price Rule' : 'Add New Price Rule'}</DialogTitle>
          <DialogDescription>{editMode ? 'Update the fare for this specific route.' : 'Set a fare for a specific route and vehicle. A return price will be created automatically.'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField control={form.control} name="pickup" render={({ field }) => (
            <FormItem>
                <FormLabel>Pickup Location</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger></FormControl>
                <SelectContent>{locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
            )} />
            <FormField control={form.control} name="destination" render={({ field }) => (
            <FormItem>
                <FormLabel>Destination</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger></FormControl>
                <SelectContent>{locations.filter(loc => loc !== form.watch('pickup')).map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
            )} />
            <FormField control={form.control} name="vehicleType" render={({ field }) => (
            <FormItem>
                <FormLabel>Vehicle Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a vehicle" /></SelectTrigger></FormControl>
                <SelectContent>{Object.values(vehicleOptions).map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
            )} />
            <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                    <FormLabel>Price (NGN)</FormLabel>
                    <FormControl>
                        <Input 
                            id="price"
                            type="text"
                            inputMode="decimal" 
                            placeholder="50,000"
                            value={field.value ? formatNumberWithCommas(field.value) : ''}
                            onChange={(e) => handlePriceChange(e, field)}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <DialogFooter className="pt-4">
                <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
                    {form.formState.isSubmitting ? (editMode ? "Updating..." : "Saving...") : (editMode ? "Update Price" : "Save Price")}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
