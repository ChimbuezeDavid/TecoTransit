
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { locations } from '@/lib/constants';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, User, Mail, Phone, ArrowRight, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';

const groupBookingSchema = z.object({
  organizerName: z.string().min(2, { message: 'Organizer name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  phone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  numberOfPassengers: z.coerce.number().min(5, { message: 'Group booking must have at least 5 passengers.' }),
  pickup: z.string({ required_error: 'Please select a pickup location.' }),
  destination: z.string({ required_error: 'Please select a destination.' }),
  departureDate: z.date({ required_error: 'A departure date is required.' }),
  message: z.string().optional(),
  privacyPolicy: z.literal(true, {
    errorMap: () => ({ message: "You must accept the privacy policy to continue." }),
  }),
}).refine(data => data.pickup !== data.destination, {
  message: "Pickup and destination cannot be the same.",
  path: ["destination"],
});


export default function GroupBookingForm() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

  const form = useForm<z.infer<typeof groupBookingSchema>>({
    resolver: zodResolver(groupBookingSchema),
    defaultValues: {
      organizerName: '',
      email: '',
      phone: '',
      numberOfPassengers: 5,
      privacyPolicy: false,
    },
  });

  async function onSubmit(data: z.infer<typeof groupBookingSchema>) {
    setIsProcessing(true);
    
    // Here you would typically send this data to your backend or an email service
    // For now, we will just simulate a success message
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log("Group Booking Data:", data);

    toast({
      title: "Inquiry Sent!",
      description: "Your group booking request has been sent. We will contact you shortly to finalize the details.",
    });

    form.reset();
    setIsProcessing(false);
  }
  
  return (
    <Card className="w-full shadow-2xl shadow-primary/10 border-t-0 rounded-t-none">
       <CardHeader>
        <CardTitle className="font-headline text-2xl md:text-3xl text-primary">Group Booking Inquiry</CardTitle>
        <CardDescription className="mt-2">Planning a trip for a group of 5 or more? Fill out the form below and we'll get back to you with a custom quote.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8 pt-6">
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                <FormField control={form.control} name="organizerName" render={({ field }) => (
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
                <FormField control={form.control} name="departureDate" render={({ field }) => (
                    <FormItem className="flex flex-col md:col-span-2">
                    <FormLabel>Preferred Departure Date</FormLabel>
                    <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
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
                                    setIsDatePopoverOpen(false);
                                }}
                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} 
                                initialFocus 
                            />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="message" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>Additional Information (Optional)</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder="Let us know if you have any special requests, such as needing a specific type of vehicle, multiple stops, or a charter service."
                                className="min-h-[100px]"
                                {...field}
                            />
                        </FormControl>
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
          <CardFooter className="bg-muted/50 px-6 py-4 mt-8 flex justify-end rounded-b-lg">
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending Inquiry...
                </>
              ) : (
                <>
                  Send Inquiry
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
