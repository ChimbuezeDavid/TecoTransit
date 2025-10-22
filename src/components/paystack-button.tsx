
'use client';

import { usePaystackPayment } from 'react-paystack';
import { Button } from '@/components/ui/button';
import type { BookingFormData } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import type { PaystackProps } from 'react-paystack/dist/types';

interface PaystackButtonProps {
  bookingData: BookingFormData;
  onSuccess: () => void;
  onClose: () => void;
}

const PaystackButton: React.FC<PaystackButtonProps> = ({ bookingData, onSuccess, onClose }) => {
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
    onSuccess: (transaction) => {
        // The library's onSuccess type is just (transaction: any).
        // We call our own onSuccess which will handle the booking creation logic.
        onSuccess();
    },
    onClose: onClose,
  };

  const initializePayment = usePaystackPayment(config);

  return (
    <Button
      type="button"
      className="w-full"
      size="lg"
      onClick={() => initializePayment()}
      disabled={!bookingData.email || !bookingData.totalFare || !paystackPublicKey}
    >
        Submit & Pay
    </Button>
  );
};

export default PaystackButton;

    