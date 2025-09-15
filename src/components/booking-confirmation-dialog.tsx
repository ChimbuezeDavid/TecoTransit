
"use client";

import Link from 'next/link';
import type { Booking } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, User, Mail, Phone, MapPin, Car, Bus, Briefcase, Calendar as CalendarIcon, Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from './ui/scroll-area';

interface BookingConfirmationDialogProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
        <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="font-medium text-base">{value}</span>
        </div>
    </div>
);

export default function BookingConfirmationDialog({ booking, isOpen, onClose }: BookingConfirmationDialogProps) {
  if (!booking) return null;

  const VehicleIcon = booking.vehicleType.includes('Bus') ? Bus : Car;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md md:max-w-2xl p-0">
        <DialogHeader className="text-center items-center pt-8 px-6 pb-4">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <DialogTitle className="mt-4 text-2xl font-headline">Booking Request Received!</DialogTitle>
          <DialogDescription>Your request is now pending confirmation. We will contact you shortly with an update.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
            <div className="px-6 py-4 space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Booking Summary</h3>
                    <Badge variant="secondary" className="text-sm">{booking.status}</Badge>
                </div>
                
                {/* Mobile Layout */}
                <div className="space-y-5 md:hidden">
                    <DetailItem icon={User} label="Name" value={booking.name} />
                    <DetailItem icon={Mail} label="Email" value={booking.email} />
                    <DetailItem icon={Phone} label="Phone" value={booking.phone} />
                    <Separator/>
                    <DetailItem icon={MapPin} label="From" value={booking.pickup} />
                    <DetailItem icon={MapPin} label="To" value={booking.destination} />
                    <DetailItem icon={CalendarIcon} label="Intended Date" value={booking.intendedDate} />
                    <DetailItem icon={CalendarIcon} label="Alternative Date" value={booking.alternativeDate} />
                    <Separator/>
                    <DetailItem icon={VehicleIcon} label="Vehicle" value={booking.vehicleType} />
                    <DetailItem icon={Briefcase} label="Luggage" value={`${booking.luggageCount} bag(s)`} />
                </div>
                
                {/* Tablet and Desktop Layout */}
                <div className="hidden md:block">
                    <div className="grid md:grid-cols-2 md:gap-x-8 md:gap-y-4">
                        <div className="space-y-5">
                            <DetailItem icon={User} label="Name" value={booking.name} />
                            <DetailItem icon={Mail} label="Email" value={booking.email} />
                            <DetailItem icon={Phone} label="Phone" value={booking.phone} />
                        </div>
                        <div className="space-y-5">
                            <DetailItem icon={MapPin} label="Route" value={`${booking.pickup} to ${booking.destination}`} />
                            <DetailItem icon={CalendarIcon} label="Intended Date" value={booking.intendedDate} />
                            <DetailItem icon={CalendarIcon} label="Alternative Date" value={booking.alternativeDate} />
                            <DetailItem icon={VehicleIcon} label="Vehicle" value={booking.vehicleType} />
                            <DetailItem icon={Briefcase} label="Luggage" value={`${booking.luggageCount} bag(s)`} />
                        </div>
                    </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-4 flex justify-between items-center mt-4">
                    <span className="font-semibold text-lg">Total Fare</span>
                    <span className="font-bold text-xl text-primary">₦{booking.totalFare.toLocaleString()}</span>
                </div>

            </div>
        </ScrollArea>
        <DialogFooter className="flex-col sm:flex-row justify-center p-6 border-t bg-muted/30">
             <Button asChild onClick={onClose} className="w-full sm:w-auto"><Link href="/"><Home className="mr-2 h-4 w-4" />Go to Homepage</Link></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
