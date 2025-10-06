
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { locations, vehicleOptions as allVehicleOptions, LUGGAGE_FARE } from '@/lib/constants';
import Link from 'next/link';
import { useBooking } from '@/context/booking-context';
import type { PriceRule } from '@/lib/types';
import PaymentDialog from './payment-dialog';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, User, Mail, Phone, ArrowRight, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';

const groupBookingSchema = z.object({
  name: z.string().min(2, { message: 'Organizer name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  phone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  numberOfPassengers: z.coerce.number().min(5, { message: 'Group booking must have at least 5 passengers.' }),
  pickup: z.string({ required_error: 'Please select a pickup location.' }),
  destination: z.string({ required_error: 'Please select a destination.' }),
  intendedDate: z.date({ required_error: 'A departure date is required.' }),
  alternativeDate: z.date({ required_error: 'An alternative date is required.' }),
  vehicleType: z.string({ required_error: 'You need to select a vehicle type.' }),
  luggageCount: z.coerce.number().min(0).max(50),
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
      name: '',
      email: '',
      phone: '',
      numberOfPassengers: 5,
      luggageCount: 0,
      privacyPolicy: false,
    },
  });

  const { watch, setValue, trigger, getValues } = form;
  const watchAllFields = watch();

  useEffect(() => {
    const { pickup, destination, vehicleType, luggageCount, numberOfPassengers } = watchAllFields;
    let newBaseFare = 0;

    if (pickup && destination && prices) {
        const vehiclesForRoute = prices.filter(p => p.pickup === pickup && p.destination === destination);
        setAvailableVehicles(vehiclesForRoute);

        const vehicleRule = vehiclesForRoute.find(v => v.vehicleType === vehicleType);
        if (vehicleRule) {
            newBaseFare = vehicleRule.price * numberOfPassengers;
        }

        if (!vehiclesForRoute.some(v => v.vehicleType === vehicleType)) {
            setValue('vehicleType', '');
        }
    } else {
        setAvailableVehicles([]);
    }

    setBaseFare(newBaseFare);
    setTotalFare(newBaseFare + (luggageCount * LUGGAGE_FARE));
  }, [watchAllFields.pickup, watchAllFields.destination, watchAllFields.vehicleType, watchAllFields.luggageCount, watchAllFields.numberOfPassengers, prices, setValue]);

  useEffect(() => {
    const subscription = watch((values, { name }) => {
       if (name === 'pickup') {
          setValue('destination', '');
          setValue('vehicleType', '');
          trigger('destination');
          trigger('vehicleType');
       }
       if (name === 'intendedDate' && values.intendedDate) {
            setValue('alternativeDate', undefined as any);
            trigger('alternativeDate');
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

    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { privacyPolicy, ...restOfData } = data;
    
    setBookingData({
        ...restOfData,
        name: data.name,
        totalFare,
        bookingType: 'group',
    });
    
    setIsPaymentDialogOpen(true);
    setIsProcessing(false);
  }
  
  return (
    <>
    <Card className="w-full shadow-2xl shadow-primary/10 border-t-0 rounded-t-none">
       <CardHeader>
        <CardTitle className="font-headline text-2xl md:text-3xl text-primary">Group Booking (5+)</CardTitle>
        <CardDescription className="mt-2">Planning a trip for a group? Fill out the form below to secure your seats and get a group rate.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8 pt-6">
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Organizer's Name</FormLabel>
                    <FormControl><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Jane Smith" {...field} className="pl-9" /></div></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="group@example.com" {...field} className="pl-9" /></div></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="(123) 456-7890" {...field} className="pl-9" /></div></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="numberOfPassengers" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Number of Passengers</FormLabel>
                    <FormControl><div className="relative"><Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" min="5" {...field} className="pl-9" /></div></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="pickup" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Pickup Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a location" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="destination" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={!form.watch('pickup')}>
                        <FormControl>
                        <SelectTrigger><SelectValue placeholder={!form.watch('pickup') ? 'Select pickup first' : 'Select a destination'} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {locations.filter(loc => loc !== form.watch('pickup')).map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField
                    control={form.control}
                    name="vehicleType"
                    render={({ field }) => (
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
                                <SelectItem key={v.id} value={v.vehicleType}>{v.vehicleType}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField control={form.control} name="luggageCount" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Total Number of Bags for Group</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="intendedDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Preferred Departure Date</FormLabel>
                    <Popover open={isIntendedDatePopoverOpen} onOpenChange={setIsIntendedDatePopoverOpen}>
                        <PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} className={cn("w-full justify-start pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar 
                                mode="single" 
                                selected={field.value} 
                                onSelect={(date) => {
                                    field.onChange(date);
                                    setIsIntendedDatePopoverOpen(false);
                                }}
                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} 
                                initialFocus 
                            />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="alternativeDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Alternative Departure</FormLabel>
                    <Popover open={isAlternativeDatePopoverOpen} onOpenChange={setIsAlternativeDatePopoverOpen}>
                        <PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} className={cn("w-full justify-start pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={!watchAllFields.intendedDate}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar 
                                mode="single" 
                                selected={field.value} 
                                onSelect={(date) => {
                                    field.onChange(date);
                                    setIsAlternativeDatePopoverOpen(false);
                                }}
                                disabled={(date) => date <= (watchAllFields.intendedDate || new Date(new Date().setHours(0,0,0,0)))} 
                                initialFocus 
                            />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )} />
            </div>
            <FormField
              control={form.control}
              name="privacyPolicy"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      I agree to the{" "}
                      <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                        Privacy Policy
                      </Link>
                      {" "}and consent to my data being processed for this inquiry.
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
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isProcessing || baseFare === 0}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Proceed to Payment
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
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
