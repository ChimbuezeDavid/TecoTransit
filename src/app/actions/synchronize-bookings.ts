
'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import type { Booking } from "@/lib/types";
import { assignBookingToTrip } from "./paystack";

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
    // These are bookings that were created but something went wrong during assignment,
    // or the pricing rules were incomplete at the time of booking.
    const unassignedBookingsQuery = db.collection('bookings')
        .where('tripId', '==', null);

    try {
        const snapshot = await unassignedBookingsQuery.get();
        const relevantDocs = snapshot.docs.filter(doc => {
            const status = doc.data().status;
            return status === 'Paid' || status === 'Pending';
        });

        if (relevantDocs.length === 0) {
            return result;
        }
        
        result.processed = relevantDocs.length;
        
        const bookingPromises = relevantDocs.map(async (doc) => {
            const booking = {
                id: doc.id,
                ...doc.data(),
                 // Convert Firestore timestamp to a JS Date object then back to string for consistency with type
                createdAt: doc.data().createdAt.toDate(),
            } as Booking;

            try {
                // We use a temporary object for assignment, because the original `createdAt` is a Timestamp
                const tempBookingForAssignment = {
                    ...booking,
                    createdAt: doc.data().createdAt,
                }
                
                await assignBookingToTrip(tempBookingForAssignment);
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
