
'use server';

import Paystack from 'paystack';
import type { BookingFormData, PriceRule } from '@/lib/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue }from 'firebase-admin/firestore';
import { vehicleOptions } from '@/lib/constants';
import { sendBookingStatusEmail } from './send-email';
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
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
      throw new Error("Could not connect to the database.");
    }
    
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_BASE_URL;
      
    const callbackUrl = `${baseUrl}/payment/callback`;

    const response = await paystack.transaction.initialize({
      email,
      amount: Math.round(amount),
      metadata: { ...metadata },
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

        if (verificationResponse.data?.status !== 'success') {
            throw new Error('Payment was not successful.');
        }

        if (!metadata || !metadata.booking_details) {
            throw new Error('Booking metadata is missing from transaction.');
        }
        
        const bookingDetails: Omit<BookingFormData, 'intendedDate' | 'privacyPolicy'> & { intendedDate: string, totalFare: number } = JSON.parse(metadata.booking_details);
        
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
    date: string // Note: date is used to find a date to confirm for, but not for seat counting
) {
    const bookingsQuery = db.collection('bookings')
        .where('pickup', '==', pickup)
        .where('destination', '==', destination)
        .where('vehicleType', '==', vehicleType)
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
        console.log(`No price/fleet rule found for trip: ${pickup}-${destination}`);
        return;
    }

    const priceRule = pricingSnapshot.docs[0].data();
    
    const vehicleKey = Object.keys(vehicleOptions).find(key => vehicleOptions[key as keyof typeof vehicleOptions].name === priceRule.vehicleType);
    const capacityPerVehicle = vehicleKey ? vehicleOptions[key as keyof typeof vehicleOptions].capacity : 0;
    const capacity = (priceRule.vehicleCount || 0) * capacityPerVehicle;

    if (capacity === 0) return;

    const paidBookings = bookingsSnapshot.docs;
    
    // This logic assumes we fill one vehicle at a time based on capacity
    if (paidBookings.length >= capacity) {
        const bookingsToConfirm = paidBookings.slice(0, capacity);
        
        const batch = db.batch();
        const confirmationDate = format(new Date(), 'yyyy-MM-dd'); // Confirm for today or a relevant date
        
        bookingsToConfirm.forEach(doc => {
            // Only update if not already confirmed
            if (doc.data().status !== 'Confirmed') {
                batch.update(doc.ref, { status: 'Confirmed', confirmedDate: confirmationDate });
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
                        confirmedDate: confirmationDate,
                    });
                } catch (e) {
                    console.error(`Failed to send confirmation email for booking ${doc.id}:`, e);
                }
            }
        }
    }
}
