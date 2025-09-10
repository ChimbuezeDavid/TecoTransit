
"use client";

import Link from 'next/link';
import type { Booking } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, User, Mail, Phone, MapPin, Car, Bus, Briefcase, Calendar as CalendarIcon, Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface BookingConfirmationDialogProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingConfirmationDialog({ booking, isOpen, onClose }: BookingConfirmationDialogProps) {
  if (!booking) return null;

  const VehicleIcon = booking.vehicleType.includes('Bus') ? Bus : Car;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="text-center items-center p-6">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <DialogTitle className="mt-4 text-2xl font-headline">Booking Request Received!</DialogTitle>
          <DialogDescription>Your request is now pending confirmation. We will contact you shortly with an update.</DialogDescription>
        </DialogHeader>
        <div className="px-6 space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Booking Summary</h3>
                <Badge variant="secondary" className="text-sm">{booking.status}</Badge>
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
            </div>

            <Separator/>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-3"><VehicleIcon className="h-4 w-4 text-primary flex-shrink-0" /><span><strong>Vehicle:</strong> {booking.vehicleType}</span></div>
                <div className="flex items-center gap-3"><Briefcase className="h-4 w-4 text-primary flex-shrink-0" /><span><strong>Luggage:</strong> {booking.luggageCount}</span></div>
                <div className="flex items-center gap-3"><span className="font-bold text-primary">₦</span><span><strong>Total Fare:</strong> ₦{booking.totalFare.toLocaleString()}</span></div>
            </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row justify-center p-6 mt-6 bg-muted/30 rounded-b-lg">
             <Button asChild onClick={onClose} className="w-full sm:w-auto"><Link href="/"><Home className="mr-2 h-4 w-4" />Go to Homepage</Link></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
