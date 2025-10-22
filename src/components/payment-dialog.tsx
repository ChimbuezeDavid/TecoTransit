
"use client";

import { useState } from 'react';
import type { BookingFormData, PriceRule } from '@/lib/types';
import { useBooking } from '@/context/booking-context';
import { useToast } from '@/hooks/use-toast';
import PaystackButton from './paystack-button';
import BookingConfirmationDialog from './booking-confirmation-dialog';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Banknote, Loader2 } from 'lucide-react';
import { type UseFormReturn } from 'react-hook-form';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingFormData;
  form: UseFormReturn<BookingFormData>;
  prices: PriceRule[];
  onBookingComplete: () => void;
}

export default function PaymentDialog({ isOpen, onClose, bookingData, form, prices, onBookingComplete }: PaymentDialogProps) {
  const { toast } = useToast();
  const { createBooking } = useBooking();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  const completeBooking = async (paystackReference: string | null) => {
    setIsSubmitting(true);
    try {
      await createBooking(bookingData, paystackReference);

      toast({
        title: "Booking Submitted!",
        description: "Your request is now pending review. We'll be in touch shortly.",
      });

      onClose(); // Close the payment dialog
      setIsConfirmationOpen(true); // Open the final confirmation dialog
      onBookingComplete(); // Reset the main booking form

    } catch (error) {
      console.error("Booking submission error:", error);
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: `There was a problem submitting your booking. Please try again. ${error instanceof Error ? error.message : ''}`,
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handlePaystackSuccess = async () => {
    // A null reference is passed because we are not using the receipt URL anymore
    await completeBooking(null);
  };
  
  const handlePaystackClose = () => {
    // Only show toast if user closed the modal manually without completing the transaction
    if (!isSubmitting) {
      toast({
        variant: 'destructive',
        title: 'Payment Cancelled',
        description: 'You have cancelled the payment process.',
      });
    }
  };


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-2xl font-headline flex items-center gap-2">
              <Banknote className="h-6 w-6 text-primary" />
              Complete Your Booking
            </DialogTitle>
            <DialogDescription>
              Pay a total of <span className="font-bold text-foreground">₦{bookingData.totalFare.toLocaleString()}</span> to finalize your booking using our secure payment gateway.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-8 text-center space-y-4">
            <h3 className="text-lg font-semibold">Pay with Paystack</h3>
            <p className="text-sm text-muted-foreground">Click the button below to pay securely with your card, USSD, or bank account via Paystack.</p>
          </div>
          
          <DialogFooter className="p-6 bg-muted/50 mt-auto border-t">
            {isSubmitting ? (
                 <Button disabled className="w-full" size="lg">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                </Button>
            ) : (
                <PaystackButton
                    bookingData={bookingData}
                    onSuccess={handlePaystackSuccess}
                    onClose={handlePaystackClose}
                />
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BookingConfirmationDialog
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
      />
    </>
  );
}
