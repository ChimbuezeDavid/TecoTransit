

"use client";

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { locations, vehicleOptions as allVehicleOptions, LUGGAGE_FARE } from '@/lib/constants';
import Link from 'next/link';
import { useBooking } from '@/context/booking-context';
import type { Booking, PriceRule, Passenger } from '@/lib/types';
import PaymentDialog from './payment-dialog';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, User, Mail, Phone, ArrowRight, Loader2, Users, PlusCircle, Trash2, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';

const passengerSchema = z.object({
  name: z.string().min(2, { message: 'Name is required.' }),
  email: z.string().email({ message: 'Valid email is required.' }),
  phone: z.string().min(10, { message: 'Valid phone is required.' }),
  luggageCount: z.coerce.number().min(0, 'Cannot be negative.').max(10),
});

const groupBookingSchema = z.object({
  pickup: z.string({ required_error: 'Please select a pickup location.' }),
  destination: z.string({ required_error: 'Please select a destination.' }),
  intendedDate: z.date({ required_error: 'A departure date is required.' }),
  alternativeDate: z.date({ required_error: 'An alternative date is required.' }),
  vehicleType: z.string({ required_error: 'You need to select a vehicle type.' }),
  passengers: z.array(passengerSchema).min(1, { message: "You must add at least one passenger." }),
  privacyPolicy: z.literal(true, {
    errorMap: () => ({ message: "You must accept the privacy policy to continue." }),
  }),
}).refine(data => data.pickup !== data.destination, {
  message: "Pickup and destination cannot be the same.",
  path: ["destination"],
});


export default function GroupBookingForm() {
  const { toast } = useToast();
  const { prices, loading: pricesLoading } = useBooking();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isIntendedDatePopoverOpen, setIsIntendedDatePopoverOpen] = useState(false);
  const [isAlternativeDatePopoverOpen, setIsAlternativeDatePopoverOpen] = useState(false);
  const [totalFare, setTotalFare] = useState(0);
  const [baseFare, setBaseFare] = useState(0);
  const [availableVehicles, setAvailableVehicles] = useState<PriceRule[]>([]);
  const [bookingData, setBookingData] = useState<any>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof groupBookingSchema>>({
    resolver: zodResolver(groupBookingSchema),
    defaultValues: {
      passengers: [],
      privacyPolicy: false,
    },
  });

  const { control, watch, setValue, trigger, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "passengers",
  });

  const watchAllFields = watch();
  const watchVehicleType = watch('vehicleType');
  const watchPassengers = watch('passengers');
  
  const selectedVehicleDetails = watchVehicleType ? Object.values(allVehicleOptions).find(v => v.name === watchVehicleType) : null;
  const maxPassengers = selectedVehicleDetails?.capacity ?? 0;

  useEffect(() => {
    const { pickup, destination, vehicleType, passengers } = watchAllFields;
    let newBaseFare = 0;
    let newTotalFare = 0;

    if (pickup && destination && prices) {
        const vehiclesForRoute = prices.filter(p => p.pickup === pickup && p.destination === destination);
        setAvailableVehicles(vehiclesForRoute);

        const vehicleRule = vehiclesForRoute.find(v => v.vehicleType === vehicleType);
        if (vehicleRule && passengers.length > 0) {
            newBaseFare = vehicleRule.price * passengers.length;
            const totalLuggage = passengers.reduce((acc, p) => acc + (p.luggageCount || 0), 0);
            newTotalFare = newBaseFare + (totalLuggage * LUGGAGE_FARE);
        }

        if (!vehiclesForRoute.some(v => v.vehicleType === vehicleType)) {
            setValue('vehicleType', '');
        }
    } else {
        setAvailableVehicles([]);
    }

    setBaseFare(newBaseFare);
    setTotalFare(newTotalFare);
  }, [watchAllFields.pickup, watchAllFields.destination, watchAllFields.vehicleType, watchPassengers, prices, setValue]);

  useEffect(() => {
    const subscription = watch((values, { name }) => {
       if (name === 'pickup') {
          setValue('destination', '');
          setValue('vehicleType', '');
       }
       if (name === 'vehicleType') {
           setValue('passengers', []);
       }
       if (name === 'intendedDate' && values.intendedDate) {
            setValue('alternativeDate', undefined as any);
       }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, trigger]);

  async function onSubmit(data: z.infer<typeof groupBookingSchema>) {
    setIsProcessing(true);
    if (baseFare === 0) {
        toast({ variant: 'destructive', title: "Cannot Book", description: "This route is currently unavailable for booking. Please select different options." });
        setIsProcessing(false);
        return;
    }
    if (data.passengers.length === 0) {
        toast({ variant: 'destructive', title: "No Passengers", description: "Please add at least one passenger to the booking." });
        setIsProcessing(false);
        return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { privacyPolicy, ...restOfData } = data;
    const firstPassenger = data.passengers[0];
    
    setBookingData({
        ...restOfData,
        name: firstPassenger.name,
        email: firstPassenger.email,
        phone: firstPassenger.phone,
        totalFare,
        bookingType: 'group',
        numberOfPassengers: data.passengers.length,
    });
    
    setIsPaymentDialogOpen(true);
    setIsProcessing(false);
  }
  
  return (
    <>
    <Card className="w-full shadow-2xl shadow-primary/10 border-t-0 rounded-t-none">
       <CardHeader>
        <CardTitle className="font-headline text-2xl md:text-3xl text-primary">Group Booking</CardTitle>
        <CardDescription className="mt-2">Organize a trip for your group. Select a vehicle, then add passenger details.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8 pt-6">

            {/* Trip Details */}
            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground">Trip Details</h3>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                    <FormField control={form.control} name="pickup" render={({ field }) => (
                        <FormItem><FormLabel>Pickup Location</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select a location" /></SelectTrigger></FormControl><SelectContent>{locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="destination" render={({ field }) => (
                        <FormItem><FormLabel>Destination</FormLabel><Select onValueChange={field.onChange} value={field.value || ''} disabled={!form.watch('pickup')}><FormControl><SelectTrigger><SelectValue placeholder={!form.watch('pickup') ? 'Select pickup first' : 'Select a destination'} /></SelectTrigger></FormControl><SelectContent>{locations.filter(loc => loc !== form.watch('pickup')).map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="intendedDate" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Preferred Departure Date</FormLabel><Popover open={isIntendedDatePopoverOpen} onOpenChange={setIsIntendedDatePopoverOpen}><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); setIsIntendedDatePopoverOpen(false); }} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="alternativeDate" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Alternative Departure</FormLabel><Popover open={isAlternativeDatePopoverOpen} onOpenChange={setIsAlternativeDatePopoverOpen}><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={!watchAllFields.intendedDate}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); setIsAlternativeDatePopoverOpen(false); }} disabled={(date) => date <= (watchAllFields.intendedDate || new Date(new Date().setHours(0,0,0,0)))} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                    )} />
                </div>
            </div>

            <Separator />

            {/* Passenger Details */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Passenger Information</h3>
                        <p className="text-sm text-muted-foreground">First, select a vehicle, then add passengers. The first passenger is the primary contact.</p>
                    </div>
                    <Button type="button" onClick={() => append({ name: '', email: '', phone: '', luggageCount: 0 })} disabled={!watchVehicleType || fields.length >= maxPassengers}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Passenger
                    </Button>
                </div>
                
                 <div className="grid md:grid-cols-2 gap-x-8">
                    <FormField control={form.control} name="vehicleType" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Vehicle Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={pricesLoading || availableVehicles.length === 0}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={
                                    pricesLoading ? 'Loading vehicles...' : 
                                    !watchAllFields.pickup || !watchAllFields.destination ? 'Select route first' : 
                                    availableVehicles.length === 0 ? 'No vehicles for this route' :
                                    'Select a vehicle'
                                } />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {availableVehicles.map((v) => (
                                <SelectItem key={v.id} value={v.vehicleType}>{v.vehicleType} (Max {Object.values(allVehicleOptions).find(opt => opt.name === v.vehicleType)?.capacity} people)</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                </div>

                {fields.length > 0 && (
                    <div className="space-y-6 rounded-lg border p-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="space-y-4 rounded-md border border-dashed p-4 relative">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-semibold text-md mb-2">Passenger {index + 1}</h4>
                                     <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                     <FormField control={control} name={`passengers.${index}.name`} render={({ field }) => (
                                        <FormItem className="md:col-span-2"><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                     )} />
                                     <FormField control={control} name={`passengers.${index}.email`} render={({ field }) => (
                                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                                     )} />
                                     <FormField control={control} name={`passengers.${index}.phone`} render={({ field }) => (
                                        <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                                     )} />
                                     <FormField control={control} name={`passengers.${index}.luggageCount`} render={({ field }) => (
                                         <FormItem><FormLabel>Bags</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                                     )} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                 {errors.passengers && typeof errors.passengers.message === 'string' && (
                    <p className="text-sm font-medium text-destructive">{errors.passengers.message}</p>
                )}
            </div>

            <FormField
              control={form.control}
              name="privacyPolicy"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      I agree to the{" "}
                      <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                        Privacy Policy
                      </Link>
                      {" "}and confirm I have consent from all passengers to share their data.
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="bg-muted/50 px-6 py-4 mt-8 flex flex-col sm:flex-row items-center justify-between rounded-b-lg">
            <div className="text-center sm:text-left mb-4 sm:mb-0">
                <p className="text-sm text-muted-foreground">Estimated Total Fare</p>
                <p className="text-2xl font-bold text-primary">₦{totalFare.toLocaleString()}</p>
            </div>
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isProcessing || baseFare === 0 || fields.length === 0}>
              {isProcessing ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</>) : (<>Proceed to Payment<ArrowRight className="ml-2 h-5 w-5" /></>)}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
    {bookingData && (
        <PaymentDialog
            isOpen={isPaymentDialogOpen}
            onClose={() => setIsPaymentDialogOpen(false)}
            bookingData={bookingData}
            onBookingComplete={() => {
                form.reset();
                setBookingData(null);
            }}
        />
    )}
    </>
  );
}

    