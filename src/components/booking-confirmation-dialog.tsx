
"use client";

import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home } from 'lucide-react';

interface BookingConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingConfirmationDialog({ isOpen, onClose }: BookingConfirmationDialogProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 sm:max-h-full max-h-[65vh]">
        <DialogHeader className="text-center items-center pt-8 px-6 pb-6">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <DialogTitle className="mt-4 text-2xl font-headline">Booking Submitted!</DialogTitle>
          <DialogDescription>
            Your request has been successfully submitted. It is currently pending review by our team. You will be notified once it's confirmed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row justify-center p-6 border-t bg-muted/30">
             <Button asChild onClick={onClose} className="w-full sm:w-auto"><Link href="/"><Home className="mr-2 h-4 w-4" />Go to Homepage</Link></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
