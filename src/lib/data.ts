'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import type { Trip, Booking } from '@/lib/types';

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


export async function getAllBookings(): Promise<{ bookings: Booking[]; error: string | null; }> {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        return { bookings: [], error: 'Database connection failed.' };
    }

    try {
        const bookingsQuery = db.collection("bookings").orderBy('createdAt', 'desc');
        const bookingsSnapshot = await bookingsQuery.get();
        
        const bookings = bookingsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Ensure timestamp is consistently handled as milliseconds for the client
                createdAt: (data.createdAt as FirebaseFirestore.Timestamp).toMillis(),
            } as Booking;
        });

        return { bookings, error: null };

    } catch (error: any) {
        console.error("API Error fetching bookings data:", error);
        return { bookings: [], error: 'An internal server error occurred while fetching bookings.' };
    }
}
