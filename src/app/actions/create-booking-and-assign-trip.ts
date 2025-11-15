
'use server';

import type { Booking, BookingFormData } from '@/lib/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { assignBookingToTrip } from './paystack';
import { format } from 'date-fns';

type CreateBookingResult = {
    success: boolean;
    booking?: Booking;
    error?: string;
}

export const createPendingBooking = async (data: Omit<BookingFormData, 'privacyPolicy'> & { totalFare: number }): Promise<CreateBookingResult> => {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        return { success: false, error: "Could not connect to the database." };
    }
    
    const newBookingRef = db.collection('bookings').doc();
    const bookingId = newBookingRef.id;

    // This is now a more complete Booking object from the start
    const firestoreBooking = {
        ...data,
        id: bookingId,
        createdAt: FieldValue.serverTimestamp(),
        status: 'Pending' as const,
        intendedDate: format(data.intendedDate, 'yyyy-MM-dd'),
    };
    
    try {
        // Step 1: Create the 'Pending' booking document first.
        await newBookingRef.set(firestoreBooking);

        // Step 2: Now, attempt to assign this new booking to a trip.
        // This function is now the single source of truth for assignment logic.
        await assignBookingToTrip(firestoreBooking);

        // Retrieve the final booking data after assignment
        const createdBookingDoc = await newBookingRef.get();
        const createdBookingData = createdBookingDoc.data();
        
        if (!createdBookingData) {
            return { success: false, error: 'Failed to retrieve created booking.' };
        }

        // Convert Firestore Timestamp to millis for client-side compatibility
        const finalBooking = {
            ...createdBookingData,
            createdAt: (createdBookingData.createdAt as FirebaseFirestore.Timestamp).toMillis(),
        } as Booking;

        return { 
            success: true, 
            booking: finalBooking
        };

    } catch (error: any) {
        console.error("Error in createPendingBooking:", error);
        // The booking will still exist as 'Pending' and an overflow email will have been sent
        // by `assignBookingToTrip` if that was the cause of the failure.
        return { success: false, error: error.message || 'An unknown error occurred while creating booking.' };
    }
};
