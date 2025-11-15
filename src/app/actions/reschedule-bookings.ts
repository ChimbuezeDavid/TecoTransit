'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { format, subDays, startOfDay } from 'date-fns';
import { assignBookingToTrip } from "./paystack";
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

                try {
                    await db.runTransaction(async (transaction) => {
                        const bookingDoc = await transaction.get(bookingRef);
                        if (!bookingDoc.exists) {
                            throw new Error(`Booking ${passenger.bookingId} not found during transaction.`);
                        }
                        const bookingData = bookingDoc.data() as Booking;

                        // 1. Skip if user opted out or booking was cancelled
                        if (!bookingData.allowReschedule || bookingData.status === 'Cancelled') {
                            result.skippedCount++;
                            return; // Exit transaction for this passenger
                        }

                        // --- Start of New, Perfected Logic ---

                        // 2. Find a new trip for today
                        const priceRuleId = `${bookingData.pickup}_${bookingData.destination}_${bookingData.vehicleType}`.toLowerCase().replace(/\s+/g, '-');
                        const vehicleKey = Object.keys(vehicleOptions).find(k => vehicleOptions[k as keyof typeof vehicleOptions].name === bookingData.vehicleType) as keyof typeof vehicleOptions | undefined;
                        if (!vehicleKey) throw new Error(`Invalid vehicle type: ${bookingData.vehicleType}`);
                        const capacity = vehicleOptions[vehicleKey].capacity;
                        
                        const newTripsQuery = db.collection('trips')
                            .where('priceRuleId', '==', priceRuleId)
                            .where('date', '==', todayStr);
                        
                        const newTripsSnapshot = await transaction.get(newTripsQuery);

                        let newTripRef: FirebaseFirestore.DocumentReference | null = null;
                        let newTripData: Trip | null = null;

                        // a. Look for an existing trip with space
                        for (const doc of newTripsSnapshot.docs) {
                            const trip = doc.data() as Trip;
                            if (trip.passengers.length < trip.capacity) {
                                newTripRef = doc.ref;
                                newTripData = trip;
                                break;
                            }
                        }

                        // b. If no existing trip, check if a new one can be created
                        if (!newTripRef) {
                            const priceRuleSnap = await transaction.get(db.doc(`prices/${priceRuleId}`));
                            if (priceRuleSnap.exists && newTripsSnapshot.size < (priceRuleSnap.data()?.vehicleCount || 0)) {
                                const newVehicleIndex = newTripsSnapshot.size + 1;
                                const newTripId = `${priceRuleId}_${todayStr}_${newVehicleIndex}`;
                                newTripRef = db.collection('trips').doc(newTripId);
                                newTripData = {
                                    id: newTripId,
                                    priceRuleId,
                                    pickup: bookingData.pickup,
                                    destination: bookingData.destination,
                                    vehicleType: bookingData.vehicleType,
                                    date: todayStr,
                                    vehicleIndex: newVehicleIndex,
                                    capacity: capacity,
                                    passengers: [], // Will add the passenger later in this transaction
                                    isFull: false,
                                };
                            }
                        }

                        // c. If no new trip could be found or created, abort the transaction
                        if (!newTripRef || !newTripData) {
                            throw new Error(`No available trip slot found for booking ${bookingData.id} on ${todayStr}.`);
                        }

                        const newPassenger: Passenger = { bookingId: bookingData.id, name: bookingData.name, phone: bookingData.phone };
                        const updatedPassengers = [...newTripData.passengers, newPassenger];

                        // 3. Atomically perform all writes
                        // Remove from old trip
                        transaction.update(oldTripRef, { passengers: FieldValue.arrayRemove(passenger) });
                        // Add to new trip
                        transaction.set(newTripRef, { 
                            ...newTripData,
                            passengers: updatedPassengers,
                            isFull: updatedPassengers.length >= newTripData.capacity
                        }, { merge: true });
                        // Update booking
                        transaction.update(bookingRef, { intendedDate: todayStr, tripId: newTripRef.id });

                        // --- End of Perfected Logic ---
                        
                        // 4. Send email notification *after* transaction commits successfully
                        await sendBookingRescheduledEmail({
                            name: bookingData.name,
                            email: bookingData.email,
                            bookingId: bookingData.id,
                            oldDate: yesterdayStr,
                            newDate: todayStr,
                        });

                        result.rescheduledCount++;
                    });
                } catch (e: any) {
                    result.failedCount++;
                    const errorMessage = `Failed to process booking ${passenger.bookingId}: ${e.message}`;
                    result.errors.push(errorMessage);
                    console.error(errorMessage, e);
                }
            }
        }
        
        return result;

    } catch (error: any) {
        console.error("A critical error occurred during the rescheduling process:", error);
        throw new Error("Failed to execute reschedule job due to a server error.");
    }
}
