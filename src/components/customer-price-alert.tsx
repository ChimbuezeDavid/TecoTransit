
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { PriceAlert } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

const SESSION_STORAGE_KEY = 'teco_alert_viewed';

export default function CustomerPriceAlert() {
  const [alert, setAlert] = useState<PriceAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'alerts', 'current'), (doc) => {
      if (doc.exists()) {
        const alertData = doc.data() as PriceAlert;
        setAlert(alertData);
        // If it's a dialog, check if it's already been viewed this session
        if (alertData.display && alertData.alertType === 'dialog' && alertData.dialogImageUrl) {
          const alreadyViewed = sessionStorage.getItem(`${SESSION_STORAGE_KEY}_${alertData.updatedAt}`);
          if (!alreadyViewed) {
            setIsOverlayVisible(true);
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

  const handleCloseOverlay = () => {
    setIsOverlayVisible(false);
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

  // Render the image overlay
  if (alert.alertType === 'dialog' && alert.dialogImageUrl && isOverlayVisible) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        onClick={handleCloseOverlay}
      >
        <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
          <Image 
            src={alert.dialogImageUrl} 
            alt="Site Announcement" 
            width={1200} // Set a large base width
            height={1200} // Set a large base height
            style={{ 
              width: 'auto', 
              height: 'auto', 
              maxWidth: '90vw', 
              maxHeight: '90vh',
              objectFit: 'contain' 
            }}
            className="rounded-lg shadow-2xl"
          />
        </div>
      </div>
    );
  }

  return null; // Fallback
}
