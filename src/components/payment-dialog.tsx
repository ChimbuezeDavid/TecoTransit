
"use client";

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { BookingFormData } from '@/lib/types';
import { Loader2, CreditCard, ArrowRight } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { useToast } from '@/hooks/use-toast';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingFormData | null;
  onSuccess: (data: BookingFormData, reference: string) => void;
  isProcessing: boolean;
}

const PaymentDialog: React.FC<PaymentDialogProps> = ({ isOpen, onClose, bookingData, onSuccess, isProcessing }) => {
  const { toast } = useToast();

  const paystackConfig = {
    reference: `tec_${Date.now()}`,
    email: bookingData?.email || '',
    amount: Math.round((bookingData?.totalFare || 0) * 100),
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
    metadata: {
        name: bookingData?.name,
        phone: bookingData?.phone,
        custom_fields: [
          {
            display_name: 'Route',
            variable_name: 'route',
            value: `${bookingData?.pickup} to ${bookingData?.destination}`,
          },
        ],
      },
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  const handlePaystackSuccess = (reference: { reference: string }) => {
    if (bookingData) {
      onSuccess(bookingData, reference.reference);
    }
  };

  const handlePaystackClose = () => {
    if (!isProcessing) {
        toast({
            variant: 'destructive',
            title: 'Payment Cancelled',
            description: 'You have cancelled the payment process.',
        });
        onClose();
    }
  };
  
  const handlePayment = () => {
    if (!bookingData) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Booking data is missing.',
      });
      return;
    }
    
    if (!paystackConfig.publicKey) {
        toast({
            variant: 'destructive',
            title: 'Configuration Error',
            description: 'Paystack public key is not configured.',
        });
        return;
    }

    if (paystackConfig.amount <= 0) {
        toast({
            variant: 'destructive',
            title: 'Invalid Amount',
            description: 'Payment amount must be greater than zero.',
        });
        return;
    }

    initializePayment({
        onSuccess: handlePaystackSuccess,
        onClose: handlePaystackClose
    });
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0">
        <form onSubmit={(e) => { e.preventDefault(); handlePayment(); }}>
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
            <Button type="submit" size="lg" className="w-full" disabled={isProcessing}>
                {isProcessing ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Finalizing...
                    </>
                ) : (
                    <>
                        Pay with Paystack
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                )}
            </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;

    