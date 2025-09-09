
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { locations, vehicleOptions as allVehicleOptions } from '@/lib/constants';
import { useBooking } from '@/context/booking-context';
import type { Booking, PriceRule } from '@/lib/types';
import BookingConfirmationDialog from './booking-confirmation-dialog';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, User, Mail, Phone, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';


const bookingSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  phone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  pickup: z.string({ required_error: 'Please select a pickup location.' }),
  destination: z.string({ required_error: 'Please select a destination.' }),
  intendedDate: z.date({ required_error: 'An intended date of departure is required.' }),
  alternativeDate: z.date({ required_error: 'An alternative date is required.' }),
  vehicleType: z.string({ required_error: 'You need to select a vehicle type.' }),
  luggageCount: z.coerce.number().min(0).max(10),
}).refine(data => data.pickup !== data.destination, {
  message: "Pickup and destination cannot be the same.",
  path: ["destination"],
}).refine(data => {
    if (data.intendedDate && data.alternativeDate) {
        return data.alternativeDate > data.intendedDate;
    }
    return true;
}, {
    message: "Alternative date must be after the intended date.",
    path: ["alternativeDate"],
});


export default function BookingForm() {
  const { toast } = useToast();
  const { prices, loading: pricesLoading, createBooking } = useBooking();

  const [totalFare, setTotalFare] = useState(0);
  const [baseFare, setBaseFare] = useState(0);
  const [availableVehicles, setAvailableVehicles] = useState<PriceRule[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Confirmation Dialog State
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Calendar Popover State
  const [isIntendedDatePopoverOpen, setIsIntendedDatePopoverOpen] = useState(false);
  const [isAlternativeDatePopoverOpen, setIsAlternativeDatePopoverOpen] = useState(false);

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      luggageCount: 0,
    },
  });

  const { watch, getValues, setValue, trigger } = form;
  const intendedDate = watch('intendedDate');
  const selectedVehicleType = watch('vehicleType');
  const luggageCount = watch('luggageCount');
  const pickup = watch('pickup');
  const destination = watch('destination');

  // Filter available vehicles based on selected route
  useEffect(() => {
    if (pickup && destination && prices) {
      const vehiclesForRoute = prices.filter(
        (p) => p.pickup === pickup && p.destination === destination
      );
      setAvailableVehicles(vehiclesForRoute);

      // Only reset if the new list doesn't contain the currently selected vehicle
      const currentVehicleStillAvailable = vehiclesForRoute.some(v => v.vehicleType === getValues('vehicleType'));
      if (!currentVehicleStillAvailable) {
        setValue('vehicleType', '');
      }

      if (vehiclesForRoute.length === 0 && !pricesLoading) {
        toast({
          variant: 'destructive',
          title: 'No Vehicles Available',
          description:
            'There are no vehicles scheduled for this route. Please select another.',
        });
      }
    } else {
      setAvailableVehicles([]);
    }
  }, [pickup, destination, prices, setValue, getValues, toast, pricesLoading]);


  // Update fares when selections change
  useEffect(() => {
    const updateFares = () => {
        if (pickup && destination && selectedVehicleType) {
            const vehicleRule = availableVehicles.find(v => v.vehicleType === selectedVehicleType);
            const newBaseFare = vehicleRule ? vehicleRule.price : 0;
            setBaseFare(newBaseFare);
            setTotalFare(newBaseFare + (luggageCount || 0) * 0); // Luggage fee is 0
        } else {
          setBaseFare(0);
          setTotalFare(0);
        }
    }
    updateFares();
  }, [pickup, destination, selectedVehicleType, luggageCount, availableVehicles]);

  // Form value change subscriptions
  useEffect(() => {
    const subscription = watch((values, { name }) => {
       if (name === 'intendedDate' && values.intendedDate) {
            setValue('alternativeDate', undefined as any);
            trigger('alternativeDate');
       }
       if (name === 'vehicleType' && values.vehicleType) {
            const vehicleKey = Object.keys(allVehicleOptions).find(key => allVehicleOptions[key as keyof typeof allVehicleOptions].name === values.vehicleType) as keyof typeof allVehicleOptions;
            const maxLuggages = allVehicleOptions[vehicleKey]?.maxLuggages ?? 0;
            const currentLuggages = getValues('luggageCount');
            if (currentLuggages > maxLuggages) {
                setValue('luggageCount', maxLuggages);
            }
            trigger('luggageCount');
       }
    });
    return () => subscription.unsubscribe();
  }, [watch, getValues, setValue, trigger]);

  async function onSubmit(data: z.infer<typeof bookingSchema>) {
    if (baseFare === 0) {
        toast({ variant: 'destructive', title: "Cannot Book", description: "This route is currently unavailable. Please select a different route or vehicle." });
        return;
    }
    
    setIsSubmitting(true);

    try {
      const newBooking = await createBooking({ ...data, totalFare });
      
      toast({
        title: "Booking Submitted!",
        description: "Your trip request has been received. We'll be in touch shortly.",
      });

      // Show confirmation dialog
      setConfirmedBooking(newBooking);
      setIsConfirmationOpen(true);
      form.reset();

    } catch (error) {
      console.error("Booking submission error:", error);
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: `There was a problem with your request. ${error instanceof Error ? error.message : ''}`,
      });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const selectedVehicleDetails = selectedVehicleType ? Object.values(allVehicleOptions).find(v => v.name === selectedVehicleType) : null;
  const luggageOptions = selectedVehicleDetails ? 
    [...Array((selectedVehicleDetails.maxLuggages ?? 0) + 1).keys()] : 
    [];

  return (
    <>
    <Card className="w-full shadow-2xl shadow-primary/10">
       <CardHeader className="text-center">
        <CardTitle className="font-headline text-3xl text-primary">Booking Details</CardTitle>
        <CardDescription>Fill out the form below to secure your seat.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8 pt-6">
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="John Doe" {...field} className="pl-9" /></div></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="you@example.com" {...field} className="pl-9" /></div></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="(123) 456-7890" {...field} className="pl-9" /></div></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="pickup" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Pickup Location</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); setValue('destination', ''); }} value={field.value || ''}>
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
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={!pickup}>
                        <FormControl>
                        <SelectTrigger><SelectValue placeholder={!pickup ? 'Select pickup first' : 'Select a destination'} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {locations.filter(loc => loc !== pickup).map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
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
                                    !pickup || !destination ? 'Select route first' : 
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
                <FormField control={form.control} name="intendedDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Intended Departure</FormLabel>
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
                            <Button variant={"outline"} className={cn("w-full justify-start pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={!intendedDate}>
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
                                disabled={(date) => date <= (intendedDate || new Date(new Date().setHours(0,0,0,0)))} 
                                initialFocus 
                            />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="luggageCount" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                    <FormLabel>Number of Bags (Max {selectedVehicleDetails?.maxLuggages ?? 'N/A'})</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} value={String(field.value || 0)} disabled={!selectedVehicleType}>
                        <FormControl>
                        <SelectTrigger><SelectValue placeholder={!selectedVehicleType ? "Select vehicle first" : "Select number of bags"} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {luggageOptions.map(i => <SelectItem key={i} value={String(i)}>{i === 0 ? 'None' : `${i} bag${i > 1 ? 's' : ''}`}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )} />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 px-6 py-4 mt-8 flex flex-col sm:flex-row items-center justify-between rounded-b-lg">
            <div className="text-center sm:text-left mb-4 sm:mb-0">
                <p className="text-sm text-muted-foreground">Estimated Total Fare</p>
                <p className="text-2xl font-bold text-primary">₦{totalFare.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting || baseFare === 0}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {isSubmitting ? "Submitting..." : "Book My Trip"}
              {!isSubmitting && <ArrowRight className="ml-2 h-5 w-5" />}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
    <BookingConfirmationDialog
        booking={confirmedBooking}
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
    />
    </>
  );
}
