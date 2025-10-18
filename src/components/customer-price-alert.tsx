
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { PriceAlert } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

const SESSION_STORAGE_KEY = 'teco_alert_viewed';

export default function CustomerPriceAlert() {
  const [alert, setAlert] = useState<PriceAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'alerts', 'current'), (doc) => {
      if (doc.exists()) {
        const alertData = doc.data() as PriceAlert;
        setAlert(alertData);
        // If it's a dialog, check if it's already been viewed this session
        if (alertData.display && alertData.alertType === 'dialog') {
          const alreadyViewed = sessionStorage.getItem(`${SESSION_STORAGE_KEY}_${alertData.updatedAt}`);
          if (!alreadyViewed) {
            setIsDialogOpen(true);
          }
        }
      } else {
        setAlert(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Failed to listen for price alert:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    if (alert) {
      sessionStorage.setItem(`${SESSION_STORAGE_KEY}_${alert.updatedAt}`, 'true');
    }
  };

  if (loading) {
    return (
      <div className="mb-12">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!alert || !alert.content || !alert.display) {
    return null; // Don't render if no alert, no content, or display is off
  }

  const commonTextClass = cn(
    "prose prose-sm max-w-none text-muted-foreground",
    alert.font,
    alert.fontSize,
    alert.bold && "font-bold",
    alert.italic && "italic",
  );

  // Render the inline alert
  if (alert.alertType === 'alert') {
    return (
      <div className="max-w-3xl mx-auto mb-12">
        <Alert>
          <Megaphone className="h-4 w-4" />
          <AlertTitle>An Important Update from TecoTransit!</AlertTitle>
          <AlertDescription className={commonTextClass}>
            {alert.content}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Render the dialog
  if (alert.alertType === 'dialog') {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md p-0">
           <DialogHeader className="p-6 pb-4">
            {alert.dialogTitle && <DialogTitle>{alert.dialogTitle}</DialogTitle>}
            {!alert.dialogTitle && <DialogTitle>An Important Update</DialogTitle>}
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
             {alert.dialogImageUrl && (
               <div className="relative aspect-video w-full rounded-lg overflow-hidden">
                 <Image src={alert.dialogImageUrl} alt={alert.dialogTitle || 'Alert Image'} fill style={{ objectFit: 'cover' }} />
               </div>
             )}
            <p className={commonTextClass}>{alert.content}</p>
          </div>
          <DialogFooter className="p-4 bg-muted/50 border-t">
            <Button onClick={handleCloseDialog}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null; // Fallback
}
