
'use server';

import Paystack from 'paystack';
import type { BookingFormData } from '@/lib/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue }from 'firebase-admin/firestore';
import { vehicleOptions } from '@/lib/constants';
import { sendBookingStatusEmail } from './send-email';
import { collection, query, where, getDocs, type Firestore } from "firebase/firestore";

if (!process.env.PAYSTACK_SECRET_KEY) {
  throw new Error('PAYSTACK_SECRET_KEY is not set in environment variables.');
}

const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

interface InitializeTransactionArgs {
  email: string;
  amount: number; // in kobo
  metadata: Record<string, any>;
}

// This function now uses the Admin SDK's firestore instance correctly.
const getAvailableSeatsOnServer = async (
    db: FirebaseFirestore.Firestore, // Note: This is the Admin SDK's Firestore type
    pickup: string, 
    destination: string, 
    vehicleType: string, 
    date: string
): Promise<number> => {
    try {
        const pricesCollection = db.collection('prices');
        const pricesQuery = pricesCollection
            .where('pickup', '==', pickup)
            .where('destination', '==', destination)
            .where('vehicleType', '==', vehicleType);
        
        const pricingSnapshot = await pricesQuery.get();

        if (pricingSnapshot.empty) {
            console.error("Server Check: No pricing rule found for this route.");
            return 0;
        }

        const priceRule = pricingSnapshot.docs[0].data();
        
        const vehicleKey = Object.keys(vehicleOptions).find(key => vehicleOptions[key as keyof typeof vehicleOptions].name === priceRule.vehicleType) as keyof typeof vehicleOptions | undefined;
        
        if (!vehicleKey) {
            console.error(`Server Check: Invalid vehicle type in price rule: ${priceRule.vehicleType}`);
            return 0;
        }

        const vehicleCapacityMap = { '4-seater': 4, '5-seater': 5, '7-seater': 7 };
        const seatsPerVehicle = vehicleCapacityMap[vehicleKey] || 0;
        const totalSeats = (priceRule.vehicleCount || 0) * seatsPerVehicle;

        if (totalSeats <= 0) {
            return 0;
        }

        const bookingsCollection = db.collection('bookings');
        const bookingsQuery = bookingsCollection
            .where('pickup', '==', pickup)
            .where('destination', '==', destination)
            .where('vehicleType', '==', vehicleType)
            .where('intendedDate', '==', date)
            .where('status', 'in', ['Paid', 'Confirmed']);
        
        const bookingsSnapshot = await bookingsQuery.get();
        const bookedSeats = bookingsSnapshot.size;

        const available = totalSeats - bookedSeats;
        return available < 0 ? 0 : available;

    } catch (error) {
        console.error("Error getting available seats on server:", error);
        return 0;
    }
};


export const initializeTransaction = async ({ email, amount, metadata }: InitializeTransactionArgs) => {
  try {
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

        const availableSeats = await getAvailableSeatsOnServer(
            db,
            bookingDetails.pickup,
            bookingDetails.destination,
            bookingDetails.vehicleType,
            bookingDetails.intendedDate,
        );

        if (availableSeats <= 0) {
            console.warn(`Overbooking prevented for trip ${bookingDetails.pickup} to ${bookingDetails.destination} on ${bookingDetails.intendedDate}. User: ${bookingDetails.email}`);
            throw new Error('Sorry, the last seat was just taken. Your payment was successful but the booking could not be completed. Please contact support for a refund.');
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
    const vehicleKey = Object.keys(vehicleOptions).find(key => vehicleOptions[key as keyof typeof vehicleOptions].name === priceRule.vehicleType) as keyof typeof vehicleOptions | undefined;
    
    if (!vehicleKey) {
        console.error(`Invalid vehicle type found: ${priceRule.vehicleType}`);
        return;
    }
    
    const vehicleCapacityMap = { '4-seater': 4, '5-seater': 5, '7-seater': 7 };
    const seatsPerVehicle = vehicleCapacityMap[vehicleKey] || 0;
    
    if (seatsPerVehicle === 0) return;

    const paidBookings = bookingsSnapshot.docs;
    
    if (paidBookings.length >= seatsPerVehicle) {
        const bookingsToConfirm = paidBookings.slice(0, seatsPerVehicle);
        
        const batch = db.batch();
        bookingsToConfirm.forEach(doc => {
            batch.update(doc.ref, { status: 'Confirmed', confirmedDate: date });
        });
        
        await batch.commit();

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
                    confirmedDate: date,
                });
            } catch (e) {
                console.error(`Failed to send confirmation email for booking ${doc.id}:`, e);
            }
        }
    }
}
