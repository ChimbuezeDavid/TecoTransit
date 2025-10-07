

"use client";

import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, Timestamp, onSnapshot, orderBy, writeBatch } from 'firebase/firestore';
import type { Booking, BookingFormData, PriceRule } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { sendBookingStatusEmail } from '@/app/actions/send-email';

interface BookingContextType {
  bookings: Booking[];
  prices: PriceRule[];
  loading: boolean;
  error: string | null;
  fetchBookings: (status?: Booking['status'] | 'All') => (() => void) | undefined;
  createBooking: (data: Partial<Booking>, receiptUrl?: string) => Promise<Booking>;
  updateBookingStatus: (bookingId: string, status: 'Confirmed' | 'Cancelled', confirmedDate?: string) => Promise<void>;
  updatePaymentStatus: (bookingId: string, paymentStatus: 'Approved' | 'Rejected') => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  deleteBookingsInRange: (startDate: Date, endDate: Date) => Promise<number>;
  deleteProcessedPayments: () => Promise<number>;
  clearBookings: () => void;
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
  }, []);
  
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

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
          id: doc.id, // Use firestore doc id as primary id
          ...data,
          paymentStatus: data.paymentStatus || 'Pending', // Ensure fallback for old records
          firestoreDocId: doc.id,
          createdAt: createdAtMillis,
        } as Booking;
      });
      setBookings(bookingsData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'fetching bookings');
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const createBooking = useCallback(async (data: Partial<Booking>, paymentReceiptUrl?: string) => {
    const bookingUuid = uuidv4();

    const firestoreBooking: any = {
      ...data,
      id: bookingUuid,
      createdAt: Timestamp.now(),
      status: 'Pending' as const,
      paymentStatus: 'Pending' as const,
    };
    
    if (data.intendedDate && typeof data.intendedDate !== 'string') {
        firestoreBooking.intendedDate = format(data.intendedDate, 'yyyy-MM-dd');
    }
    if (data.alternativeDate && typeof data.alternativeDate !== 'string') {
        firestoreBooking.alternativeDate = format(data.alternativeDate, 'yyyy-MM-dd');
    }
    if (paymentReceiptUrl) {
        firestoreBooking.paymentReceiptUrl = paymentReceiptUrl;
    }
     // For group bookings, ensure luggageCount is the sum from all passengers
    if (data.bookingType === 'group' && data.passengers) {
      firestoreBooking.luggageCount = data.passengers.reduce((acc, p) => acc + p.luggageCount, 0);
    }
    
    const docRef = await addDoc(collection(db, 'bookings'), firestoreBooking);

    return {
      ...firestoreBooking,
      firestoreDocId: docRef.id,
      id: bookingUuid, // Ensure the UUID is what we use going forward
      createdAt: firestoreBooking.createdAt.toMillis(),
    } as Booking;
    
  }, []);

  const updateBookingStatus = useCallback(async (bookingId: string, status: 'Confirmed' | 'Cancelled', confirmedDate?: string) => {
      const bookingToUpdate = bookings.find(b => b.id === bookingId);
      
      if (!bookingToUpdate || !bookingToUpdate.firestoreDocId) {
        throw new Error("Booking not found or is missing Firestore document ID");
      }

      const bookingDocRef = doc(db, 'bookings', bookingToUpdate.firestoreDocId);
      
      const updateData: any = { status };
      if (status === 'Confirmed' && confirmedDate) {
        updateData.confirmedDate = confirmedDate;
      }
      
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
          confirmedDate: confirmedDate,
      }).catch(emailError => {
        console.error("Failed to send status update email:", emailError);
        toast({
          variant: "destructive",
          title: "Email Failed to Send",
          description: "The booking status was updated, but the email notification could not be sent. Please notify the customer manually.",
          duration: 10000,
        });
      });
      
  }, [bookings, toast]);

  const updatePaymentStatus = useCallback(async (bookingId: string, paymentStatus: 'Approved' | 'Rejected') => {
    const bookingToUpdate = bookings.find(b => b.id === bookingId);
    if (!bookingToUpdate || !bookingToUpdate.firestoreDocId) {
        throw new Error("Booking not found or is missing Firestore document ID");
    }
    const bookingDocRef = doc(db, 'bookings', bookingToUpdate.firestoreDocId);
    await updateDoc(bookingDocRef, { paymentStatus });
  }, [bookings]);

  const deleteBooking = useCallback(async (id: string) => {
      const bookingToDelete = bookings.find(b => b.id === id);
      if (!bookingToDelete || !bookingToDelete.firestoreDocId) {
        throw new Error("Booking not found or is missing Firestore document ID");
      }
      const bookingDocRef = doc(db, 'bookings', bookingToDelete.firestoreDocId);
      await deleteDoc(bookingDocRef);
  }, [bookings]);

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
  
  const deleteProcessedPayments = useCallback(async () => {
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('paymentStatus', 'in', ['Approved', 'Rejected'])
    );
    
    const snapshot = await getDocs(bookingsQuery);
    if (snapshot.empty) return 0;
    
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
    updatePaymentStatus,
    deleteBooking,
    deleteBookingsInRange,
    deleteProcessedPayments,
    clearBookings,
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
