
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
        // Correctly query for documents where the 'tripId' field does NOT exist.
        // In Firestore, you can't query for `null` values in this way.
        // A better approach is to get all bookings and filter, but for a moderate scale,
        // we can try to get all bookings and check for tripId's existence.
        // A more scalable solution would need an 'isAssigned' boolean field.
        // For now, let's fetch all and filter in memory as it's safer.
        const allBookingsSnapshot = await db.collection('bookings').get();
        
        const bookingsToSync = allBookingsSnapshot.docs.filter(doc => !doc.data().tripId);

        if (bookingsToSync.length === 0) {
            return { successCount: 0, errorCount: 0, message: "No unassigned bookings found to sync." };
        }

        let successCount = 0;
        let errorCount = 0;

        const assignmentPromises = bookingsToSync.map(async (doc) => {
            const bookingData = { id: doc.id, ...doc.data() } as Omit<Booking, 'createdAt'> & { createdAt: FirebaseFirestore.Timestamp };
            
            // The assignBookingToTrip function is robust enough to handle the data as-is
            // We just need to ensure the types are satisfied.
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
