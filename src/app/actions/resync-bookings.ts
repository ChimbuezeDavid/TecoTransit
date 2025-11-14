
'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { assignBookingToTrip } from "./paystack";
import type { Booking } from "@/lib/types";

export async function reSyncBookings() {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        throw new Error("Database connection failed.");
    }

    try {
        const bookingsToSyncQuery = db.collection('bookings').where('tripId', '==', null);
        const snapshot = await bookingsToSyncQuery.get();

        if (snapshot.empty) {
            return { successCount: 0, errorCount: 0, message: "No bookings to sync." };
        }

        let successCount = 0;
        let errorCount = 0;

        const assignmentPromises = snapshot.docs.map(async (doc) => {
            const bookingData = { id: doc.id, ...doc.data() } as Omit<Booking, 'createdAt'> & { createdAt: FirebaseFirestore.Timestamp };

             // Convert Timestamp to a format assignBookingToTrip can handle if needed,
            // but our function is robust enough. We just need to satisfy the type.
            const bookingForAssignment = {
                ...bookingData,
                 createdAt: bookingData.createdAt.toMillis()
            };

            try {
                await assignBookingToTrip(bookingForAssignment);
                successCount++;
            } catch (error) {
                console.error(`Failed to assign booking ${doc.id}:`, error);
                errorCount++;
            }
        });

        await Promise.all(assignmentPromises);

        return { successCount, errorCount };

    } catch (error: any) {
        console.error("An error occurred during the re-sync process:", error);
        throw new Error("Failed to re-sync bookings due to a server error.");
    }
}
