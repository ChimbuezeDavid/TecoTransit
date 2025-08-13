"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { Booking } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, User, Mail, Phone, ArrowRight, Car, Bus, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


const luggageFee = 5;
const baseFare = 50;

const locations = [
  "ABUAD",
  "Ojota Lagos",
  "Iyana Paja Lagos",
  "FESTAC Lagos",
  "Ibadan",
  "Ajah Lagos",
  "Warri Delta state"
];

const vehicleOptions = {
    '4-seater': { name: '4-Seater Sienna', icon: Car },
    '5-seater': { name: '5-Seater Sienna', icon: Car },
    '7-seater': { name: '7-Seater Bus', icon: Bus },
};

const bookingSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  phone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  pickup: z.string({ required_error: 'Please select a pickup location.' }),
  destination: z.string({ required_error: 'Please select a destination.' }),
  intendedDate: z.date({ required_error: 'An intended date of departure is required.' }),
  alternativeDate: z.date({ required_error: 'An alternative date is required.' }),
  vehicleType: z.enum(['4-seater', '5-seater', '7-seater'], {
    required_error: 'You need to select a vehicle type.',
  }),
  luggageCount: z.coerce.number().min(0).max(10),
});

export default function BookingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [totalFare, setTotalFare] = useState(0);

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      luggageCount: 0,
    },
  });

  const { watch, getValues } = form;

  useEffect(() => {
    const subscription = watch((values, { name }) => {
      if (name === 'vehicleType' || name === 'luggageCount') {
        const { luggageCount } = getValues();
        const newTotalFare = baseFare + (luggageCount || 0) * luggageFee;
        setTotalFare(newTotalFare);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, getValues]);

  async function onSubmit(data: z.infer<typeof bookingSchema>) {
    const bookingId = uuidv4();
    const newBooking: Booking = {
      ...data,
      id: bookingId,
      intendedDate: format(data.intendedDate, 'PPP'),
      alternativeDate: format(data.alternativeDate, 'PPP'),
      vehicleType: vehicleOptions[data.vehicleType].name as Booking['vehicleType'],
      totalFare,
      status: 'Pending',
      createdAt: Date.now(),
    };

    try {
      // Store in Local Storage
      const existingBookings = JSON.parse(localStorage.getItem('routewise-bookings') || '[]');
      existingBookings.push(newBooking);
      localStorage.setItem('routewise-bookings', JSON.stringify(existingBookings));

      // Store in Firebase
      await addDoc(collection(db, 'bookings'), newBooking);
      
      toast({
        title: "Booking Submitted!",
        description: "Your trip request has been received. We'll be in touch shortly.",
      });

      router.push(`/confirmation/${bookingId}`);
    } catch (error) {
      console.error("Booking submission error:", error);
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: "There was a problem with your request. Please try again.",
      });
    }
  }

  const selectedVehicle = watch('vehicleType');

  return (
    <Card className="w-full shadow-2xl shadow-primary/10">
       <CardHeader className="text-center">
        <CardTitle className="font-headline text-3xl text-primary">Book Your Ride With Ease</CardTitle>
        <CardDescription>Fill out the form below to secure your spot.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8 pt-6">
            <div className="space-y-6">
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a destination" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="intendedDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Intended Departure</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} className={cn("w-full justify-start pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                             <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} initialFocus />
                        </PopoverContent></Popover>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="alternativeDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Alternative Departure</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} className={cn("w-full justify-start pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                             <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} initialFocus />
                        </PopoverContent></Popover>
                        <FormMessage />
                        </FormItem>
                    )} />
                     <FormField control={form.control} name="luggageCount" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Number of Bags</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} defaultValue={String(field.value)}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select number of bags" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {[...Array(7).keys()].map(i => <SelectItem key={i} value={String(i)}>{i === 0 ? 'None' : i}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                </div>
                
                 <FormField
                    control={form.control}
                    name="vehicleType"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Select Vehicle Type</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-1 md:grid-cols-3 gap-4"
                            >
                            {Object.entries(vehicleOptions).map(([key, { name, icon: Icon }]) => (
                                <FormItem key={key} className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                    <RadioGroupItem value={key} className="sr-only" />
                                </FormControl>
                                <FormLabel className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground w-full cursor-pointer relative", selectedVehicle === key && "border-primary")}>
                                    {selectedVehicle === key && <CheckCircle className="h-5 w-5 text-primary absolute top-2 right-2" />}
                                    <Icon className="mb-3 h-6 w-6" />
                                    {name}
                                </FormLabel>
                                </FormItem>
                            ))}
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 px-6 py-4 mt-8 flex flex-col sm:flex-row items-center justify-between rounded-b-lg">
            <div className="text-center sm:text-left mb-4 sm:mb-0">
                <p className="text-sm text-muted-foreground">Estimated Total Fare</p>
                <p className="text-2xl font-bold text-primary">₦{totalFare.toFixed(2)}</p>
            </div>
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Submitting..." : "Book My Trip"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
