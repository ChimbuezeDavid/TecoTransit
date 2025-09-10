
"use client";

import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, Timestamp, onSnapshot, orderBy, writeBatch, getDoc, setDoc } from 'firebase/firestore';
import type { Booking, BookingFormData, PriceRule } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { sendBookingStatusUpdateEmail } from '@/app/actions/email';


interface BookingContextType {
  bookings: Booking[];
  prices: PriceRule[];
  loading: boolean;
  error: string | null;
  fetchBookings: (status: Booking['status'] | 'All') => void;
  createBooking: (data: BookingFormData) => Promise<Booking>;
  updateBookingStatus: (bookingId: string, status: 'Confirmed' | 'Cancelled', confirmedDate?: string) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: React.ReactNode }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [prices, setPrices] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFirestoreError = (err: any, context: string) => {
    console.error(`Error ${context}:`, err);
    const message = err.code === 'permission-denied'
      ? `Permission denied. Please ensure your Firestore security rules are deployed correctly. See helpme.txt.`
      : `Could not perform operation. ${err.message || ''}`;
    setError(message);
    toast({ variant: 'destructive', title: `Error ${context}`, description: message, duration: 10000 });
  };

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const pricesCollection = collection(db, "prices");
      const pricesSnapshot = await getDocs(pricesCollection);
      const pricesData = pricesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PriceRule));
      setPrices(pricesData);
    } catch (err) {
      handleFirestoreError(err, 'fetching prices');
    } finally {
        setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const fetchBookings = useCallback((status: Booking['status'] | 'All' = 'All') => {
    setLoading(true);
    setError(null);
    
    let bookingsQuery = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    if (status !== 'All') {
        bookingsQuery = query(bookingsQuery, where("status", "==", status));
    }

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
      handleFirestoreError(err, 'fetching bookings');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const createBooking = useCallback(async (data: BookingFormData) => {
    const bookingId = uuidv4();
    const bookingDocRef = doc(db, 'bookings', bookingId);
   
    const firestoreBooking = {
      ...data,
      id: bookingId,
      createdAt: Timestamp.now(),
      status: 'Pending' as const,
      intendedDate: format(data.intendedDate, 'yyyy-MM-dd'),
      alternativeDate: format(data.alternativeDate, 'yyyy-MM-dd'),
    };
    
    await setDoc(bookingDocRef, firestoreBooking);

    return {
      ...firestoreBooking,
      createdAt: firestoreBooking.createdAt.toMillis(),
    } as Booking;
    
  }, []);

  const updateBookingStatus = useCallback(async (bookingId: string, status: 'Confirmed' | 'Cancelled', confirmedDate?: string) => {
      const bookingDocRef = doc(db, 'bookings', bookingId);
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) {
        throw new Error("Booking not found");
      }
      
      const updateData: any = { status };
      if (status === 'Confirmed' && confirmedDate) {
        updateData.confirmedDate = confirmedDate;
      }
      
      await updateDoc(bookingDocRef, updateData);

      // After successful DB update, send email
      try {
        await sendBookingStatusUpdateEmail({
            name: booking.name,
            email: booking.email,
            status: status,
            bookingId: booking.id,
            pickup: booking.pickup,
            destination: booking.destination,
            vehicleType: booking.vehicleType,
            intendedDate: booking.intendedDate,
            alternativeDate: booking.alternativeDate,
            totalFare: booking.totalFare,
            confirmedDate: confirmedDate
        });
      } catch (emailError) {
         console.error("Failed to send status update email:", emailError);
         toast({
            variant: "destructive",
            title: "Email Failed to Send",
            description: "The booking status was updated, but the notification email could not be sent. Please check the server logs.",
            duration: 8000,
        });
      }
      
  }, [toast, bookings]);

  const deleteBooking = useCallback(async (id: string) => {
      const bookingDocRef = doc(db, 'bookings', id);
      await deleteDoc(bookingDocRef);
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

    