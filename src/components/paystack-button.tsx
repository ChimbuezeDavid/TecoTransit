
'use client';

import { usePaystackPayment } from 'react-paystack';
import { Button } from '@/components/ui/button';
import type { BookingFormData } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { type UseFormReturn } from 'react-hook-form';
import { ArrowRight, Loader2 } from 'lucide-react';
import type { PaystackProps } from 'react-paystack/dist/types';

interface PaystackButtonProps {
    form: UseFormReturn<BookingFormData>;
    totalFare: number;
    baseFare: number;
    onSuccess: () => void;
    onClose: () => void;
    isProcessing: boolean;
}

const PaystackButton: React.FC<PaystackButtonProps> = ({ form, totalFare, baseFare, onSuccess, onClose, isProcessing }) => {
  const { toast } = useToast();
  const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

  const { getValues } = form;
  

  const config: PaystackProps = {
    publicKey: paystackPublicKey,
    email: getValues("email"),
    amount: Math.round(totalFare * 100), // Amount in kobo
    reference: `tec_${uuidv4().split('-').join('')}`,
    metadata: {
      name: getValues("name"),
      phone: getValues("phone"),
      custom_fields: [
        {
          display_name: 'Route',
          variable_name: 'route',
          value: `${getValues("pickup")} to ${getValues("destination")}`,
        },
      ],
    },
  };

  const initializePayment = usePaystackPayment(config);

  const handlePayment = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        variant: 'destructive',
        title: 'Invalid Form',
        description: 'Please fill all required fields correctly before proceeding.',
      });
      return;
    }
    
    if (baseFare <= 0) {
      toast({
        variant: 'destructive',
        title: 'Route Unavailable',
        description: 'This route is currently not available for booking. Please select another.',
      });
      return;
    }
    
    if (typeof onSuccess === 'function' && typeof onClose === 'function') {
        initializePayment({
            onSuccess,
            onClose,
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
     <Button type="button" size="lg" className="w-full sm:w-auto" onClick={handlePayment} disabled={isProcessing}>
        {isProcessing ? (
        <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
        </>
        ) : (
        <>
            Proceed to Payment
            <ArrowRight className="ml-2 h-5 w-5" />
        </>
        )}
    </Button>
  );
};

export default PaystackButton;
