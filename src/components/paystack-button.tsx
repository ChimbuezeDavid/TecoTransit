
'use client';

import { usePaystackPayment } from 'react-paystack';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { PaystackProps } from 'react-paystack/dist/types';

interface PaystackButtonProps {
  config: Omit<PaystackProps, 'onSuccess' | 'onClose'>;
  onSuccess: (reference: string) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

const PaystackButton: React.FC<PaystackButtonProps> = ({ config, onSuccess, onClose, isSubmitting }) => {
  const initializePayment = usePaystackPayment(config);

  const handlePayment = () => {
    initializePayment({
      onSuccess: (transaction) => onSuccess(transaction.reference),
      onClose: onClose,
    });
  };

  return (
    <Button
      type="button"
      className="w-full"
      size="lg"
      onClick={handlePayment}
      disabled={isSubmitting || !config.email || !config.amount}
    >
      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isSubmitting ? 'Submitting...' : 'Submit for Confirmation'}
    </Button>
  );
};

export default PaystackButton;
