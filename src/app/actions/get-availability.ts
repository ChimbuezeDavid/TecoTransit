
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

export const getAvailableSeats = async (priceRuleId: string, date: string): Promise<number> => {
    try {
        if (!priceRuleId || !date) {
            return 0;
        }

        const priceRuleRef = doc(db, 'prices', priceRuleId);
        const priceRuleSnap = await getDoc(priceRuleRef);

        if (!priceRuleSnap.exists()) {
            // This route configuration does not exist.
            return 0;
        }

        const priceRule = priceRuleSnap.data();
        const totalSeats = priceRule.seatsAvailable || 0;

        // Count bookings for this specific route and date that are 'Paid' or 'Confirmed'
        const bookingsQuery = query(
            collection(db, 'bookings'),
            where('pickup', '==', priceRule.pickup),
            where('destination', '==', priceRule.destination),
            where('vehicleType', '==', priceRule.vehicleType),
            where('intendedDate', '==', date),
            where('status', 'in', ['Paid', 'Confirmed'])
        );

        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookedSeats = bookingsSnapshot.size;
        
        // Count temporary reservations for this route and date
        const reservationsQuery = query(
            collection(db, 'reservations'),
            where('priceRuleId', '==', priceRuleId),
            where('date', '==', date)
        );
        const reservationsSnapshot = await getDocs(reservationsQuery);
        const reservedSeats = reservationsSnapshot.size;

        const availableSeats = totalSeats - bookedSeats - reservedSeats;

        return availableSeats > 0 ? availableSeats : 0;

    } catch (error) {
        console.error("Error getting available seats:", error);
        // In case of an error, it's safer to report no seats are available.
        return 0;
    }
};
