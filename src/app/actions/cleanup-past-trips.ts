
'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { startOfToday, format } from 'date-fns';

type CleanupResult = {
    success: boolean;
    archivedCount: number;
    error?: string;
};

/**
 * Finds all trip documents from past dates, archives them to the 'archivedTrips'
 * collection, and then deletes them from the main 'trips' collection.
 * This is designed to be run as a daily cron job.
 */
export async function cleanupPastTrips(): Promise<CleanupResult> {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        throw new Error("Database connection failed.");
    }

    try {
        // Use the start of today to ensure we only get trips from previous days.
        const cutoffDate = startOfToday();
        const cutoffDateStr = format(cutoffDate, 'yyyy-MM-dd');

        const tripsRef = db.collection('trips');
        // Query for all trips with a 'date' property strictly less than today's date string.
        const oldTripsQuery = tripsRef.where('date', '<', cutoffDateStr);
        
        const snapshot = await oldTripsQuery.get();

        if (snapshot.empty) {
            return {
                success: true,
                archivedCount: 0,
            };
        }

        const archiveRef = db.collection('archivedTrips');
        const batchArray: FirebaseFirestore.WriteBatch[] = [];
        let currentBatch = db.batch();
        let currentBatchSize = 0;

        for (const doc of snapshot.docs) {
            const tripData = doc.data();
            // Copy to archive collection (using the same ID)
            const archiveDocRef = archiveRef.doc(doc.id);
            currentBatch.set(archiveDocRef, tripData);
            
            // Delete from original trips collection
            currentBatch.delete(doc.ref);
            
            // Each doc involves 2 operations, so we check for 250 docs to stay under 500 operations per batch
            currentBatchSize++;
            if (currentBatchSize >= 250) {
                batchArray.push(currentBatch);
                currentBatch = db.batch();
                currentBatchSize = 0;
            }
        }
        
        if (currentBatchSize > 0) {
            batchArray.push(currentBatch);
        }

        await Promise.all(batchArray.map(batch => batch.commit()));

        return {
            success: true,
            archivedCount: snapshot.size,
        };

    } catch (error: any) {
        console.error("An error occurred during past trips cleanup and archival:", error);
        return { 
            success: false, 
            archivedCount: 0,
            error: "Failed to clean up and archive past trips." 
        };
    }
}
