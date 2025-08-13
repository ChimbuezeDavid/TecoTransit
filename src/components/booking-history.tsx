"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Booking } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function BookingHistory() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedBookings = localStorage.getItem('routewise-bookings');
      if (storedBookings) {
        const parsedBookings: Booking[] = JSON.parse(storedBookings);
        // Sort bookings by creation date, newest first
        parsedBookings.sort((a, b) => b.createdAt - a.createdAt);
        setBookings(parsedBookings);
      }
    } catch (error) {
      console.error("Failed to parse bookings from local storage", error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader><div className="h-6 bg-muted rounded w-3/4"></div></CardHeader>
            <CardContent className="space-y-2">
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardContent>
            <CardFooter><div className="h-10 bg-muted rounded w-24"></div></CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card className="text-center py-16">
          <CardHeader>
            <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle className="mt-4">No Trips Found</CardTitle>
            <CardDescription>You haven't booked any trips yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Button asChild>
                <Link href="/">Book Your First Trip</Link>
            </Button>
          </CardContent>
      </Card>
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


  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {bookings.map((booking) => (
        <Card key={booking.id} className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{booking.pickup}</CardTitle>
                <CardDescription>to {booking.destination}</CardDescription>
              </div>
              <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Vehicle:</strong> {booking.vehicleType}</p>
            <p><strong>Intended Date:</strong> {booking.intendedDate}</p>
            {booking.status === 'Confirmed' && booking.confirmedDate && (
                 <p className="text-primary font-semibold"><strong>Confirmed Date:</strong> {booking.confirmedDate}</p>
            )}
            <p><strong>Fare:</strong> ${booking.totalFare.toFixed(2)}</p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/confirmation/${booking.id}`}>View Details</Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
