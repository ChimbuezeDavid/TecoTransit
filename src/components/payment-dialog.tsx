
"use client";

import { useState, useMemo } from 'react';
import type { BookingFormData } from '@/lib/types';
import { useBooking } from '@/context/booking-context';
import { useToast } from '@/hooks/use-toast';
import { uploadReceipt } from '@/app/actions/upload-receipt';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Upload, Banknote } from 'lucide-react';
import BookingConfirmationDialog from './booking-confirmation-dialog';
import { Card, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { bankAccountDetails } from '@/lib/constants';
import PaystackButton from './paystack-button';
import type { PaystackProps } from 'react-paystack/dist/types';
import { v4 as uuidv4 } from 'uuid';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingFormData;
  onBookingComplete: () => void;
}

export default function PaymentDialog({ isOpen, onClose, bookingData, onBookingComplete }: PaymentDialogProps) {
  const { toast } = useToast();
  const { createBooking } = useBooking();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'paystack'>('paystack');

  const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

  const paystackConfig: Omit<PaystackProps, 'onSuccess' | 'onClose'> = useMemo(() => ({
    publicKey: paystackPublicKey,
    email: bookingData.email,
    amount: Math.round(bookingData.totalFare * 100), // Amount in kobo
    reference: `tec_${uuidv4().split('-').join('')}`,
    metadata: {
      name: bookingData.name,
      phone: bookingData.phone,
      custom_fields: [
        {
          display_name: "Route",
          variable_name: "route",
          value: `${bookingData.pickup} to ${bookingData.destination}`
        }
      ]
    }
  }), [bookingData]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please upload a receipt image smaller than 5MB.",
        });
        setReceiptFile(null);
        event.target.value = ''; // Clear the input
      } else {
        setReceiptFile(file);
      }
    }
  };

  const completeBooking = async (receiptUrl: string | null) => {
    try {
      await createBooking(bookingData, receiptUrl);
      
      toast({
        title: "Booking Submitted for Review!",
        description: "Your payment is being verified. We'll be in touch shortly.",
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
    }
  }


  const handleTransferSubmit = async () => {
    if (!receiptFile || !hasPaid) {
      toast({
        variant: "destructive",
        title: "Incomplete Submission",
        description: "Please upload a receipt and confirm you have made the payment.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', receiptFile);
      const blob = await uploadReceipt(formData);
      await completeBooking(blob.url);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaystackSuccess = async () => {
    setIsSubmitting(true);
    await completeBooking(null); // No receipt URL for Paystack
    setIsSubmitting(false);
  }

  const canSubmitTransfer = receiptFile !== null && hasPaid;

  return (
    <div>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md p-0 flex flex-col h-full max-h-[90vh]">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-2xl font-headline flex items-center gap-2">
              <Banknote className="h-6 w-6 text-primary" />
              Complete Your Booking
            </DialogTitle>
            <DialogDescription>
              Pay a total of <span className="font-bold text-foreground">₦{bookingData.totalFare.toLocaleString()}</span> to finalize your booking.
            </DialogDescription>
          </DialogHeader>

            <div className="grid grid-cols-2 gap-2 px-6">
                 <Button variant={paymentMethod === 'paystack' ? 'default' : 'outline'} onClick={() => setPaymentMethod('paystack')}>Pay with Card</Button>
                 <Button variant={paymentMethod === 'transfer' ? 'default' : 'outline'} onClick={() => setPaymentMethod('transfer')}>Pay with Transfer</Button>
            </div>

          <ScrollArea className="flex-grow">
            <div className="px-6 py-4 space-y-6">

             {paymentMethod === 'transfer' && (
                <>
                {/* Step 1: Make Payment */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 bg-primary text-primary-foreground h-8 w-8 rounded-full flex items-center justify-center font-bold">1</div>
                        <h3 className="text-lg font-semibold">Make Payment</h3>
                    </div>
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <p className="text-sm text-center">Transfer the total fare to the account below.</p>
                            <div className="text-sm space-y-2 pt-2">
                                <div className="flex justify-between"><span className="text-muted-foreground">Bank:</span> <span className="font-medium">{bankAccountDetails.bankName}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Account Name:</span> <span className="font-medium">{bankAccountDetails.accountName}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Account Number:</span> <span className="font-medium">{bankAccountDetails.accountNumber}</span></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Separator />
                
                {/* Step 2: Upload & Confirm */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 bg-primary text-primary-foreground h-8 w-8 rounded-full flex items-center justify-center font-bold">2</div>
                        <h3 className="text-lg font-semibold">Upload & Confirm</h3>
                    </div>
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="receipt">Upload Payment Receipt</Label>
                        <div className="flex items-center gap-2">
                            <Input id="receipt" type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleFileChange} />
                            <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {receiptFile && <p className="text-xs text-muted-foreground pt-1">File selected: {receiptFile.name}</p>}
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox id="hasPaid" checked={hasPaid} onCheckedChange={(checked) => setHasPaid(checked as boolean)} />
                        <Label htmlFor="hasPaid" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            I confirm I have transferred the correct amount.
                        </Label>
                    </div>
                </div>
                </>
             )}
             {paymentMethod === 'paystack' && (
                <div className="py-8 text-center space-y-4">
                  <h3 className="text-lg font-semibold">Pay with Paystack</h3>
                  <p className="text-sm text-muted-foreground">Click the button below to pay securely with your card, USSD, or bank account via Paystack.</p>
                </div>
             )}
            </div>
          </ScrollArea>
          
          <DialogFooter className="p-6 bg-muted/50 mt-auto border-t">
            {paymentMethod === 'transfer' ? (
                 <Button
                    type="button"
                    className="w-full"
                    size="lg"
                    onClick={handleTransferSubmit}
                    disabled={!canSubmitTransfer || isSubmitting}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit for Confirmation'}
                </Button>
            ) : (
                <PaystackButton
                    config={paystackConfig}
                    onSuccess={handlePaystackSuccess}
                    onClose={() => {
                        if(!isSubmitting) { // Only show toast if user closed it manually
                             toast({ variant: 'destructive', title: 'Payment cancelled', description: 'You have cancelled the payment process.'});
                        }
                    }}
                    isSubmitting={isSubmitting}
                />
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BookingConfirmationDialog
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
      />
    </div>
  );
}
