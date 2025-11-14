
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import type { Booking, Trip } from '@/lib/types';
import { startOfToday } from 'date-fns';
import { format } from 'date-fns';

export async function GET(request: Request) {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        return NextResponse.json({ error: 'Database connection failed.' }, { status: 500 });
    }

    try {
        // Stats queries
        const todayStr = format(startOfToday(), 'yyyy-MM-dd');
        const upcomingTripsQuery = db.collection('trips').where('date', '>=', todayStr).get();
        const pendingBookingsQuery = db.collection('bookings').where('status', '==', 'Pending').count().get();
        const confirmedBookingsQuery = db.collection('bookings').where('status', '==', 'Confirmed').count().get();
        
        // Recent activity queries
        const recentTripsQuery = db.collection('trips').where('date', '>=', todayStr).orderBy('date', 'asc').orderBy('vehicleIndex', 'asc').limit(5).get();
        const recentBookingsQuery = db.collection('bookings').orderBy('createdAt', 'desc').limit(5).get();

        const [
            upcomingTripsSnapshot,
            pendingBookingsSnapshot,
            confirmedBookingsSnapshot,
            recentTripsSnapshot,
            recentBookingsSnapshot
        ] = await Promise.all([
            upcomingTripsQuery,
            pendingBookingsQuery,
            confirmedBookingsQuery,
            recentTripsQuery,
            recentBookingsQuery
        ]);

        // Calculate stats
        const upcomingTrips = upcomingTripsSnapshot.docs.map(doc => doc.data() as Trip);
        const totalPassengers = upcomingTrips.reduce((sum, trip) => sum + trip.passengers.length, 0);

        const stats = {
            upcomingTrips: upcomingTripsSnapshot.size,
            totalPassengers: totalPassengers,
            pendingBookings: pendingBookingsSnapshot.data().count,
            confirmedBookings: confirmedBookingsSnapshot.data().count,
        };

        // Format recent activity
        const recentTrips = recentTripsSnapshot.docs.map(doc => doc.data() as Trip);
        const recentBookings = recentBookingsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as FirebaseFirestore.Timestamp).toMillis(),
            } as Booking;
        });

        const recentActivity = {
            trips: recentTrips,
            bookings: recentBookings,
        };
        
        return NextResponse.json({ stats, recentActivity });

    } catch (error: any) {
        console.error("API Error fetching dashboard summary:", error);
        return NextResponse.json({ error: 'An internal server error occurred while fetching dashboard summary.' }, { status: 500 });
    }
}
