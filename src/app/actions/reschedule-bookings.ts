'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { format, subDays, startOfDay } from 'date-fns';
import { assignBookingToTrip } from "./paystack";
import type { Booking, Trip, Passenger } from "@/lib/types";
import { sendBookingRescheduledEmail } from "./send-email";
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Finds all trips from the previous day that were not full and attempts to reschedule
 * the passengers to a trip on the current day.
 */
export async function rescheduleUnderfilledTrips() {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        throw new Error("Database connection failed.");
    }

    const yesterday = subDays(startOfDay(new Date()), 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
    
    let rescheduledCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
        const underfilledTripsQuery = db.collection('trips')
            .where('date', '==', yesterdayStr)
            .where('isFull', '==', false);
        
        const snapshot = await underfilledTripsQuery.get();

        if (snapshot.empty) {
            return { message: "No under-filled trips from yesterday to reschedule.", rescheduledCount, errorCount, errors };
        }
        
        const newDate = format(new Date(), 'yyyy-MM-dd');

        for (const tripDoc of snapshot.docs) {
            const trip = tripDoc.data() as Trip;
            // Create a copy to iterate over, as we might be modifying the trip's passenger list
            const originalPassengers = [...trip.passengers]; 

            for (const passenger of originalPassengers) {
                const bookingRef = db.collection('bookings').doc(passenger.bookingId);
                const oldTripRef = db.collection('trips').doc(trip.id);

                try {
                    // This transaction will either fully succeed or fully fail.
                    const bookingForAssignment = await db.runTransaction(async (transaction) => {
                        const bookingDoc = await transaction.get(bookingRef);
                        if (!bookingDoc.exists) {
                            throw new Error(`Booking ${passenger.bookingId} not found.`);
                        }
                        const bookingData = bookingDoc.data() as Booking;

                        // Don't reschedule if user opted out or booking was cancelled
                        if (!bookingData.allowReschedule || bookingData.status === 'Cancelled') {
                            return null;
                        }

                        // We must fetch the passenger object from the old trip *inside* the transaction
                        // to ensure we have the most up-to-date version before removing it.
                        const oldTripDoc = await transaction.get(oldTripRef);
                        const oldTripData = oldTripDoc.data() as Trip;
                        const passengerInOldTrip = oldTripData.passengers.find(p => p.bookingId === passenger.bookingId);
                        
                        if (!passengerInOldTrip) {
                            // Passenger is already gone, maybe handled by another process. Skip.
                            return null;
                        }
                        
                        // 1. Remove passenger from the old trip
                        transaction.update(oldTripRef, {
                            passengers: FieldValue.arrayRemove(passengerInOldTrip)
                        });

                        // 2. Update the booking's intended date and clear the old tripId
                        transaction.update(bookingRef, { 
                            intendedDate: newDate,
                            tripId: FieldValue.delete()
                        });
                        
                        // 3. Return the fresh booking data needed for the next step.
                        return {
                            ...bookingData,
                            id: bookingDoc.id, // Ensure ID is present
                            intendedDate: newDate, // Use the new date for assignment
                            tripId: undefined, // Ensure tripId is not carried over
                            createdAt: (bookingData.createdAt as any).toMillis(),
                        };
                    });

                    // If transaction returned null (e.g., user opted out), skip to next passenger
                    if (!bookingForAssignment) {
                        continue;
                    }
                    
                    // 4. Re-assign to a new trip for the new date. This is now outside the first transaction.
                    // assignBookingToTrip has its own transaction, ensuring this step is also atomic.
                    await assignBookingToTrip(bookingForAssignment);
                    
                    // 5. Send notification email *after* successful reassignment
                    await sendBookingRescheduledEmail({
                        name: bookingForAssignment.name,
                        email: bookingForAssignment.email,
                        bookingId: bookingForAssignment.id,
                        oldDate: yesterdayStr,
                        newDate: newDate,
                    });

                    rescheduledCount++;

                } catch (e: any) {
                    errorCount++;
                    const errorMessage = `Failed to process booking ${passenger.bookingId}: ${e.message}`;
                    errors.push(errorMessage);
                    console.error(errorMessage, e);
                    // If assignBookingToTrip fails, an overflow email is sent, and the original transaction rolls back.
                    // The booking and old trip remain in their original state, which is safe.
                }
            }
        }
        
        return { message: `Rescheduling process completed.`, rescheduledCount, errorCount, errors };

    } catch (error: any) {
        console.error("An error occurred during the rescheduling process:", error);
        throw new Error("Failed to reschedule trips due to a server error.");
    }
}
