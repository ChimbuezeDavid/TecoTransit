'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { FieldValue } from 'firebase-admin/firestore';

type ClearTripsResult = {
    success: boolean;
    clearedTripsCount: number;
    deallocatedBookingsCount: number;
    error?: string;
};

/**
 * Deletes all trip documents and removes the `tripId` from all associated bookings.
 * This effectively "deallocates" all synchronized bookings and resets the trip manifests.
 * The entire operation is performed within batches to ensure atomicity and handle large datasets.
 */
export async function clearAllTrips(): Promise<ClearTripsResult> {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        throw new Error("Database connection failed.");
    }

    try {
        const tripsRef = db.collection('trips');
        const tripsSnapshot = await tripsRef.get();

        if (tripsSnapshot.empty) {
            return {
                success: true,
                clearedTripsCount: 0,
                deallocatedBookingsCount: 0,
            };
        }

        const allBookingIds = new Set<string>();
        tripsSnapshot.docs.forEach(doc => {
            const trip = doc.data();
            if (trip.passengers && Array.isArray(trip.passengers)) {
                trip.passengers.forEach((passenger: { bookingId: string }) => {
                    if (passenger.bookingId) {
                        allBookingIds.add(passenger.bookingId);
                    }
                });
            }
        });
        
        // Firestore batches are limited to 500 operations.
        // We'll process in chunks to stay within limits.
        const batchArray: FirebaseFirestore.WriteBatch[] = [];
        let currentBatch = db.batch();
        let currentBatchSize = 0;

        // Add trip deletions to batches
        for (const doc of tripsSnapshot.docs) {
            currentBatch.delete(doc.ref);
            currentBatchSize++;
            if (currentBatchSize === 500) {
                batchArray.push(currentBatch);
                currentBatch = db.batch();
                currentBatchSize = 0;
            }
        }
        
        // Add booking updates to batches
        for (const bookingId of allBookingIds) {
            const bookingRef = db.collection('bookings').doc(bookingId);
            currentBatch.update(bookingRef, { tripId: FieldValue.delete() });
            currentBatchSize++;
            if (currentBatchSize === 500) {
                batchArray.push(currentBatch);
                currentBatch = db.batch();
                currentBatchSize = 0;
            }
        }

        // Add the last batch if it has operations
        if (currentBatchSize > 0) {
            batchArray.push(currentBatch);
        }

        // Commit all batches
        await Promise.all(batchArray.map(batch => batch.commit()));

        return {
            success: true,
            clearedTripsCount: tripsSnapshot.size,
            deallocatedBookingsCount: allBookingIds.size,
        };

    } catch (error: any) {
        console.error("An error occurred during trip cleanup:", error);
        return { 
            success: false, 
            clearedTripsCount: 0,
            deallocatedBookingsCount: 0,
            error: "Failed to clear trips and deallocate bookings." 
        };
    }
}
