
'use server';

import Paystack from 'paystack';
import type { BookingFormData } from '@/lib/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue }from 'firebase-admin/firestore';
import { vehicleOptions } from '@/lib/constants';
import { sendBookingStatusEmail } from './send-email';
import { collection, query, where, getDocs, Firestore } from "firebase/firestore";

if (!process.env.PAYSTACK_SECRET_KEY) {
  throw new Error('PAYSTACK_SECRET_KEY is not set in environment variables.');
}

const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

interface InitializeTransactionArgs {
  email: string;
  amount: number; // in kobo
  metadata: Record<string, any>;
}

// This is a new, server-side-only version of getAvailableSeats
// It's separate from the client-side logic to ensure server-side checks are robust.
const getAvailableSeatsOnServer = async (
    db: FirebaseFirestore.Firestore, 
    pickup: string, 
    destination: string, 
    vehicleType: string, 
    date: string
): Promise<number> => {
    try {
        const pricingQuery = query(
            collection(db, 'prices'),
            where('pickup', '==', pickup),
            where('destination', '==', destination),
            where('vehicleType', '==', vehicleType)
        );

        const bookingsQuery = query(
            collection(db, 'bookings'),
            where('pickup', '==', pickup),
            where('destination', '==', destination),
            where('vehicleType', '==', vehicleType),
            where('intendedDate', '==', date),
            where('status', 'in', ['Paid', 'Confirmed'])
        );

        const [pricingSnapshot, bookingsSnapshot] = await Promise.all([
            getDocs(pricingQuery as any),
            getDocs(bookingsQuery as any),
        ]);

        if (pricingSnapshot.empty) {
            return 0;
        }

        const priceRule = pricingSnapshot.docs[0].data();
        const vehicleKey = Object.keys(vehicleOptions).find(key => vehicleOptions[key as keyof typeof vehicleOptions].name === priceRule.vehicleType) as keyof typeof vehicleOptions | undefined;
        
        if (!vehicleKey) {
            return 0;
        }

        const vehicleCapacityMap = { '4-seater': 4, '5-seater': 5, '7-seater': 7 };
        const seatsPerVehicle = vehicleCapacityMap[vehicleKey] || 0;
        const totalSeats = (priceRule.vehicleCount || 0) * seatsPerVehicle;

        const bookedSeats = bookingsSnapshot.size;

        return totalSeats - bookedSeats;

    } catch (error) {
        console.error("Error getting available seats on server:", error);
        return 0;
    }
};


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
        
        const bookingDetails: Omit<BookingFormData, 'intendedDate' | 'privacyPolicy'> & { intendedDate: string, totalFare: number } = JSON.parse(metadata.booking_details);

        const db = getFirebaseAdmin()?.firestore();
        if (!db) {
            throw new Error("Could not connect to the database.");
        }

        // Authoritative final check for seat availability on the server
        const availableSeats = await getAvailableSeatsOnServer(
            db,
            bookingDetails.pickup,
            bookingDetails.destination,
            bookingDetails.vehicleType,
            bookingDetails.intendedDate,
        );

        if (availableSeats <= 0) {
            // This is the critical race condition check.
            // Ideally, you would trigger a refund here if possible, or at least notify admins.
            console.warn(`Overbooking prevented for trip ${bookingDetails.pickup} to ${bookingDetails.destination} on ${bookingDetails.intendedDate}. User: ${bookingDetails.email}`);
            throw new Error('Sorry, the last seat was just taken. Your payment was successful but the booking could not be completed. Please contact support.');
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
        // We should not create a booking if the server-side check fails.
        // The user's payment was successful, so this situation requires manual intervention (e.g., refund).
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
    // Fetch only the bookings that are 'Paid' and waiting for confirmation.
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
        return; // No rule, no-op
    }

    const priceRule = pricingSnapshot.docs[0].data();
    const vehicleKey = Object.keys(vehicleOptions).find(key => vehicleOptions[key as keyof typeof vehicleOptions].name === priceRule.vehicleType) as keyof typeof vehicleOptions | undefined;
    
    if (!vehicleKey) {
        console.error(`Invalid vehicle type found: ${priceRule.vehicleType}`);
        return;
    }
    
    const vehicleCapacityMap = { '4-seater': 4, '5-seater': 5, '7-seater': 7 };
    const seatsPerVehicle = vehicleCapacityMap[vehicleKey] || 0;
    
    if (seatsPerVehicle === 0) return;

    const paidBookings = bookingsSnapshot.docs;
    
    // Check if there are enough paid passengers to fill at least one vehicle.
    if (paidBookings.length >= seatsPerVehicle) {
        // Take the first `seatsPerVehicle` bookings from the list to form a full trip
        const bookingsToConfirm = paidBookings.slice(0, seatsPerVehicle);
        
        const batch = db.batch();
        bookingsToConfirm.forEach(doc => {
            // Set status to 'Confirmed' and set the confirmedDate to the intendedDate
            batch.update(doc.ref, { status: 'Confirmed', confirmedDate: date });
        });
        
        await batch.commit();

        // After committing, send confirmation emails for the confirmed group
        for (const doc of bookingsToConfirm) {
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

    