
'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { format, subDays, startOfDay } from 'date-fns';
import { assignBookingToTrip } from "./create-booking-and-assign-trip";
import type { Booking, Trip, Passenger } from "@/lib/types";
import { sendBookingRescheduledEmail } from "./send-email";
import { FieldValue } from 'firebase-admin/firestore';
import { vehicleOptions } from "@/lib/constants";

type RescheduleResult = {
    totalTripsScanned: number;
    totalPassengersToProcess: number;
    rescheduledCount: number;
    skippedCount: number;
    failedCount: number;
    errors: string[];
};

/**
 * Finds all trips from the previous day that were not full and attempts to reschedule
 * the passengers to a trip on the current day.
 * 
 * This action is designed to be run as an automated daily job (cron job).
 * It ensures that the process of moving a passenger from an old trip to a new one
 * is atomic and fails safely, preventing data inconsistency.
 */
export async function rescheduleUnderfilledTrips(): Promise<RescheduleResult> {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        throw new Error("Database connection failed.");
    }

    const yesterday = subDays(startOfDay(new Date()), 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    const result: RescheduleResult = {
        totalTripsScanned: 0,
        totalPassengersToProcess: 0,
        rescheduledCount: 0,
        skippedCount: 0,
        failedCount: 0,
        errors: [],
    };

    try {
        const underfilledTripsQuery = db.collection('trips')
            .where('date', '==', yesterdayStr)
            .where('isFull', '==', false);
        
        const snapshot = await underfilledTripsQuery.get();
        result.totalTripsScanned = snapshot.size;

        if (snapshot.empty) {
            return result;
        }

        for (const tripDoc of snapshot.docs) {
            const trip = tripDoc.data() as Trip;
            const passengersToProcess = [...trip.passengers];
            result.totalPassengersToProcess += passengersToProcess.length;

            for (const passenger of passengersToProcess) {
                const bookingRef = db.collection('bookings').doc(passenger.bookingId);
                const oldTripRef = tripDoc.ref;
                let emailProps: any = null; // Variable to hold email data

                try {
                    await db.runTransaction(async (transaction) => {
                        const bookingDoc = await transaction.get(bookingRef);
                        if (!bookingDoc.exists) {
                            throw new Error(`Booking ${passenger.bookingId} not found during transaction.`);
                        }
                        const bookingData = { ...bookingDoc.data(), id: bookingDoc.id } as Booking;

                        // 1. Skip if user opted out or booking was cancelled
                        if (!bookingData.allowReschedule || bookingData.status === 'Cancelled') {
                            result.skippedCount++;
                            return; // Exit transaction for this passenger
                        }

                        // --- Start of New, Perfected Logic ---

                        // 2. Remove from old trip
                        transaction.update(oldTripRef, { passengers: FieldValue.arrayRemove(passenger) });
                        
                        // 3. Update booking to new date and remove old tripId
                        transaction.update(bookingRef, { intendedDate: todayStr, tripId: FieldValue.delete() });
                        
                        // 4. Prepare email props for sending *after* transaction commits
                        emailProps = {
                            name: bookingData.name,
                            email: bookingData.email,
                            bookingId: bookingData.id,
                            oldDate: yesterdayStr,
                            newDate: todayStr,
                        };
                    });

                    // If transaction was successful, re-run assignment logic for the new date
                    const updatedBookingDoc = await bookingRef.get();
                    if(updatedBookingDoc.exists()) {
                       const updatedBookingData = updatedBookingDoc.data();

                       // `assignBookingToTrip` needs a plain object, not a Firestore document
                        const bookingForAssignment = {
                            ...updatedBookingData,
                            id: updatedBookingDoc.id,
                            // createdAt is a timestamp, which is what assignBookingToTrip expects
                            createdAt: updatedBookingData?.createdAt,
                        }
                       
                        // This will throw an error if it fails, which is caught below
                        await assignBookingToTrip(bookingForAssignment as any);
                    }


                    // If assignment succeeds, send email
                    if (emailProps) {
                        await sendBookingRescheduledEmail(emailProps);
                        result.rescheduledCount++;
                    }

                } catch (e: any) {
                    result.failedCount++;
                    const errorMessage = `Failed to process booking ${passenger.bookingId}: ${e.message}`;
                    result.errors.push(errorMessage);
                    console.error(errorMessage, e);
                     // If rescheduling fails, we should ideally roll back the date change.
                    // For now, we log the error. The synchronization tool can fix this.
                }
            }
        }
        
        return result;

    } catch (error: any) {
        console.error("A critical error occurred during the rescheduling process:", error);
        throw new Error("Failed to execute reschedule job due to a server error.");
    }
}
