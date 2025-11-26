
'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import type { Trip, Booking, BookingsQueryResult } from '@/lib/types';
import { collection, query, orderBy, getDocs as adminGetDocs, limit as adminLimit, startAfter as adminStartAfter, where } from 'firebase-admin/firestore';


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
        let q = query(collection(db, "bookings"), orderBy('createdAt', 'desc'));
        if (status) {
            q = query(q, where('status', '==', status));
        }

        const snapshot = await adminGetDocs(q);
        
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


export async function getBookingsPage({ limit = 25, startAfter, status }: { limit?: number, startAfter?: any, status?: Booking['status'] }): Promise<BookingsQueryResult> {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        return { bookings: [], lastVisible: null, error: 'Database connection failed.' };
    }

    try {
        let q = query(collection(db, "bookings"), orderBy('createdAt', 'desc'));

        if (status) {
            q = query(q, where('status', '==', status));
        }

        if (startAfter) {
            q = query(q, adminStartAfter(startAfter));
        }
        
        q = query(q, adminLimit(limit));

        const bookingsSnapshot = await adminGetDocs(q);
        
        const bookings = bookingsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as FirebaseFirestore.Timestamp).toMillis(),
            } as Booking;
        });

        const lastVisible = bookingsSnapshot.docs[bookingsSnapshot.docs.length - 1] || null;

        // We can just pass the snapshot back to the server action, no need to serialize.
        return { bookings, lastVisible, error: null };

    } catch (error: any) {
        console.error("API Error fetching bookings data:", error);
        return { bookings: [], lastVisible: null, error: 'An internal server error occurred while fetching bookings.' };
    }
}
