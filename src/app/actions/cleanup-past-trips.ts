'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { subDays, format } from 'date-fns';

type CleanupResult = {
    success: boolean;
    deletedCount: number;
    error?: string;
};

/**
 * Deletes all trip documents that are older than 7 days.
 * This is designed to be run as a daily cron job to keep the trips collection clean.
 */
export async function cleanupPastTrips(): Promise<CleanupResult> {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        throw new Error("Database connection failed.");
    }

    try {
        // Calculate the date 7 days ago
        const cutoffDate = subDays(new Date(), 7);
        const cutoffDateStr = format(cutoffDate, 'yyyy-MM-dd');

        const tripsRef = db.collection('trips');
        // Query for trips with a date less than the cutoff date
        const oldTripsQuery = tripsRef.where('date', '<', cutoffDateStr);
        
        const snapshot = await oldTripsQuery.get();

        if (snapshot.empty) {
            return {
                success: true,
                deletedCount: 0,
            };
        }

        // Firestore batches are limited to 500 operations.
        // We'll process in chunks to stay within limits.
        const batchArray: FirebaseFirestore.WriteBatch[] = [];
        let currentBatch = db.batch();
        let currentBatchSize = 0;

        for (const doc of snapshot.docs) {
            currentBatch.delete(doc.ref);
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
            deletedCount: snapshot.size,
        };

    } catch (error: any) {
        console.error("An error occurred during past trips cleanup:", error);
        return { 
            success: false, 
            deletedCount: 0,
            error: "Failed to clean up past trips." 
        };
    }
}
