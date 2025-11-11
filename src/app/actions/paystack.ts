

'use server';

import Paystack from 'paystack';
import type { BookingFormData, PriceRule } from '@/lib/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue }from 'firebase-admin/firestore';
import { vehicleOptions } from '@/lib/constants';
import { sendBookingStatusEmail } from './send-email';
import { getAvailableSeats } from './get-availability';
import { format } from 'date-fns';


if (!process.env.PAYSTACK_SECRET_KEY) {
  throw new Error('PAYSTACK_SECRET_KEY is not set in environment variables.');
}

const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

interface InitializeTransactionArgs {
  email: string;
  amount: number; // in kobo
  metadata: Record<string, any>;
}

export const initializeTransaction = async ({ email, amount, metadata }: InitializeTransactionArgs) => {
  try {
    const { priceRuleId } = metadata;
    const bookingDetails = JSON.parse(metadata.booking_details);
    const date = bookingDetails.intendedDate;

    // Last-minute availability check
    const availableSeats = await getAvailableSeats(priceRuleId, date);
    if (availableSeats <= 0) {
        return { status: false, message: 'Sorry, all seats for this trip have just been booked. Please try another date or route.' };
    }
    
    // Create a temporary reservation
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
      throw new Error("Could not connect to the database.");
    }
    const reservationRef = db.collection('reservations').doc();
    await reservationRef.set({
        priceRuleId,
        date,
        createdAt: FieldValue.serverTimestamp(),
    });
    
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_BASE_URL;
      
    const callbackUrl = `${baseUrl}/payment/callback`;

    const response = await paystack.transaction.initialize({
      email,
      amount: Math.round(amount),
      metadata: { ...metadata, reservationId: reservationRef.id },
      callback_url: callbackUrl
    });
    return { status: true, data: response.data };
  } catch (error: any) {
    console.error('Paystack initialization error:', error.message);
    return { status: false, message: error.message };
  }
};


export const verifyTransactionAndCreateBooking = async (reference: string) => {
    try {
        const db = getFirebaseAdmin()?.firestore();
        if (!db) {
            throw new Error("Could not connect to the database.");
        }

        const verificationResponse = await paystack.transaction.verify(reference);
        const metadata = verificationResponse.data?.metadata;
        const reservationId = metadata?.reservationId;

        // Clean up reservation regardless of payment status
        if (reservationId) {
            const reservationRef = db.collection('reservations').doc(reservationId);
            // We can delete this without waiting for it to finish
            reservationRef.delete().catch(e => console.error("Failed to delete reservation:", e));
        }

        if (verificationResponse.data?.status !== 'success') {
            throw new Error('Payment was not successful.');
        }

        if (!metadata || !metadata.booking_details) {
            throw new Error('Booking metadata is missing from transaction.');
        }
        
        const bookingDetails: Omit<BookingFormData, 'intendedDate' | 'privacyPolicy'> & { intendedDate: string, totalFare: number } = JSON.parse(metadata.booking_details);
        
        // Final availability check before creating the booking
        const priceRuleId = `${bookingDetails.pickup}_${bookingDetails.destination}_${bookingDetails.vehicleType}`.toLowerCase().replace(/\s+/g, '-');
        const availableSeats = await getAvailableSeats(priceRuleId, bookingDetails.intendedDate);
        if (availableSeats <= 0) {
            // This is the edge case where the seat was taken between our first check and now.
            // We must refund the user. For now, we will log an error and prevent booking.
            console.error(`CRITICAL: Overbooking prevented for ${priceRuleId} on ${bookingDetails.intendedDate}. User ${bookingDetails.email} paid but no seats were available. MANUAL REFUND REQUIRED.`);
            throw new Error("Unfortunately, the last available seat was booked while you were completing your payment. Your booking could not be completed. Please contact support for a refund.");
        }


        const bookingsRef = db.collection('bookings');
        
        const newBookingRef = bookingsRef.doc();
        const newBookingData = {
            ...bookingDetails,
            createdAt: FieldValue.serverTimestamp(),
            status: 'Paid' as const,
            paymentReference: reference,
            totalFare: bookingDetails.totalFare,
        };

        await newBookingRef.set(newBookingData);
        const bookingId = newBookingRef.id;

        await checkAndConfirmTrip(
            db,
            bookingDetails.pickup,
            bookingDetails.destination,
            bookingDetails.vehicleType,
            bookingDetails.intendedDate
        );

        return { success: true, bookingId: bookingId };

    } catch (error: any) {
        console.error('Verification and booking creation failed:', error);
        return { success: false, error: error.message };
    }
};


async function checkAndConfirmTrip(
    db: FirebaseFirestore.Firestore,
    pickup: string,
    destination: string,
    vehicleType: string,
    date: string
) {
    const bookingsQuery = db.collection('bookings')
        .where('pickup', '==', pickup)
        .where('destination', '==', destination)
        .where('vehicleType', '==', vehicleType)
        .where('intendedDate', '==', date)
        .where('status', '==', 'Paid');

    const pricingQuery = db.collection('prices')
        .where('pickup', '==', pickup)
        .where('destination', '==', destination)
        .where('vehicleType', '==', vehicleType);

    const [bookingsSnapshot, pricingSnapshot] = await Promise.all([
        bookingsQuery.get(),
        pricingQuery.get()
    ]);
    
    if (pricingSnapshot.empty) {
        console.log(`No price/fleet rule found for trip: ${pickup}-${destination} on ${date}`);
        return;
    }

    const priceRule = pricingSnapshot.docs[0].data();
    const capacity = priceRule.seatsAvailable || 0;
    
    if (capacity === 0) return;

    const paidBookings = bookingsSnapshot.docs;
    
    // This logic assumes we fill one vehicle at a time based on capacity
    if (paidBookings.length >= capacity) {
        const bookingsToConfirm = paidBookings.slice(0, capacity);
        
        const batch = db.batch();
        bookingsToConfirm.forEach(doc => {
            // Only update if not already confirmed
            if (doc.data().status !== 'Confirmed') {
                batch.update(doc.ref, { status: 'Confirmed', confirmedDate: date });
            }
        });
        
        await batch.commit();

        for (const doc of bookingsToConfirm) {
            const bookingData = doc.data();
            // Only send email if status was changed
            if (bookingData.status !== 'Confirmed') {
                try {
                    await sendBookingStatusEmail({
                        name: bookingData.name,
                        email: bookingData.email,
                        status: 'Confirmed',
                        bookingId: doc.id,
                        pickup: bookingData.pickup,
                        destination: bookingData.destination,
                        vehicleType: bookingData.vehicleType,
                        totalFare: bookingData.totalFare,
                        confirmedDate: date,
                    });
                } catch (e) {
                    console.error(`Failed to send confirmation email for booking ${doc.id}:`, e);
                }
            }
        }
    }
}

    
