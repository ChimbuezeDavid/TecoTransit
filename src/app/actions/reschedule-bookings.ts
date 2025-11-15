
'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { format, subDays, startOfDay, parseISO } from 'date-fns';
import { assignBookingToTrip } from "./paystack";
import type { Booking, Trip } from "@/lib/types";
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
            const originalPassengers = [...trip.passengers]; // Create a copy to iterate over

            for (const passenger of originalPassengers) {
                const bookingRef = db.collection('bookings').doc(passenger.bookingId);
                
                try {
                    // Use a transaction to ensure atomicity
                    const updatedBookingForAssignment = await db.runTransaction(async (transaction) => {
                        const bookingDoc = await transaction.get(bookingRef);
                        if (!bookingDoc.exists) {
                            throw new Error(`Booking ${passenger.bookingId} not found.`);
                        }
                        const bookingData = bookingDoc.data() as Booking;

                        // Don't reschedule if user opted out
                        if (!bookingData.allowReschedule) {
                            // Returning null will skip this passenger
                            return null;
                        }

                        // 1. Update the booking's intended date and clear old tripId
                        transaction.update(bookingRef, { 
                            intendedDate: newDate,
                            tripId: FieldValue.delete() // Use FieldValue.delete() to remove the field
                        });
                        
                        // 2. Remove passenger from the old trip
                        const oldTripRef = db.collection('trips').doc(trip.id);
                        transaction.update(oldTripRef, {
                            passengers: FieldValue.arrayRemove(passenger)
                        });

                        // 3. Return the data needed for the next step.
                        // We must reconstruct the object with the new date for the assignment function.
                        return {
                            ...bookingData,
                            id: bookingDoc.id,
                            intendedDate: newDate,
                            tripId: undefined, // ensure it's not present for assignBookingToTrip
                            createdAt: (bookingData.createdAt as any).toMillis(), // Convert timestamp if needed
                        };
                    });

                    // If the transaction returned null (e.g., user opted out), skip to next passenger
                    if (!updatedBookingForAssignment) {
                        continue;
                    }
                    
                    // 4. Re-assign to a new trip for the new date
                    await assignBookingToTrip(updatedBookingForAssignment);
                    
                    // 5. Send notification email
                    await sendBookingRescheduledEmail({
                        name: updatedBookingForAssignment.name,
                        email: updatedBookingForAssignment.email,
                        bookingId: updatedBookingForAssignment.id,
                        oldDate: yesterdayStr,
                        newDate: newDate,
                    });

                    rescheduledCount++;

                } catch (e: any) {
                    errorCount++;
                    const errorMessage = `Failed to process booking ${passenger.bookingId}: ${e.message}`;
                    errors.push(errorMessage);
                    console.error(errorMessage, e);
                    // The transaction will have rolled back, so the booking and old trip are safe.
                    // An overflow/error email would have been sent by assignBookingToTrip if that's where it failed.
                }
            }
        }
        
        return { message: `Rescheduling process completed.`, rescheduledCount, errorCount, errors };

    } catch (error: any) {
        console.error("An error occurred during the rescheduling process:", error);
        throw new Error("Failed to reschedule trips due to a server error.");
    }
}
