
"use client";

import { useState } from 'react';
import type { BookingFormData } from '@/lib/types';
import { useBooking } from '@/context/booking-context';
import { useToast } from '@/hooks/use-toast';
import { uploadReceipt } from '@/app/actions/upload-receipt';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, Upload, Banknote } from 'lucide-react';
import BookingConfirmationDialog from './booking-confirmation-dialog';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingFormData;
  onBookingComplete: () => void;
}

// TODO: Replace with your actual account details
const accountDetails = {
    bankName: "WEMA BANK",
    accountName: "TECOTRANSIT",
    accountNumber: "8200686369",
};

export default function PaymentDialog({ isOpen, onClose, bookingData, onBookingComplete }: PaymentDialogProps) {
  const { toast } = useToast();
  const { createBooking } = useBooking();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

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

  const handleSubmit = async () => {
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
      // 1. Upload the receipt file using the server action
      const blob = await uploadReceipt(receiptFile);
      const receiptUrl = blob.url;

      // 2. Call createBooking with the booking data and the returned URL
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = receiptFile !== null && hasPaid;

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
              Transfer the total fare to the account below and upload your receipt to finalize your booking.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 space-y-4">
             <Alert>
                <AlertTitle className="font-bold">Bank Transfer Details</AlertTitle>
                <AlertDescription>
                    <div className="space-y-2 pt-2">
                        <p><strong>Bank:</strong> {accountDetails.bankName}</p>
                        <p><strong>Account Name:</strong> {accountDetails.accountName}</p>
                        <p><strong>Account Number:</strong> {accountDetails.accountNumber}</p>
                        <p className="pt-2"><strong>Amount:</strong> <span className="font-bold text-primary text-lg">₦{bookingData.totalFare.toLocaleString()}</span></p>
                    </div>
                </AlertDescription>
            </Alert>
            
            <Separator />
            
            <div className="space-y-4">
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
                        I have made the payment to the account above.
                    </Label>
                </div>
            </div>
          </div>
          
          <DialogFooter className="p-6 bg-muted/50 mt-6">
            <Button
              type="button"
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Submitting...' : 'Submit for Confirmation'}
            </Button>
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
