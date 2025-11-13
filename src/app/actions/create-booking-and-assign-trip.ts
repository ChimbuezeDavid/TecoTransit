
'use server';

import type { Booking, BookingFormData, Passenger, PriceRule, Trip } from '@/lib/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue, FieldPath } from 'firebase-admin/firestore';
import { vehicleOptions } from '@/lib/constants';
import { sendBookingReceivedEmail } from './send-email';
import { Resend } from 'resend';
import { format } from 'date-fns';

type CreateBookingResult = {
    success: boolean;
    booking?: Booking;
    error?: string;
}

// This function now encapsulates creating a pending booking and assigning it to a trip.
export const createBookingAndAssignTrip = async (data: Omit<BookingFormData, 'privacyPolicy'> & { totalFare: number }): Promise<CreateBookingResult> => {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        return { success: false, error: "Could not connect to the database." };
    }
    
    const firestoreBooking = {
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        status: 'Pending' as const,
        intendedDate: format(data.intendedDate, 'yyyy-MM-dd'),
    };
    
    try {
        const newBookingRef = db.collection('bookings').doc();
        await newBookingRef.set(firestoreBooking);
        const bookingId = newBookingRef.id;

        const passenger: Passenger = {
            bookingId: bookingId,
            name: data.name,
            phone: data.phone,
        };
        
        // This is the crucial step: immediately try to assign the new booking to a trip.
        await assignBookingToTrip(db, passenger, {
            pickup: data.pickup,
            destination: data.destination,
            vehicleType: data.vehicleType,
            intendedDate: format(data.intendedDate, 'yyyy-MM-dd'),
        });
        
        const createdBookingDoc = await newBookingRef.get();
        const createdBookingData = createdBookingDoc.data();
        
        if (!createdBookingData) {
            return { success: false, error: 'Failed to retrieve created booking.' };
        }

        return { 
            success: true, 
            booking: {
                ...createdBookingData,
                id: bookingId,
                createdAt: (createdBookingData.createdAt as FirebaseFirestore.Timestamp).toMillis(),
            } as Booking
        };

    } catch (error: any) {
        console.error("Error in createBookingAndAssignTrip:", error);
        return { success: false, error: error.message || 'An unknown error occurred while creating booking.' };
    }
};


async function assignBookingToTrip(
    db: FirebaseFirestore.Firestore,
    passenger: Passenger,
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
    let assignedTripId: string | null = null;

    // 1. Try to find a non-full, existing trip
    for (const doc of tripsSnapshot.docs) {
        const trip = doc.data() as Trip;
        if (!trip.isFull) {
            const newPassengerCount = trip.passengers.length + 1;
            const updates: { passengers: FirebaseFirestore.FieldValue; isFull?: boolean } = {
                passengers: FieldValue.arrayUnion(passenger),
            };

            if (newPassengerCount >= trip.capacity) {
                updates.isFull = true;
            }

            await doc.ref.update(updates);
            
            await db.doc(`bookings/${passenger.bookingId}`).update({ tripId: doc.id });
            assigned = true;
            assignedTripId = doc.id;
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
            passengers: [passenger],
            isFull: capacityPerVehicle <= 1,
        };

        await db.collection('trips').doc(newTripId).set(newTrip);
        await db.doc(`bookings/${passenger.bookingId}`).update({ tripId: newTripId });
        assigned = true;
        assignedTripId = newTripId;
    }

    // 3. If still not assigned, all vehicles are full. Send alert.
    if (!assigned) {
        console.warn(`All vehicles are full for route ${priceRuleId} on ${intendedDate}.`);
        await sendOverflowEmail(bookingDetails, "All vehicles for this route and date are full.");
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
                <p>A new booking could not be automatically assigned to a trip because all vehicles are full.</p>
                <p><strong>Reason:</strong> ${reason}</p>
                <h3>Booking Details:</h3>
                <ul>
                    <li><strong>Route:</strong> ${pickup} to ${destination}</li>
                    <li><strong>Vehicle:</strong> ${vehicleType}</li>
                    <li><strong>Date:</strong> ${intendedDate}</li>
                    ${name ? `<li><strong>Passenger:</strong> ${name} (${email})</li>` : ''}
                </ul>
                <p>Please take immediate action to arrange for more vehicle space or contact the customer.</p>
            `,
        });
    } catch(e) {
        console.error("Failed to send overflow email:", e);
    }
}
