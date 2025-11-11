
'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { vehicleOptions } from '@/lib/constants';

interface GetAvailableSeatsArgs {
    pickup: string;
    destination: string;
    vehicleType: string;
    date: string; // 'yyyy-MM-dd'
}

export async function getAvailableSeats({
    pickup,
    destination,
    vehicleType,
    date,
}: GetAvailableSeatsArgs): Promise<number> {
    
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        console.error("Could not connect to the database to check seats.");
        // If we can't connect, we can't guarantee a seat.
        return 0;
    }

    try {
        // Query for the specific pricing/fleet rule
        const pricingQuery = db.collection('prices')
            .where('pickup', '==', pickup)
            .where('destination', '==', destination)
            .where('vehicleType', '==', vehicleType);

        // Query for bookings that are already 'Paid' or 'Confirmed' for that specific trip on that date
        const bookingsQuery = db.collection('bookings')
            .where('pickup', '==', pickup)
            .where('destination', '==', destination)
            .where('vehicleType', '==', vehicleType)
            .where('intendedDate', '==', date) // Check against the intended date
            .where('status', 'in', ['Paid', 'Confirmed']);

        const [pricingSnapshot, bookingsSnapshot] = await Promise.all([
            pricingQuery.get(),
            bookingsQuery.get(),
        ]);

        if (pricingSnapshot.empty) {
            console.log(`No price/fleet rule found for trip.`);
            return 0; // No rule means no availability
        }
        
        const priceRule = pricingSnapshot.docs[0].data();
        
        const vehicleKey = Object.keys(vehicleOptions).find(key => vehicleOptions[key as keyof typeof vehicleOptions].name === priceRule.vehicleType) as keyof typeof vehicleOptions | undefined;

        if (!vehicleKey) {
            console.error(`Invalid vehicle type found in price rule: ${priceRule.vehicleType}`);
            return 0;
        }

        const vehicleCapacityMap: Record<keyof typeof vehicleOptions, number> = { 
            '4-seater': 4, 
            '5-seater': 5, 
            '7-seater': 7 
        };
        const vehicleCapacity = vehicleCapacityMap[vehicleKey] || 0;
        
        if (vehicleCapacity === 0) {
            console.error(`Could not determine capacity for vehicle type: ${priceRule.vehicleType}`);
            return 0;
        }

        // Calculate total available seats for this trip based on admin settings
        const totalSeats = (priceRule.vehicleCount ?? 0) * vehicleCapacity;
        
        // Count the number of seats already booked
        const bookedSeats = bookingsSnapshot.size;

        const available = totalSeats - bookedSeats;
        return available > 0 ? available : 0;

    } catch (error) {
        console.error("Error fetching available seats:", error);
        return 0; // Return 0 if there's an error, assuming unavailability.
    }
}
