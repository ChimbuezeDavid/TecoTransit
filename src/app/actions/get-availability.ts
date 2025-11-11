'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { vehicleOptions } from "@/lib/constants";

/**
 * Calculates the number of available seats for a specific route, irrespective of date.
 * This is the single source of truth for seat availability.
 * @param priceRuleId - The unique identifier for the price rule (e.g., "abuad_ajah-lagos_4-seater-sienna").
 * @returns The number of seats currently available for this route.
 */
export const getAvailableSeats = async (priceRuleId: string): Promise<number> => {
    try {
        if (!priceRuleId) {
            return 0;
        }

        const priceRuleRef = doc(db, 'prices', priceRuleId);
        const priceRuleSnap = await getDoc(priceRuleRef);

        if (!priceRuleSnap.exists()) {
            console.warn(`Price rule ${priceRuleId} does not exist.`);
            return 0;
        }

        const priceRule = priceRuleSnap.data();

        // The total number of seats is pre-calculated and stored in the price rule.
        const totalSeats = priceRule.seatsAvailable || 0;
        
        if (totalSeats === 0) return 0;

        // Count all bookings for this route that are 'Paid' or 'Confirmed'
        const bookingsQuery = query(
            collection(db, 'bookings'),
            where('pickup', '==', priceRule.pickup),
            where('destination', '==', priceRule.destination),
            where('vehicleType', '==', priceRule.vehicleType),
            where('status', 'in', ['Paid', 'Confirmed'])
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookedSeats = bookingsSnapshot.size;
        
        // Also count temporary reservations for this route
        const reservationsQuery = query(
            collection(db, 'reservations'),
            where('priceRuleId', '==', priceRuleId)
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
