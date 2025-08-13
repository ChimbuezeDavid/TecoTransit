
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Booking } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, User, Mail, Phone, MapPin, Car, Bus, Briefcase, Calendar as CalendarIcon, AlertCircle, Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

export default function ConfirmationPage({ params }: { params: { id: string } }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const { id } = params;

  useEffect(() => {
    if (id) {
      try {
        const storedBookings = localStorage.getItem('routewise-bookings');
        if (storedBookings) {
          const bookings: Booking[] = JSON.parse(storedBookings);
          const foundBooking = bookings.find(b => b.id === id);
          setBooking(foundBooking || null);
        }
      } catch (error) {
        console.error("Failed to load booking from local storage", error);
      } finally {
        setLoading(false);
      }
    }
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <Card className="w-full max-w-2xl animate-pulse">
            <CardHeader><div className="h-8 w-3/4 bg-muted rounded"></div></CardHeader>
            <CardContent className="space-y-4 mt-4">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
            </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <Card className="w-full max-w-2xl text-center">
          <CardHeader>
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4">Booking Not Found</CardTitle>
            <CardDescription>We couldn't find the booking you're looking for. It might have been removed or the link is incorrect.</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild><Link href="/">Go to Homepage</Link></Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const getStatusVariant = (status: Booking['status']) => {
    switch (status) {
      case 'Confirmed': return 'default';
      case 'Cancelled': return 'destructive';
      case 'Pending': return 'secondary';
      default: return 'outline';
    }
  };

  const VehicleIcon = booking.vehicleType.includes('Bus') ? Bus : Car;

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center bg-muted/30 rounded-t-lg">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <CardTitle className="mt-4 text-2xl font-headline">Booking Request Received!</CardTitle>
            <CardDescription>Your request is now pending confirmation. We will contact you shortly.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Booking Summary</h3>
                <Badge variant={getStatusVariant(booking.status)} className="text-sm">{booking.status}</Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3"><User className="h-4 w-4 mt-1 text-primary flex-shrink-0" /><span><strong>Name:</strong> {booking.name}</span></div>
                <div className="flex items-start gap-3"><Mail className="h-4 w-4 mt-1 text-primary flex-shrink-0" /><span><strong>Email:</strong> {booking.email}</span></div>
                <div className="flex items-start gap-3"><Phone className="h-4 w-4 mt-1 text-primary flex-shrink-0" /><span><strong>Phone:</strong> {booking.phone}</span></div>
            </div>

            <Separator/>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3"><MapPin className="h-4 w-4 mt-1 text-primary flex-shrink-0" /><span><strong>From:</strong> {booking.pickup}</span></div>
                <div className="flex items-start gap-3"><MapPin className="h-4 w-4 mt-1 text-primary flex-shrink-0" /><span><strong>To:</strong> {booking.destination}</span></div>
                <div className="flex items-start gap-3"><CalendarIcon className="h-4 w-4 mt-1 text-primary flex-shrink-0" /><span><strong>Intended Date:</strong> {booking.intendedDate}</span></div>
                <div className="flex items-start gap-3"><CalendarIcon className="h-4 w-4 mt-1 text-primary flex-shrink-0" /><span><strong>Alternative:</strong> {booking.alternativeDate}</span></div>
                 {booking.status === 'Confirmed' && booking.confirmedDate && (
                    <div className="flex items-start gap-3 sm:col-span-2 text-primary font-bold"><CheckCircle className="h-4 w-4 mt-1 flex-shrink-0" /><span><strong>Confirmed Date:</strong> {booking.confirmedDate}</span></div>
                )}
            </div>

            <Separator/>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-3"><VehicleIcon className="h-4 w-4 text-primary flex-shrink-0" /><span><strong>Vehicle:</strong> {booking.vehicleType}</span></div>
                <div className="flex items-center gap-3"><Briefcase className="h-4 w-4 text-primary flex-shrink-0" /><span><strong>Luggage:</strong> {booking.luggageCount}</span></div>
                <div className="flex items-center gap-3"><NairaIcon className="h-4 w-4 text-primary flex-shrink-0" /><span><strong>Total Fare:</strong> ₦{booking.totalFare.toFixed(2)}</span></div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center p-6 bg-muted/30 rounded-b-lg">
             <Button asChild><Link href="/"><Home className="mr-2 h-4 w-4" />Go to Homepage</Link></Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
    