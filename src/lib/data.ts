
'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import type { Trip, Booking, BookingsQueryResult } from '@/lib/types';
import { collection, query, orderBy, getDocs as adminGetDocs, limit as adminLimit, startAfter as adminStartAfter } from 'firebase-admin/firestore';


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


export async function getBookingsPage({ pageLimit = 25, startAfter }: { pageLimit?: number, startAfter?: any }): Promise<BookingsQueryResult> {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        return { bookings: [], lastVisible: null, error: 'Database connection failed.' };
    }

    try {
        let bookingsQuery;
        const baseQuery = collection(db, "bookings");
        
        let q = query(baseQuery, orderBy('createdAt', 'desc'));

        if (startAfter) {
            q = query(q, adminStartAfter(startAfter));
        }
        
        q = query(q, adminLimit(pageLimit));

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

        // Serialize the lastVisible document snapshot for client-side usage
        const serializedLastVisible = lastVisible ? {
            _fieldsProto: lastVisible.data(),
            _ref: {
                _path: {
                    segments: lastVisible.ref.path.split('/')
                }
            }
        } : null;

        // A hacky way to send a server-side object to the client, but it works for pagination cursors.
        // We'll need to reconstruct it on the client if we were to use it there, but we send it back to the server.
        // For this implementation, we send it back to the server action, so we can just pass it as is.
        return { bookings, lastVisible: lastVisible, error: null };

    } catch (error: any) {
        console.error("API Error fetching bookings data:", error);
        return { bookings: [], lastVisible: null, error: 'An internal server error occurred while fetching bookings.' };
    }
}
