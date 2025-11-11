
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
import { CalendarIcon, User, Mail, Phone, Loader2, MessageCircle, HelpCircle, CreditCard, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import BookingConfirmationDialog from './booking-confirmation-dialog';
import { initializeTransaction } from '@/app/actions/paystack';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/context/booking-context';
import { useSettings } from '@/context/settings-context';
import { getAvailableSeats } from '@/app/actions/get-availability';


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
  const { prices, loading: pricesLoading, createBooking } = useBooking();
  const { isPaystackEnabled, loading: settingsLoading } = useSettings();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isIntendedDatePopoverOpen, setIsIntendedDatePopoverOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [availableSeats, setAvailableSeats] = useState<number | null>(null);
  const [isCheckingSeats, setIsCheckingSeats] = useState(false);
  

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      luggageCount: 0,
      privacyPolicy: false,
    },
  });

  const { watch, setValue, handleSubmit: formHandleSubmit } = form;
  const pickup = watch("pickup");
  const destination = watch("destination");
  const vehicleType = watch("vehicleType");
  const intendedDate = watch("intendedDate");
  const luggageCount = watch("luggageCount");

  const availableVehicles = useMemo(() => {
    if (pickup && destination && prices) {
      return prices.filter(
        (p) => p.pickup === pickup && p.destination === destination
      );
    }
    return [];
  }, [pickup, destination, prices]);
  
  const checkSeats = useCallback(async () => {
    if (pickup && destination && vehicleType && intendedDate) {
        setIsCheckingSeats(true);
        setAvailableSeats(null);
        try {
            const seats = await getAvailableSeats(pickup, destination, vehicleType, format(intendedDate, 'yyyy-MM-dd'));
            setAvailableSeats(seats);
        } catch (error) {
            console.error("Failed to get seat count", error);
            setAvailableSeats(null); 
            toast({
                variant: 'destructive',
                title: 'Could Not Check Seats',
                description: 'Failed to retrieve seat availability. Please try again.'
            });
        } finally {
            setIsCheckingSeats(false);
        }
    } else {
        setAvailableSeats(null);
    }
  }, [pickup, destination, vehicleType, intendedDate, toast]);


  useEffect(() => {
    const isVehicleStillValid = availableVehicles.some(p => p.vehicleType === vehicleType);
    if (pickup && destination && vehicleType && !isVehicleStillValid) {
        setValue('vehicleType', '', { shouldValidate: true });
    }
    checkSeats();
  }, [pickup, destination, vehicleType, intendedDate, setValue, availableVehicles, checkSeats]);


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
        // Final check before proceeding
        const currentSeats = await getAvailableSeats(formData.pickup, formData.destination, formData.vehicleType, format(formData.intendedDate, 'yyyy-MM-dd'));
        if (currentSeats <= 0) {
            toast({
                variant: 'destructive',
                title: 'No Seats Available',
                description: 'Sorry, the last seat was just taken. Please try another trip.',
            });
            setAvailableSeats(0);
            setIsProcessing(false);
            return;
        }
        
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
            };

            const result = await initializeTransaction({
                email: cleanBookingData.email,
                amount: cleanBookingData.totalFare * 100, // Amount in kobo
                metadata: {
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
            await createBooking({ ...formData, totalFare });
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

  const renderSeatStatus = () => {
    if (isCheckingSeats) {
        return (
            <div className="flex items-center text-sm text-muted-foreground mt-2">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Checking availability...</span>
            </div>
        )
    }

    if (availableSeats !== null) {
        if (availableSeats > 0) {
            return (
                <div className="flex items-center text-sm text-green-600 mt-2 font-medium">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    <span>{availableSeats} Seat{availableSeats > 1 ? 's' : ''} Available</span>
                </div>
            )
        } else {
            return (
                <div className="flex items-center text-sm text-destructive mt-2 font-medium">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    <span>Fully Booked</span>
                </div>
            )
        }
    }

    return null;
  }

  const renderSubmitButtonContent = () => {
    if (isProcessing || settingsLoading) {
      return (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>{settingsLoading ? 'Loading...' : 'Processing...'}</span>
        </>
      );
    }
    if (isPaystackEnabled) {
      return (
        <>
          <CreditCard className="mr-2 h-5 w-5" />
          <span>Proceed to Payment</span>
        </>
      );
    }
    return (
      <>
        <Send className="mr-2 h-5 w-5" />
        <span>Submit Booking</span>
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
                        {renderSeatStatus()}
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
          </CardContent>
          <CardFooter className="bg-muted/50 px-6 py-4 mt-8 flex flex-col sm:flex-row items-center justify-between rounded-b-lg">
            <div className="text-center sm:text-left mb-4 sm:mb-0">
                <p className="text-sm text-muted-foreground">Estimated Total Fare</p>
                <p className="text-2xl font-bold text-primary">₦{totalFare.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isProcessing || settingsLoading || totalFare <= 0 || availableSeats === 0 || isCheckingSeats}>
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
