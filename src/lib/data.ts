
'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import type { Trip, Booking, BookingsQueryResult } from '@/lib/types';
import { collection, query as clientQuery, orderBy as clientOrderBy, getDocs as clientGetDocs, where as clientWhere, limit as clientLimit, startAfter as clientStartAfter } from 'firebase/firestore';
import { Query, Timestamp } from 'firebase-admin/firestore';


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
        }
        
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
        }
        
        q = q.orderBy('createdAt', 'desc');


        if (startAfter) {
            const startAfterTimestamp = Timestamp.fromMillis(startAfter.createdAt);
            const startAfterDoc = await db.collection('bookings').doc(startAfter.id).get();
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

    