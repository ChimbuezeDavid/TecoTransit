
'use server';

import Paystack from 'paystack';
import type { BookingFormData } from '@/lib/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { vehicleOptions } from '@/lib/constants';
import { sendBookingStatusEmail } from './send-email';

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
    // Dynamically set the callback URL based on the environment
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_BASE_URL;
      
    const callbackUrl = `${baseUrl}/payment/callback`;

    const response = await paystack.transaction.initialize({
      email,
      amount: Math.round(amount),
      metadata,
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
        const verificationResponse = await paystack.transaction.verify(reference);
        if (verificationResponse.data?.status !== 'success') {
            throw new Error('Payment was not successful.');
        }

        const metadata = verificationResponse.data.metadata;
        if (!metadata || !metadata.booking_details) {
            throw new Error('Booking metadata is missing from transaction.');
        }
        
        const bookingDetails: Omit<BookingFormData, 'intendedDate' | 'alternativeDate' | 'privacyPolicy'> & { intendedDate: string, alternativeDate: string, totalFare: number } = JSON.parse(metadata.booking_details);

        const db = getFirebaseAdmin()?.firestore();
        if (!db) {
            throw new Error("Could not connect to the database.");
        }
        const bookingsRef = db.collection('bookings');
        
        // Create the booking with a 'Paid' status
        const newBookingRef = bookingsRef.doc();
        const newBookingData = {
            ...bookingDetails,
            createdAt: FieldValue.serverTimestamp(),
            status: 'Paid' as const, // Set status to 'Paid' instead of 'Confirmed'
            paymentReference: reference,
            totalFare: bookingDetails.totalFare,
            // confirmedDate is NOT set here, it's set when the trip is confirmed
        };

        await newBookingRef.set(newBookingData);
        const bookingId = newBookingRef.id;

        // After saving, check if the trip is now full
        await checkAndConfirmTrip(
            db,
            bookingDetails.pickup,
            bookingDetails.destination,
            bookingDetails.vehicleType,
            bookingDetails.intendedDate // Use the intended date for the check
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
    date: string // This is the intendedDate
) {
    const bookingsQuery = db.collection('bookings')
        .where('pickup', '==', pickup)
        .where('destination', '==', destination)
        .where('vehicleType', '==', vehicleType)
        .where('intendedDate', '==', date) // CORRECTED: Query by intendedDate
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
        return; // No rule, no-op
    }

    const priceRule = pricingSnapshot.docs[0].data();
    const vehicleKey = Object.keys(vehicleOptions).find(key => vehicleOptions[key as keyof typeof vehicleOptions].name === vehicleType) as keyof typeof vehicleOptions | undefined;
    
    if (!vehicleKey) {
        console.error(`Invalid vehicle type found: ${vehicleType}`);
        return;
    }
    
    const vehicleCapacityMap = { '4-seater': 4, '5-seater': 5, '7-seater': 7 };
    const vehicleCapacity = vehicleCapacityMap[vehicleKey] || 0;
    
    // Total capacity for just one vehicle of this type.
    const seatsPerVehicle = vehicleCapacity;
    const paidBookings = bookingsSnapshot.docs;
    
    // Check if the number of paid bookings fills one or more vehicles exactly.
    if (paidBookings.length > 0 && paidBookings.length % seatsPerVehicle === 0) {
        // This trip is full, confirm all 'Paid' bookings for this list
        const batch = db.batch();
        paidBookings.forEach(doc => {
            // Set status to 'Confirmed' and set the confirmedDate to the intendedDate
            batch.update(doc.ref, { status: 'Confirmed', confirmedDate: date });
        });
        
        await batch.commit();

        // After committing, send confirmation emails
        for (const doc of paidBookings) {
            const bookingData = doc.data();
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
                    confirmedDate: date, // Use the date we confirmed for
                });
            } catch (e) {
                console.error(`Failed to send confirmation email for booking ${doc.id}:`, e);
            }
        }
    }
}
