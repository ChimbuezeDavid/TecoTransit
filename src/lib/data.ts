
'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import type { Trip, Booking, BookingsQueryResult } from '@/lib/types';
import { Query } from 'firebase-admin/firestore';


export async function getAllTrips(): Promise<{ trips: Trip[]; error: string | null; }> {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        return { trips: [], error: 'Database connection failed.' };
    }

    try {
        const tripsQuery = db.collection("trips").orderBy('date', 'asc').orderBy('vehicleIndex', 'asc');
        const tripsSnapshot = await tripsQuery.get();
        const trips = tripsSnapshot.docs.map(doc => doc.data() as Trip);

        return { trips, error: null };

    } catch (error: any) {
        console.error("API Error fetching trips data:", error);
        return { trips: [], error: 'An internal server error occurred while fetching trips.' };
    }
}

export async function getAllBookings(status?: Booking['status']): Promise<{ bookings: Booking[], error: string | null }> {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        return { bookings: [], error: 'Database connection failed.' };
    }
    
    try {
        let q: Query = db.collection("bookings");
        
        if (status) {
            q = q.where('status', '==', status);
            // When filtering by status, we must order by status first for the composite index to work
            q = q.orderBy('status', 'asc');
        }
        
        // Always order by createdAt desc as the primary sort order
        q = q.orderBy('createdAt', 'desc');

        const snapshot = await q.get();
        
        const bookings = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as FirebaseFirestore.Timestamp).toMillis(),
            } as Booking;
        });

        return { bookings, error: null };

    } catch (e: any) {
        console.error("API Error fetching all bookings:", e);
        return { bookings: [], error: 'Failed to fetch all bookings.' };
    }
}


export async function getBookingsPage({ limit = 25, startAfter, status }: { limit?: number, startAfter?: { createdAt: number, id: string } | null, status?: Booking['status'] }): Promise<BookingsQueryResult> {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        return { bookings: [], error: 'Database connection failed.' };
    }

    try {
        let q: Query = db.collection("bookings");

        if (status) {
            q = q.where('status', '==', status);
            // Add the first orderBy clause on the field being filtered (status)
            q = q.orderBy('status', 'asc');
        }
        
        // The primary sort order must always be consistent.
        q = q.orderBy('createdAt', 'desc');


        if (startAfter) {
            const startAfterDoc = await db.collection('bookings').doc(startAfter.id).get();
            if (!startAfterDoc.exists) {
                console.warn(`Pagination cursor document with ID ${startAfter.id} not found.`);
                return { bookings: [], error: 'Pagination cursor is invalid.' };
            }
            q = q.startAfter(startAfterDoc);
        }
        
        q = q.limit(limit);

        const bookingsSnapshot = await q.get();
        
        const bookings = bookingsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as FirebaseFirestore.Timestamp).toMillis(),
            } as Booking;
        });

        return { bookings, error: null };

    } catch (error: any) {
        console.error("API Error fetching bookings data:", error);
        return { bookings: [], error: 'An internal server error occurred while fetching bookings.' };
    }
}

    