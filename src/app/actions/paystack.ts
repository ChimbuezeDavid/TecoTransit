
'use server';

import Paystack from 'paystack';
import type { BookingFormData } from '@/lib/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
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
    const response = await paystack.transaction.initialize({
      email,
      amount: Math.round(amount),
      metadata,
      callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/callback`
    });
    return { status: true, data: response.data };
  } catch (error: any) {
    console.error('Paystack initialization error:', error.message);
    return { status: false, message: error.message };
  }
};


export const verifyTransactionAndCreateBooking = async (reference: string) => {
    try {
        const verificationResponse = await paystack.transaction.verify(reference);
        if (verificationResponse.data?.status !== 'success') {
            throw new Error('Payment was not successful.');
        }

        const metadata = verificationResponse.data.metadata;
        if (!metadata || !metadata.booking_details) {
            throw new Error('Booking metadata is missing from transaction.');
        }
        
        // The booking_details metadata comes in as a string, so it needs to be parsed.
        const bookingDetails: Omit<BookingFormData, 'intendedDate' | 'alternativeDate' | 'privacyPolicy'> & { intendedDate: string, alternativeDate: string, totalFare: number } = JSON.parse(metadata.booking_details);


        const db = getFirebaseAdmin().firestore();
        const booking = await db.runTransaction(async (transaction) => {
            const availabilityQuery = db.collection('availability')
                .where('date', '==', bookingDetails.intendedDate)
                .where('pickup', '==', bookingDetails.pickup)
                .where('destination', '==', bookingDetails.destination)
                .where('vehicleType', '==', bookingDetails.vehicleType)
                .limit(1);

            const availabilitySnapshot = await transaction.get(availabilityQuery);

            if (availabilitySnapshot.empty) {
                // If intended date not available, check alternative date
                const altAvailabilityQuery = db.collection('availability')
                    .where('date', '==', bookingDetails.alternativeDate)
                    .where('pickup', '==', bookingDetails.pickup)
                    .where('destination', '==', bookingDetails.destination)
                    .where('vehicleType', '==', bookingDetails.vehicleType)
                    .limit(1);
                
                const altAvailabilitySnapshot = await transaction.get(altAvailabilityQuery);

                if (altAvailabilitySnapshot.empty) {
                     throw new Error('Availability for this trip could not be found for either date.');
                }
                
                const availabilityDoc = altAvailabilitySnapshot.docs[0];
                const currentSeats = availabilityDoc.data().seatsAvailable;
                if (currentSeats <= 0) {
                    throw new Error('This trip is fully booked on the alternative date.');
                }

                transaction.update(availabilityDoc.ref, {
                    seatsAvailable: FieldValue.increment(-1),
                });
                
                // Set the booking to the alternative date
                bookingDetails.intendedDate = bookingDetails.alternativeDate;


            } else {
                 const availabilityDoc = availabilitySnapshot.docs[0];
                const currentSeats = availabilityDoc.data().seatsAvailable;

                if (currentSeats <= 0) {
                    throw new Error('This trip is fully booked on the intended date.');
                }
                
                transaction.update(availabilityDoc.ref, {
                    seatsAvailable: FieldValue.increment(-1),
                });
            }
            
            const newBookingRef = db.collection('bookings').doc();
            const newBookingData = {
                ...bookingDetails,
                createdAt: FieldValue.serverTimestamp(),
                status: 'Confirmed' as const,
                paymentReference: reference,
                totalFare: bookingDetails.totalFare,
                confirmedDate: bookingDetails.intendedDate // Use intendedDate which may have been updated to alternative
            };
            
            transaction.set(newBookingRef, newBookingData);

            return { id: newBookingRef.id, ...newBookingData };
        });
        
        return { success: true, bookingId: booking.id };

    } catch (error: any) {
        console.error('Verification and booking creation failed:', error);
        return { success: false, error: error.message };
    }
};
