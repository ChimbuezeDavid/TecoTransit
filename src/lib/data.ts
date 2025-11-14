
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import type { PriceRule, Trip, Booking } from '@/lib/types';

export async function getDashboardData(): Promise<{
    trips: Trip[];
    bookings: Booking[];
    error: string | null;
}> {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        return { trips: [], bookings: [], error: 'Database connection failed.' };
    }

    try {
        const tripsQuery = db.collection("trips").orderBy('date', 'asc').orderBy('vehicleIndex', 'asc');
        const bookingsQuery = db.collection("bookings").orderBy('createdAt', 'desc');
        
        const [tripsSnapshot, bookingsSnapshot] = await Promise.all([
            tripsQuery.get(),
            bookingsQuery.get()
        ]);
        
        const trips = tripsSnapshot.docs.map(doc => doc.data() as Trip);
        const bookings = bookingsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as FirebaseFirestore.Timestamp).toMillis(),
            } as Booking;
        });

        return { trips, bookings, error: null };

    } catch (error: any) {
        console.error("API Error fetching dashboard data:", error);
        return { trips: [], bookings: [], error: 'An internal server error occurred.' };
    }
}

    