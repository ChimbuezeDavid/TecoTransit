
"use client";

import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, updateDoc, getDocs, query, where, Timestamp, onSnapshot, orderBy, writeBatch, deleteDoc } from 'firebase/firestore';
import type { Booking, BookingFormData, PriceRule } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { sendBookingStatusEmail } from '@/app/actions/send-email';
import { useAuth } from './auth-context';
import { createPendingBooking } from '@/app/actions/create-booking-and-assign-trip';
import { cleanupTrips } from '@/app/actions/cleanup-trips';


interface BookingContextType {
  prices: PriceRule[];
  loading: boolean;
  error: string | null;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [prices, setPrices] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFirestoreError = (err: any, context: string) => {
    console.error(`Error ${context}:`, err);
    // Only show permission errors if a user is logged in, to avoid noise on public pages after logout
    if (user && err.code === 'permission-denied') {
        const message = `Permission denied. Please ensure your Firestore security rules are deployed correctly.`;
        setError(message);
        toast({ variant: 'destructive', title: `Error ${context}`, description: message, duration: 10000 });
    } else if (err.code !== 'permission-denied') {
        const message = `Could not perform operation. ${err.message || ''}`;
        setError(message);
        toast({ variant: 'destructive', title: `Error ${context}`, description: message, duration: 10000 });
    }
  };
  
  useEffect(() => {
    // Pricing rules are public data needed for the booking form, so we fetch them regardless of auth state.
    setLoading(true);
    const pricesQuery = query(collection(db, "prices"));
    const unsubscribePrices = onSnapshot(pricesQuery, (querySnapshot) => {
        const pricesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PriceRule));
        setPrices(pricesData);
        setLoading(false);
    }, (err) => {
        handleFirestoreError(err, 'fetching prices');
        setLoading(false);
    });

    return () => unsubscribePrices();
  }, [user, toast]);
  

  const value = {
    prices,
    loading,
    error,
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

    