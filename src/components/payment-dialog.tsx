
"use client";

import { PaystackButton } from 'react-paystack';
import type { PaystackProps } from 'react-paystack/dist/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { BookingFormData } from '@/lib/types';
import { CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingFormData;
  onPaymentSuccess: () => void;
}

export default function PaymentDialog({ isOpen, onClose, bookingData, onPaymentSuccess }: PaymentDialogProps) {
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: "Payment Successful!",
      description: "Your payment has been received. Finalizing your booking...",
    });
    onPaymentSuccess();
  };

  const handleClose = () => {
    toast({
      variant: "default",
      title: "Payment Cancelled",
      description: "You have cancelled the payment process.",
    });
    onClose();
  };

  const paystackConfig: PaystackProps = {
    reference: new Date().getTime().toString(),
    email: bookingData.email,
    amount: bookingData.totalFare * 100, // Amount in kobo
    currency: 'NGN',
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-6 pb-4 text-center items-center">
          <CreditCard className="h-10 w-10 text-primary mb-2" />
          <DialogTitle className="text-2xl font-headline">Confirm Your Payment</DialogTitle>
          <DialogDescription>
            You are about to make a payment to secure your booking. Please review the details below.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 space-y-4">
            <div className="flex justify-between items-baseline p-4 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Total Fare:</span>
                <span className="font-bold text-2xl text-primary">₦{bookingData.totalFare.toLocaleString()}</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Route:</strong> {bookingData.pickup} to {bookingData.destination}</p>
                <p><strong>Vehicle:</strong> {bookingData.vehicleType}</p>
            </div>
        </div>

        <DialogFooter className="p-6 mt-4 border-t bg-muted/30">
          <div className="w-full flex justify-between gap-4">
            <Button type="button" variant="outline" onClick={onClose} className="w-full">
                Cancel
            </Button>
            <PaystackButton
              {...paystackConfig}
              text="Pay Now"
              className={Button({ className: "w-full" })}
              onSuccess={handleSuccess}
              onClose={handleClose}
            />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
