
'use server';

import Paystack from 'paystack';
import type { BookingFormData, PriceRule, Trip } from '@/lib/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue }from 'firebase-admin/firestore';
import { vehicleOptions } from '@/lib/constants';
import { sendBookingStatusEmail } from './send-email';
import { Resend } from 'resend';


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

        await assignBookingToTrip(db, bookingId, bookingDetails);

        return { success: true, bookingId: bookingId };

    } catch (error: any) {
        console.error('Verification and booking creation failed:', error);
        return { success: false, error: error.message };
    }
};

async function assignBookingToTrip(
    db: FirebaseFirestore.Firestore,
    bookingId: string,
    bookingDetails: {
        pickup: string;
        destination: string;
        vehicleType: string;
        intendedDate: string;
    }
) {
    const { pickup, destination, vehicleType, intendedDate } = bookingDetails;
    const priceRuleId = `${pickup}_${destination}_${vehicleType}`.toLowerCase().replace(/\s+/g, '-');

    const priceRuleRef = db.doc(`prices/${priceRuleId}`);
    const priceRuleSnap = await priceRuleRef.get();

    if (!priceRuleSnap.exists) {
        console.warn(`Assignment failed: Price rule ${priceRuleId} not found.`);
        await sendOverflowEmail(bookingDetails, "Price rule not found for this route.");
        return;
    }
    const priceRule = priceRuleSnap.data() as PriceRule;
    const vehicleKey = Object.keys(vehicleOptions).find(key => vehicleOptions[key as keyof typeof vehicleOptions].name === priceRule.vehicleType);
    const capacityPerVehicle = vehicleKey ? vehicleOptions[key as keyof typeof vehicleOptions].capacity : 0;
    
    if (capacityPerVehicle === 0) {
        console.warn(`Assignment failed: Vehicle capacity for ${priceRule.vehicleType} is zero.`);
        await sendOverflowEmail(bookingDetails, "Vehicle capacity is not configured correctly.");
        return;
    }

    const tripsQuery = db.collection('trips')
        .where('priceRuleId', '==', priceRuleId)
        .where('date', '==', intendedDate);

    const tripsSnapshot = await tripsQuery.get();
    let assigned = false;

    // 1. Try to find a non-full, existing trip
    for (const doc of tripsSnapshot.docs) {
        const trip = doc.data() as Trip;
        if (!trip.isFull) {
            await doc.ref.update({
                passengerIds: FieldValue.arrayUnion(bookingId),
            });
            // Re-check if it's full now
            if (trip.passengerIds.length + 1 >= trip.capacity) {
                await doc.ref.update({ isFull: true });
            }
            // Update booking with tripId
            await db.doc(`bookings/${bookingId}`).update({ tripId: doc.id });
            assigned = true;
            break;
        }
    }

    // 2. If not assigned, check if we can create a new trip
    if (!assigned && tripsSnapshot.size < priceRule.vehicleCount) {
        const newVehicleIndex = tripsSnapshot.size + 1;
        const newTripId = `${priceRuleId}_${intendedDate}_${newVehicleIndex}`;
        
        const newTrip: Trip = {
            id: newTripId,
            priceRuleId: priceRule.id,
            pickup: priceRule.pickup,
            destination: priceRule.destination,
            vehicleType: priceRule.vehicleType,
            date: intendedDate,
            vehicleIndex: newVehicleIndex,
            capacity: capacityPerVehicle,
            passengerIds: [bookingId],
            isFull: capacityPerVehicle <= 1,
        };

        await db.collection('trips').doc(newTripId).set(newTrip);
        await db.doc(`bookings/${bookingId}`).update({ tripId: newTripId });
        assigned = true;
    }

    // 3. If still not assigned, all vehicles are full. Send alert.
    if (!assigned) {
        console.warn(`All vehicles are full for route ${priceRuleId} on ${intendedDate}.`);
        await sendOverflowEmail(bookingDetails, "All vehicles for this route and date are full.");
    }

    // After assignment logic, check for trip confirmation
    if (assigned) {
        await checkAndConfirmTrip(db, pickup, destination, vehicleType, intendedDate);
    }
}


async function sendOverflowEmail(bookingDetails: any, reason: string) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { pickup, destination, vehicleType, intendedDate, name, email } = bookingDetails;
    try {
        await resend.emails.send({
            from: 'TecoTransit Alert <alert@tecotransit.org>',
            to: ['tecotransportservices@gmail.com'],
            subject: 'Urgent: Vehicle Capacity Exceeded',
            html: `
                <h1>Vehicle Capacity Alert</h1>
                <p>A new paid booking could not be automatically assigned to a trip because all vehicles are full.</p>
                <p><strong>Reason:</strong> ${reason}</p>
                <h3>Booking Details:</h3>
                <ul>
                    <li><strong>Route:</strong> ${pickup} to ${destination}</li>
                    <li><strong>Vehicle:</strong> ${vehicleType}</li>
                    <li><strong>Date:</strong> ${intendedDate}</li>
                    <li><strong>Passenger:</strong> ${name} (${email})</li>
                </ul>
                <p>Please take immediate action to arrange for more vehicle space or contact the customer.</p>
            `,
        });
    } catch(e) {
        console.error("Failed to send overflow email:", e);
    }
}


async function checkAndConfirmTrip(
    db: FirebaseFirestore.Firestore,
    pickup: string,
    destination: string,
    vehicleType: string,
    date: string
) {
    const tripsQuery = db.collection('trips')
        .where('pickup', '==', pickup)
        .where('destination', '==', destination)
        .where('vehicleType', '==', vehicleType)
        .where('date', '==', date)
        .where('isFull', '==', true);
    
    const fullTripsSnapshot = await tripsQuery.get();
    
    for (const tripDoc of fullTripsSnapshot.docs) {
        const trip = tripDoc.data() as Trip;
        const passengerIds = trip.passengerIds;

        if (passengerIds.length === 0) continue;

        const bookingsQuery = db.collection('bookings').where(FieldPath.documentId(), 'in', passengerIds);
        const bookingsSnapshot = await bookingsQuery.get();

        const batch = db.batch();
        const bookingsToConfirm = bookingsSnapshot.docs.filter(doc => doc.data().status === 'Paid');

        if (bookingsToConfirm.length === 0) continue;

        bookingsToConfirm.forEach(doc => {
            batch.update(doc.ref, { status: 'Confirmed', confirmedDate: date });
        });
        
        await batch.commit();

        // Send emails after committing the batch
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
