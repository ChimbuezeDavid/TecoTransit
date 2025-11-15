
'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import type { Trip } from "@/lib/types";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Removes passengers from trips if their booking ID is in the provided list.
 * This is used to maintain data consistency after bookings are deleted.
 * @param deletedBookingIds - An array of booking IDs that have been deleted.
 */
export async function cleanupTrips(deletedBookingIds: string[]) {
    if (!deletedBookingIds || deletedBookingIds.length === 0) {
        return { success: true, message: "No booking IDs provided for cleanup." };
    }

    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        throw new Error("Database connection failed.");
    }
    
    // Create a Set for efficient lookup
    const deletedIdsSet = new Set(deletedBookingIds);

    try {
        const tripsRef = db.collection('trips');
        const tripsSnapshot = await tripsRef.get();

        if (tripsSnapshot.empty) {
            return { success: true, message: "No trips to clean." };
        }

        const batch = db.batch();
        let updatedTripsCount = 0;

        tripsSnapshot.forEach(doc => {
            const trip = doc.data() as Trip;
            const initialPassengerCount = trip.passengers.length;

            // Filter out the passengers whose booking has been deleted
            const updatedPassengers = trip.passengers.filter(
                passenger => !deletedIdsSet.has(passenger.bookingId)
            );

            // If the passenger list has changed, update the trip
            if (updatedPassengers.length < initialPassengerCount) {
                updatedTripsCount++;
                const isFull = updatedPassengers.length >= trip.capacity;
                batch.update(doc.ref, { 
                    passengers: updatedPassengers,
                    isFull: isFull 
                });
            }
        });

        if (updatedTripsCount > 0) {
            await batch.commit();
        }

        return { success: true, updatedTrips: updatedTripsCount };

    } catch (error: any) {
        console.error("An error occurred during trip cleanup:", error);
        // We don't throw here to prevent the UI from breaking, but we log the error.
        // The primary delete operation succeeded, this is a secondary cleanup.
        return { success: false, error: "Failed to clean up trips." };
    }
}

    