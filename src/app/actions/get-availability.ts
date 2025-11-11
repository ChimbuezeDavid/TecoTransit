
'use server';

import { collection, query, where, getDocs } from "firebase/firestore";
import { vehicleOptions } from '@/lib/constants';
import { db } from "@/lib/firebase"; // CORRECT: Use the client SDK for server actions.

export const getAvailableSeats = async (
    pickup: string, 
    destination: string, 
    vehicleType: string, 
    date: string
): Promise<number> => {
    try {
        // Step 1: Find the pricing rule to determine total capacity.
        const pricesQuery = query(
            collection(db, 'prices'),
            where('pickup', '==', pickup),
            where('destination', '==', destination),
            where('vehicleType', '==', vehicleType)
        );

        const pricingSnapshot = await getDocs(pricesQuery);

        if (pricingSnapshot.empty) {
            // If no pricing rule exists for this combination, no seats are available.
            return 0; 
        }

        const priceRule = pricingSnapshot.docs[0].data();
        
        // Find the vehicle key (e.g., '4-seater') from the full name (e.g., '4-Seater Sienna').
        const vehicleKey = Object.keys(vehicleOptions).find(key => 
            vehicleOptions[key as keyof typeof vehicleOptions].name === priceRule.vehicleType
        ) as keyof typeof vehicleOptions | undefined;
        
        if (!vehicleKey) {
            console.error(`Invalid vehicle type in price rule: ${priceRule.vehicleType}`);
            return 0;
        }
        
        const vehicleCapacityMap = { '4-seater': 4, '5-seater': 5, '7-seater': 7 };
        const seatsPerVehicle = vehicleCapacityMap[vehicleKey] || 0;
        
        // Use ?? to default to 0 if vehicleCount is missing.
        const totalSeats = (priceRule.vehicleCount ?? 0) * seatsPerVehicle;

        // Step 2: Find all paid or confirmed bookings for that specific date to count booked seats.
        const bookingsQuery = query(
            collection(db, 'bookings'),
            where('pickup', '==', pickup),
            where('destination', '==', destination),
            where('vehicleType', '==', vehicleType),
            where('intendedDate', '==', date),
            where('status', 'in', ['Paid', 'Confirmed'])
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookedSeats = bookingsSnapshot.size;

        // Step 3: Calculate and return available seats.
        const available = totalSeats - bookedSeats;
        return available < 0 ? 0 : available;

    } catch (error) {
        console.error("Error getting available seats:", error);
        return 0; // Return 0 on any error to be safe.
    }
};
