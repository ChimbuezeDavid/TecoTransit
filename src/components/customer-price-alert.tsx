
"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { PriceAlert } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CustomerPriceAlert() {
  const [alert, setAlert] = useState<PriceAlert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'alerts', 'current'), (doc) => {
      if (doc.exists()) {
        setAlert(doc.data() as PriceAlert);
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

  if (loading) {
    return (
        <div className="mb-12">
            <div className="h-24 w-full bg-muted rounded-lg animate-pulse" />
        </div>
    );
  }

  if (!alert || !alert.content || !alert.display) {
    return null; // Don't render if no alert, no content, or display is off
  }

  return (
    <div className="max-w-3xl mx-auto mb-12">
      <Alert>
        <Megaphone className="h-4 w-4" />
        <AlertTitle>An Important Update from TecoTransit!</AlertTitle>
        <AlertDescription className={cn(
          "prose prose-sm max-w-none text-muted-foreground",
           alert.font,
           alert.fontSize,
           alert.bold && "font-bold",
           alert.italic && "italic",
        )}>
           {alert.content}
        </AlertDescription>
      </Alert>
    </div>
  );
}
