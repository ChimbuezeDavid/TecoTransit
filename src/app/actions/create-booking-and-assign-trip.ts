
'use server';

import type { Booking, BookingFormData, Passenger, PriceRule, Trip } from '@/lib/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue, FieldPath, Transaction } from 'firebase-admin/firestore';
import { vehicleOptions } from '@/lib/constants';
import { sendBookingStatusEmail, sendBookingReceivedEmail } from './send-email';
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
        const bookingId = newBookingRef.id;

        const passenger: Passenger = {
            bookingId: bookingId,
            name: data.name,
            phone: data.phone,
        };
        
        // This is the crucial step: immediately try to assign the new booking to a trip.
        // We pass the newBookingRef to be set within the transaction.
        await assignBookingToTrip(newBookingRef, firestoreBooking, passenger, {
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
    bookingRef: FirebaseFirestore.DocumentReference,
    bookingData: any,
    passenger: Passenger,
    bookingDetails: {
        pickup: string;
        destination: string;
        vehicleType: string;
        intendedDate: string;
    }
) {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        console.error("Database connection not available in assignBookingToTrip");
        return;
    }

    const { pickup, destination, vehicleType, intendedDate } = bookingDetails;
    const priceRuleId = `${pickup}_${destination}_${vehicleType}`.toLowerCase().replace(/\s+/g, '-');

    const priceRuleRef = db.doc(`prices/${priceRuleId}`);
    
    try {
        let assignedTripId: string | null = null;
        
        await db.runTransaction(async (transaction) => {
            const priceRuleSnap = await transaction.get(priceRuleRef);
            if (!priceRuleSnap.exists) {
                throw new Error(`Price rule ${priceRuleId} not found.`);
            }
            const priceRule = priceRuleSnap.data() as PriceRule;
            const vehicleKey = Object.keys(vehicleOptions).find(key => vehicleOptions[key as keyof typeof vehicleOptions].name === priceRule.vehicleType);
            const capacityPerVehicle = vehicleKey ? vehicleOptions[key as keyof typeof vehicleOptions].capacity : 0;
            
            if (capacityPerVehicle === 0) {
                throw new Error(`Vehicle capacity for ${priceRule.vehicleType} is zero.`);
            }

            const tripsQuery = db.collection('trips')
                .where('priceRuleId', '==', priceRuleId)
                .where('date', '==', intendedDate)
                .orderBy('vehicleIndex');
            
            const tripsSnapshot = await transaction.get(tripsQuery);
            let assigned = false;

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
                    
                    transaction.update(doc.ref, updates);
                    
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
                
                transaction.set(db.collection('trips').doc(newTripId), newTrip);

                assigned = true;
                assignedTripId = newTripId;
            }

            // If still not assigned after trying everything, throw an error to rollback transaction.
            if (!assigned) {
                throw new Error("All vehicles for this route and date are full.");
            }
             
            // Create the booking and associate it with the trip within the same transaction.
            if (assignedTripId) {
                transaction.set(bookingRef, { ...bookingData, tripId: assignedTripId });
            } else {
                 transaction.set(bookingRef, bookingData);
            }
        });
        
        // After transaction is successful, check for trip confirmation
        if (assignedTripId) {
            const tripRef = db.collection('trips').doc(assignedTripId);
            const tripDoc = await tripRef.get();
            if(tripDoc.exists && (tripDoc.data() as Trip).isFull) {
                await checkAndConfirmTrip(db, assignedTripId);
            }
        }
    } catch (error: any) {
        console.error(`Transaction failed for booking ${passenger.bookingId}:`, error.message);
        await sendOverflowEmail(bookingDetails, error.message);
    }
}


async function sendOverflowEmail(bookingDetails: any, reason: string) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { pickup, destination, vehicleType, intendedDate, name, email } = bookingDetails;
    try {
        await resend.emails.send({
            from: 'TecoTransit Alert <alert@tecotransit.org>',
            to: ['tecotransportservices@gmail.com'],
            subject: 'Urgent: Vehicle Capacity Exceeded or Booking Assignment Failed',
            html: `
                <h1>Vehicle Capacity Alert</h1>
                <p>A new booking could not be automatically assigned to a trip.</p>
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


async function checkAndConfirmTrip(
    db: FirebaseFirestore.Firestore,
    tripId: string,
) {
    const tripRef = db.collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
        console.warn(`Trip with ID ${tripId} not found for confirmation check.`);
        return;
    }

    const trip = tripDoc.data() as Trip;

    // Only proceed if the trip is marked as full
    if (!trip.isFull) {
        return;
    }
    
    const passengerIds = trip.passengers.map(p => p.bookingId);
    if (passengerIds.length === 0) return;

    const bookingsQuery = db.collection('bookings').where(FieldPath.documentId(), 'in', passengerIds);
    const bookingsSnapshot = await bookingsQuery.get();

    const bookingsToConfirm = bookingsSnapshot.docs.filter(doc => doc.data().status === 'Paid' || doc.data().status === 'Pending');

    if (bookingsToConfirm.length === 0) return;

    const batch = db.batch();
    bookingsToConfirm.forEach(doc => {
        batch.update(doc.ref, { status: 'Confirmed', confirmedDate: trip.date });
    });
    
    await batch.commit();

    for (const doc of bookingsToConfirm) {
        const bookingData = doc.data();
        // Don't send email for 'Pending' bookings that get auto-confirmed.
        if (bookingData.status !== 'Pending') {
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
                    confirmedDate: trip.date,
                });
            } catch (e) {
                console.error(`Failed to send confirmation email for booking ${doc.id}:`, e);
            }
        }
    }
}
