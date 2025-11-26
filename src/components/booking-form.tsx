

"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { locations, vehicleOptions as allVehicleOptions, LUGGAGE_FARE } from '@/lib/constants';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, User, Mail, Phone, Loader2, MessageCircle, HelpCircle, CreditCard, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import BookingConfirmationDialog from './booking-confirmation-dialog';
import { initializeTransaction } from '@/app/actions/paystack';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/context/settings-context';
import { createPendingBooking } from '@/app/actions/create-booking-and-assign-trip';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PriceRule } from '@/lib/types';


const bookingSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  phone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  pickup: z.string({ required_error: 'Please select a pickup location.' }),
  destination: z.string({ required_error: 'Please select a destination.' }),
  intendedDate: z.date({ required_error: 'A departure date is required.' }),
  vehicleType: z.string({ required_error: 'You need to select a vehicle type.' }),
  luggageCount: z.coerce.number().min(0).max(10),
  privacyPolicy: z.literal(true, {
    errorMap: () => ({ message: "You must accept the privacy policy to continue." }),
  }),
  allowReschedule: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the reschedule policy to continue." }),
  }),
}).refine(data => data.pickup !== data.destination, {
  message: "Pickup and destination cannot be the same.",
  path: ["destination"],
});

const contactOptions = [
    { name: 'Tolu', link: 'https://wa.me/qr/VNXLPTJVCSHQF1' },
    { name: 'Esther', link: 'https://wa.me/message/OD5WZAO2CUCIF1' },
    { name: 'Abraham', link: 'https://wa.me/+2348104050628' },
];


export default function BookingForm() {
  const { toast } = useToast();
  const [prices, setPrices] = useState<PriceRule[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  const { isPaystackEnabled, loading: settingsLoading } = useSettings();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isIntendedDatePopoverOpen, setIsIntendedDatePopoverOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      luggageCount: 0,
      privacyPolicy: false,
      allowReschedule: false,
    },
  });

  // Fetch prices from Firestore
  useEffect(() => {
    const q = query(collection(db, "prices"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const pricesData: PriceRule[] = [];
      querySnapshot.forEach((doc) => {
        pricesData.push({ id: doc.id, ...doc.data() } as PriceRule);
      });
      setPrices(pricesData);
      setPricesLoading(false);
    }, (error) => {
      console.error("Error fetching prices: ", error);
      toast({
        variant: "destructive",
        title: "Could not load prices",
        description: "There was an issue fetching pricing data. Please refresh the page.",
      });
      setPricesLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const { watch, setValue, handleSubmit: formHandleSubmit } = form;
  const pickup = watch("pickup");
  const destination = watch("destination");
  const vehicleType = watch("vehicleType");
  const luggageCount = watch("luggageCount");

  const availableVehicles = useMemo(() => {
    if (pickup && destination && prices) {
      // Filter for price rules that match the route AND have at least one vehicle assigned.
      const priceRule = prices.filter(
        (p) => p.pickup === pickup && p.destination === destination && p.vehicleCount > 0
      );
       if (priceRule.length > 0) {
        return priceRule;
      }
    }
    return [];
  }, [pickup, destination, prices]);
  
  useEffect(() => {
    const isVehicleStillValid = availableVehicles.some(p => p.vehicleType === vehicleType);
    if (pickup && destination && vehicleType && !isVehicleStillValid) {
        setValue('vehicleType', '', { shouldValidate: true });
    }
  }, [pickup, destination, vehicleType, setValue, availableVehicles]);

  const { totalFare, baseFare } = useMemo(() => {
    const vehicleRule = availableVehicles.find(v => v.vehicleType === vehicleType);
    const newBaseFare = vehicleRule ? vehicleRule.price : 0;
    const newTotalFare = newBaseFare + ((luggageCount ?? 0) * LUGGAGE_FARE);
    return { totalFare: newTotalFare, baseFare: newBaseFare };
  }, [availableVehicles, vehicleType, luggageCount]);


  const onBookingSubmit = async (formData: z.infer<typeof bookingSchema>) => {
    if (baseFare <= 0) {
      toast({
        variant: 'destructive',
        title: 'Route Unavailable',
        description: 'This route is currently not available for booking. Please select another.',
      });
      return;
    }
    
    setIsProcessing(true);

    try {
        const priceRuleId = `${formData.pickup}_${formData.destination}_${formData.vehicleType}`.toLowerCase().replace(/\s+/g, '-');
        
        if (isPaystackEnabled) {
            // Live Mode: Proceed to Paystack
            const bookingDataWithFare = { ...formData, totalFare };
            const cleanBookingData = {
              name: bookingDataWithFare.name,
              email: bookingDataWithFare.email,
              phone: bookingDataWithFare.phone,
              pickup: bookingDataWithFare.pickup,
              destination: bookingDataWithFare.destination,
              intendedDate: format(bookingDataWithFare.intendedDate, 'yyyy-MM-dd'),
              vehicleType: bookingDataWithFare.vehicleType,
              luggageCount: bookingDataWithFare.luggageCount,
              totalFare: bookingDataWithFare.totalFare,
              allowReschedule: bookingDataWithFare.allowReschedule,
            };

            const result = await initializeTransaction({
                email: cleanBookingData.email,
                amount: cleanBookingData.totalFare * 100, // Amount in kobo
                metadata: {
                    priceRuleId,
                    booking_details: JSON.stringify(cleanBookingData),
                    custom_fields: [
                        { display_name: "Customer Name", variable_name: "customer_name", value: cleanBookingData.name },
                        { display_name: "Route", variable_name: "route", value: `${cleanBookingData.pickup} to ${cleanBookingData.destination}` }
                    ]
                }
            });
            
            if (result.status && result.data?.authorization_url) {
                router.push(result.data.authorization_url);
            } else {
                throw new Error(result.message || 'Failed to initialize transaction.');
            }
        } else {
            // Test Mode: Bypass Paystack and create a pending booking
            await createPendingBooking({ ...formData, totalFare });
            setIsConfirmationOpen(true);
            form.reset();
        }

    } catch (error) {
        console.error("Booking/Payment error:", error);
        toast({
            variant: "destructive",
            title: "Oh no! Something went wrong.",
            description: `We couldn't process your request. Please try again. ${error instanceof Error ? error.message : ''}`,
        });
    } finally {
        setIsProcessing(false);
    }
  };

  const selectedVehicleDetails = vehicleType ? Object.values(allVehicleOptions).find(v => v.name === vehicleType) : null;
  const luggageOptions = selectedVehicleDetails ? 
    [...Array((selectedVehicleDetails.maxLuggages ?? 0) + 1).keys()] : 
    [];


   const renderSubmitButtonContent = () => {
    const isLoading = isProcessing || settingsLoading;
    const buttonText = settingsLoading ? 'Loading...' : isProcessing ? 'Processing...' : isPaystackEnabled ? 'Proceed to Payment' : 'Submit Booking';
    const Icon = isLoading ? Loader2 : isPaystackEnabled ? CreditCard : Send;
    
    return (
        <>
            <Icon className={cn("mr-2 h-5 w-5", isLoading && "animate-spin")} />
            <span>{buttonText}</span>
        </>
    );
   };


  return (
    <>
    <Card className="w-full shadow-2xl shadow-primary/10">
       <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 text-center sm:text-left">
            <div>
                <CardTitle className="font-headline text-2xl md:text-3xl text-primary">Booking Details</CardTitle>
                <CardDescription className="mt-2">Fill out the form below to secure your seat.</CardDescription>
            </div>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="shrink-0 w-full sm:w-auto mt-4 sm:mt-0">
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Contact Us
                    </Button>
                </DialogTrigger>
                 <DialogContent className="max-w-md p-6 sm:max-h-full max-h-[65vh]">
                    <DialogHeader className="text-center">
                        <DialogTitle>Contact Customer Service</DialogTitle>
                        <DialogDescription>
                            Have questions or need help with your booking? Reach out to us.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {contactOptions.map(contact => (
                            <Button asChild key={contact.name} className="w-full" size="lg">
                                <Link href={contact.link} target="_blank">
                                    <MessageCircle className="mr-2 h-5 w-5" />
                                    Chat with {contact.name}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={formHandleSubmit(onBookingSubmit)}>
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
                <FormField control={form.control} name="intendedDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Departure Date</FormLabel>
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
                 <FormField control={form.control} name="luggageCount" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Number of Bags (Max {selectedVehicleDetails?.maxLuggages ?? 'N/A'})</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} value={String(field.value || 0)} disabled={!vehicleType}>
                        <FormControl>
                        <SelectTrigger><SelectValue placeholder={!vehicleType ? "Select vehicle first" : "Select number of bags"} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {luggageOptions.map(i => <SelectItem key={i} value={String(i)}>{i === 0 ? 'None' : `${i} bag${i > 1 ? 's' : ''}`}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )} />
            </div>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="allowReschedule"
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
                        I understand that my trip may be rescheduled to the next day if the vehicle is not full.
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
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
                        {" "}and consent to my data being processed.
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 px-6 py-4 mt-8 flex flex-col sm:flex-row items-center justify-between rounded-b-lg">
            <div className="text-center sm:text-left mb-4 sm:mb-0">
                <p className="text-sm text-muted-foreground">Estimated Total Fare</p>
                <p className="text-2xl font-bold text-primary">₦{totalFare.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isProcessing || settingsLoading || totalFare <= 0}>
              {renderSubmitButtonContent()}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>

    <BookingConfirmationDialog
      isOpen={isConfirmationOpen}
      onClose={() => {
        setIsConfirmationOpen(false);
      }}
    />
    </>
  );
}
