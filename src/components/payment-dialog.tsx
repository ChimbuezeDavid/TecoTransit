
"use client";

import { usePaystackPayment } from 'react-paystack';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { BookingFormData } from '@/lib/types';
import { ArrowRight, Loader2, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PaystackProps } from 'react-paystack/dist/types';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingFormData;
  onSuccess: (data: BookingFormData, reference: string | null) => void;
  isProcessing: boolean;
}

const PaymentDialog: React.FC<PaymentDialogProps> = ({ isOpen, onClose, bookingData, onSuccess, isProcessing }) => {
  const { toast } = useToast();
  const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
  
  const config: PaystackProps = {
    publicKey: paystackPublicKey,
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

  const initializePayment = usePaystackPayment(config);

  const handlePaystackSuccess = (reference: any) => {
    onSuccess(bookingData, reference.reference);
  };

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

  const handlePayment = () => {
     if (typeof handlePaystackSuccess === 'function' && typeof handlePaystackClose === 'function') {
        initializePayment({
            onSuccess: handlePaystackSuccess,
            onClose: handlePaystackClose,
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Initialization Error',
            description: 'Could not initialize payment. Callbacks are missing.',
        });
        console.error("Paystack callbacks are not valid functions.");
    }
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
            <Button type="button" size="lg" className="w-full" onClick={handlePayment} disabled={isProcessing}>
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
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;

