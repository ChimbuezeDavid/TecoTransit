
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { PriceAlert } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
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
        if (alertData.display && alertData.alertType === 'dialog' && alertData.dialogImageUrl) {
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

  if (!alert || !alert.display) {
    return null;
  }

  // Render the inline alert
  if (alert.alertType === 'alert' && alert.content) {
    const textClass = cn(
        "prose prose-sm max-w-none text-muted-foreground",
        alert.font,
        alert.fontSize,
        alert.bold && "font-bold",
        alert.italic && "italic",
    );
    return (
      <div className="max-w-3xl mx-auto mb-12">
        <Alert>
          <Megaphone className="h-4 w-4" />
          <AlertTitle>An Important Update from TecoTransit!</AlertTitle>
          <AlertDescription className={textClass}>
            {alert.content}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Render the dialog (image only)
  if (alert.alertType === 'dialog' && alert.dialogImageUrl) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
           <div className="relative aspect-video w-full">
             <Image src={alert.dialogImageUrl} alt={'Site Announcement'} fill style={{ objectFit: 'contain' }} />
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
