'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";

/**
 * Calculates the number of available seats for a specific route, irrespective of date.
 * This is the single source of truth for seat availability.
 * @param priceRuleId - The unique identifier for the price rule (e.g., "abuad_ajah-lagos_4-seater-sienna").
 * @returns The number of seats currently available for this route.
 */
export const getAvailableSeats = async (priceRuleId: string): Promise<number> => {
    try {
        const db = getFirebaseAdmin()?.firestore();
        if (!db) {
            console.error("Could not connect to the admin database.");
            return 0;
        }

        if (!priceRuleId) {
            return 0;
        }

        const priceRuleRef = db.doc(`prices/${priceRuleId}`);
        const priceRuleSnap = await priceRuleRef.get();

        if (!priceRuleSnap.exists) {
            console.warn(`Price rule ${priceRuleId} does not exist.`);
            return 0;
        }

        const priceRule = priceRuleSnap.data();
        if (!priceRule) {
             return 0;
        }

        // The total number of seats is pre-calculated and stored in the price rule.
        const totalCapacity = (priceRule.vehicleCount || 0) * (priceRule.seatsPerVehicle || 0);
        
        if (totalCapacity === 0) return 0;

        // Count all bookings for this route that are 'Paid' or 'Confirmed'
        const bookingsQuery = db.collection('bookings')
            .where('pickup', '==', priceRule.pickup)
            .where('destination', '==', priceRule.destination)
            .where('vehicleType', '==', priceRule.vehicleType)
            .where('status', 'in', ['Paid', 'Confirmed']);
        
        const bookingsSnapshot = await bookingsQuery.get();
        const bookedSeats = bookingsSnapshot.size;
        
        // Also count temporary reservations for this route
        const reservationsQuery = db.collection('reservations')
            .where('priceRuleId', '==', priceRuleId);

        const reservationsSnapshot = await reservationsQuery.get();
        const reservedSeats = reservationsSnapshot.size;

        const availableSeats = totalCapacity - bookedSeats - reservedSeats;

        return availableSeats > 0 ? availableSeats : 0;

    } catch (error) {
        console.error("Error getting available seats:", error);
        // In case of an error, it's safer to report no seats are available.
        return 0;
    }
};