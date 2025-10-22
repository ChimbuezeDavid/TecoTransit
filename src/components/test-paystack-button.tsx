
"use client";

import { usePaystackPayment } from 'react-paystack';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CreditCard } from 'lucide-react';

const TestPaystackButton = () => {
  const { toast } = useToast();

  // Hardcoded configuration for testing
  const config = {
    reference: `test_${new Date().getTime()}`,
    email: "test@example.com",
    amount: 10000, // Paystack amount is in kobo, so this is 100 NGN
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
    currency: 'NGN',
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = (reference: any) => {
    console.log('Test Payment Success:', reference);
    toast({
      title: "Test Payment Successful!",
      description: `Reference: ${reference.reference}`,
    });
  };

  const onClose = () => {
    console.log('Test payment dialog closed.');
    toast({
      variant: 'destructive',
      title: "Payment Closed",
      description: "The payment dialog was closed.",
    });
  };

  const handleTestPayment = () => {
    if (!config.publicKey) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Paystack public key is not set. Please check your environment variables.",
      });
      return;
    }
    initializePayment({onSuccess, onClose});
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleTestPayment(); }}>
        <Button type="submit" className="w-full" size="lg">
            <CreditCard className="mr-2 h-5 w-5" />
            <span>Pay ₦100 (Test)</span>
        </Button>
    </form>
  );
};

export default TestPaystackButton;
