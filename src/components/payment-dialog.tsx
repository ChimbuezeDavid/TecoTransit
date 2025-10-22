
"use client";

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { BookingFormData } from '@/lib/types';
import { Loader2, CreditCard } from 'lucide-react';
import { PaystackButton } from './paystack-button';
import type { PaystackProps } from 'react-paystack/dist/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingFormData | null;
  onSuccess: (data: BookingFormData, reference: string | null) => void;
  isProcessing: boolean;
}

const PaymentDialog: React.FC<PaymentDialogProps> = ({ isOpen, onClose, bookingData, onSuccess, isProcessing }) => {
  const { toast } = useToast();

  const handlePaystackClose = () => {
    if (!isProcessing) {
      toast({
        variant: 'destructive',
        title: 'Payment Cancelled',
        description: 'You have closed the payment process.',
      });
      onClose();
    }
  };
  
  const handlePaystackSuccess = (reference: any) => {
    if (bookingData) {
        onSuccess(bookingData, reference.reference);
    } else {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Booking data was not available on payment success.',
        });
    }
  };

  if (!bookingData) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Loading...</DialogTitle>
                </DialogHeader>
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DialogContent>
        </Dialog>
    );
  }

  const config: PaystackProps = {
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
      email: bookingData.email,
      amount: Math.round(bookingData.totalFare * 100), // Amount in kobo
      reference: `tec_${uuidv4().split('-').join('')}`,
      metadata: {
        name: bookingData.name,
        phone: bookingData.phone,
        custom_fields: [
          {
            display_name: 'Route',
            variable_name: 'route',
            value: `${bookingData.pickup} to ${bookingData.destination}`,
          },
        ],
      },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-6 pb-4 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-primary" />
          <DialogTitle className="mt-4 text-2xl font-headline">Confirm Your Payment</DialogTitle>
          <DialogDescription>
            You are about to pay for your TecoTransit booking. Please confirm the details below before proceeding.
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 space-y-4">
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-semibold">{bookingData.name}</span>
            </div>
             <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Route:</span>
                <span className="font-semibold">{bookingData.pickup} to {bookingData.destination}</span>
            </div>
             <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Vehicle:</span>
                <span className="font-semibold">{bookingData.vehicleType}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-muted-foreground text-lg">Total Amount:</span>
                <span className="font-bold text-2xl text-primary">₦{bookingData.totalFare.toLocaleString()}</span>
            </div>
        </div>

        <DialogFooter className="p-6 mt-4 bg-muted/50">
            <PaystackButton
                config={config}
                onSuccess={handlePaystackSuccess}
                onClose={handlePaystackClose}
                isProcessing={isProcessing}
            />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
