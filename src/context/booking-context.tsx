
"use client";

import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, Timestamp, onSnapshot, orderBy, writeBatch } from 'firebase/firestore';
import type { Booking, BookingFormData, PriceRule } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sendBookingStatusEmail } from '@/app/actions/send-email';
import { useAuth } from './auth-context';

interface BookingContextType {
  bookings: Booking[]; 
  prices: PriceRule[];
  loading: boolean;
  error: string | null;
  fetchBookings: (status: Booking['status'] | 'All') => () => void;
  createBooking: (data: Omit<BookingFormData, 'privacyPolicy'> & { totalFare: number }) => Promise<Booking>;
  updateBookingStatus: (bookingId: string, status: 'Cancelled') => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  deleteBookingsInRange: (startDate: Date, endDate: Date) => Promise<number>;
  clearBookings: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
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
    // Only fetch prices if a user is logged in (admin)
    if (user) {
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
    } else {
        // If no user, clear the prices and stop loading
        setPrices([]);
        setLoading(false);
    }
  }, [user]); // Re-run this effect when the user's auth state changes

  const fetchBookings = useCallback((status: Booking['status'] | 'All' = 'All') => {
    setLoading(true);
    setError(null);
    
    const bookingsCollection = collection(db, "bookings");
    const queryConstraints = [];

    if (status !== 'All') {
        queryConstraints.push(where("status", "==", status));
    }
    queryConstraints.push(orderBy("createdAt", "desc"));
    
    const bookingsQuery = query(bookingsCollection, ...queryConstraints);

    const unsubscribe = onSnapshot(bookingsQuery, (querySnapshot) => {
      const bookingsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const createdAtMillis = data.createdAt instanceof Timestamp 
            ? data.createdAt.toMillis()
            : (typeof data.createdAt === 'number' ? data.createdAt : Date.now());

        return {
          id: doc.id,
          ...data,
          createdAt: createdAtMillis,
        } as Booking;
      });
      setBookings(bookingsData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'fetching dashboard bookings');
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const createBooking = useCallback(async (data: Omit<BookingFormData, 'privacyPolicy'> & { totalFare: number }) => {
    const firestoreBooking = {
      ...data,
      createdAt: Timestamp.now(),
      status: 'Pending' as const,
      intendedDate: format(data.intendedDate, 'yyyy-MM-dd'),
    };
    
    const docRef = await addDoc(collection(db, 'bookings'), firestoreBooking);

    return {
      ...firestoreBooking,
      id: docRef.id,
      createdAt: firestoreBooking.createdAt.toMillis(),
    } as Booking;
    
  }, []);

  const updateBookingStatus = useCallback(async (bookingId: string, status: 'Cancelled') => {
      const bookingDocRef = doc(db, 'bookings', bookingId);
      const allBookingsSnapshot = await getDocs(query(collection(db, 'bookings')));
      const bookingToUpdate = allBookingsSnapshot.docs.map(d => ({id: d.id, ...d.data()})).find(b => b.id === bookingId) as Booking | undefined;

      if (!bookingToUpdate) {
        throw new Error("Booking not found");
      }
      
      const updateData: any = { status };
      
      await updateDoc(bookingDocRef, updateData);

      sendBookingStatusEmail({
          name: bookingToUpdate.name,
          email: bookingToUpdate.email,
          status: status,
          bookingId: bookingToUpdate.id,
          pickup: bookingToUpdate.pickup,
          destination: bookingToUpdate.destination,
          vehicleType: bookingToUpdate.vehicleType,
          totalFare: bookingToUpdate.totalFare,
      }).catch(emailError => {
        console.error("Failed to send status update email:", emailError);
        toast({
          variant: "destructive",
          title: "Email Failed to Send",
          description: "The booking status was updated, but the email notification could not be sent. Please notify the customer manually.",
          duration: 10000,
        });
      });
      
  }, [toast]);

  const deleteBooking = useCallback(async (id: string) => {
      const bookingDocRef = doc(db, 'bookings', id);
      await deleteDoc(bookingDocRef);
  }, []);

  const deleteBookingsInRange = useCallback(async (startDate: Date, endDate: Date) => {
    const startTimestamp = Timestamp.fromDate(startDate);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    const endTimestamp = Timestamp.fromDate(endOfDay);
    
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('createdAt', '>=', startTimestamp),
      where('createdAt', '<=', endTimestamp)
    );
    
    const snapshot = await getDocs(bookingsQuery);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  }, []);
  
  const clearBookings = useCallback(() => {
    setBookings([]);
    setLoading(true);
  }, []);

  const value = {
    bookings,
    prices,
    loading,
    error,
    fetchBookings,
    createBooking,
    updateBookingStatus,
    deleteBooking,
    deleteBookingsInRange,
    clearBookings,
  };

  return (
    <BookingContext.Provider value={value as any}>
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
