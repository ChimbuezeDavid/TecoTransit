'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { format, subDays, startOfDay, parseISO } from 'date-fns';
import { assignBookingToTrip } from "./paystack";
import type { Booking, Trip } from "@/lib/types";
import { sendBookingRescheduledEmail } from "./send-email";

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

            for (const passenger of trip.passengers) {
                const bookingRef = db.collection('bookings').doc(passenger.bookingId);
                
                // Use a transaction to ensure atomicity
                await db.runTransaction(async (transaction) => {
                    const bookingDoc = await transaction.get(bookingRef);
                    if (!bookingDoc.exists) {
                        throw new Error(`Booking ${passenger.bookingId} not found.`);
                    }
                    const bookingData = bookingDoc.data() as Booking;

                    // 1. Update the booking's intended date
                    transaction.update(bookingRef, { 
                        intendedDate: newDate,
                        // Clear the old tripId so assignBookingToTrip can work correctly
                        tripId: null 
                    });

                    // We need to pass the full booking data to assignBookingToTrip
                    // This data includes the modification we just made in the transaction
                    const updatedBookingForAssignment = {
                        ...bookingData,
                        id: bookingDoc.id,
                        intendedDate: newDate,
                        tripId: undefined, // ensure it's not present
                        createdAt: (bookingData.createdAt as any).toMillis(), // Convert timestamp if needed
                    };
                    
                    // The actual re-assignment logic will be handled here after the transaction commits.
                    return updatedBookingForAssignment;
                }).then(async (updatedBookingForAssignment) => {
                     try {
                        // 2. Re-assign to a new trip for the new date
                        await assignBookingToTrip(updatedBookingForAssignment);
                        
                        // 3. Send notification email
                        await sendBookingRescheduledEmail({
                            name: updatedBookingForAssignment.name,
                            email: updatedBookingForAssignment.email,
                            bookingId: updatedBookingForAssignment.id,
                            oldDate: yesterdayStr,
                            newDate: newDate,
                        });
                        rescheduledCount++;
                    } catch (assignmentError: any) {
                        errorCount++;
                        errors.push(`Failed to re-assign booking ${passenger.bookingId}: ${assignmentError.message}`);
                        console.error(`Failed to re-assign booking ${passenger.bookingId}:`, assignmentError);
                        // Optionally, revert intendedDate change or flag for manual review
                    }
                }).catch((transactionError: any) => {
                    errorCount++;
                    errors.push(`Transaction failed for booking ${passenger.bookingId}: ${transactionError.message}`);
                    console.error(`Transaction failed for booking ${passenger.bookingId}:`, transactionError);
                });
            }
        }
        
        return { message: `Rescheduling process completed.`, rescheduledCount, errorCount, errors };

    } catch (error: any) {
        console.error("An error occurred during the rescheduling process:", error);
        throw new Error("Failed to reschedule trips due to a server error.");
    }
}
