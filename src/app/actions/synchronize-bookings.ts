'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import type { Booking } from "@/lib/types";
import { assignBookingToTrip } from "./create-booking-and-assign-trip";

type SyncResult = {
    processed: number;
    succeeded: number;
    failed: number;
    errors: string[];
};

export async function synchronizeAndCreateTrips(): Promise<SyncResult> {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        throw new Error("Database connection failed.");
    }

    const result: SyncResult = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        errors: [],
    };

    // Find all 'Paid' or 'Pending' bookings that are missing a tripId.
    // Firestore queries for non-existent fields are not direct.
    // Instead, we get all relevant bookings and filter in memory.
    // This is less efficient for very large datasets, but more reliable.
    const bookingsQuery = db.collection('bookings')
        .where('status', 'in', ['Paid', 'Pending']);
        

    try {
        const snapshot = await bookingsQuery.get();
        
        // Filter for documents that do NOT have the tripId field.
        const unassignedDocs = snapshot.docs.filter(doc => !doc.data().tripId);

        if (unassignedDocs.length === 0) {
            return { ...result, processed: 0, succeeded: 0 };
        }
        
        result.processed = unassignedDocs.length;
        
        const bookingPromises = unassignedDocs.map(async (doc) => {
            const booking = {
                id: doc.id,
                ...doc.data(),
                 // `assignBookingToTrip` expects createdAt to be a Timestamp or compatible object
                createdAt: doc.data().createdAt,
            } as any;

            try {
                await assignBookingToTrip(booking);
                return { success: true, bookingId: booking.id };
            } catch (error: any) {
                console.error(`Failed to assign trip for booking ${booking.id}:`, error.message);
                return { success: false, bookingId: booking.id, error: error.message };
            }
        });

        const outcomes = await Promise.all(bookingPromises);

        outcomes.forEach(outcome => {
            if (outcome.success) {
                result.succeeded++;
            } else {
                result.failed++;
                result.errors.push(`Booking ${outcome.bookingId}: ${outcome.error}`);
            }
        });

        return result;

    } catch (error: any) {
        console.error("A critical error occurred during the synchronization process:", error);
        throw new Error("Failed to execute synchronization job due to a server error.");
    }
}
