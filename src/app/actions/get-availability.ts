'use server';

import { collection, query, where, getDocs, Firestore } from "firebase/firestore";
import { vehicleOptions } from '@/lib/constants';
import { db } from "@/lib/firebase";

export const getAvailableSeats = async (
    pickup: string, 
    destination: string, 
    vehicleType: string, 
    date: string
): Promise<number> => {
    try {
        const pricesQuery = query(
            collection(db, 'prices'),
            where('pickup', '==', pickup),
            where('destination', '==', destination),
            where('vehicleType', '==', vehicleType)
        );

        const bookingsQuery = query(
            collection(db, 'bookings'),
            where('pickup', '==', pickup),
            where('destination', '==', destination),
            where('vehicleType', '==', vehicleType),
            where('intendedDate', '==', date),
            where('status', 'in', ['Paid', 'Confirmed'])
        );
        
        const [pricingSnapshot, bookingsSnapshot] = await Promise.all([
            getDocs(pricesQuery),
            getDocs(bookingsQuery),
        ]);

        if (pricingSnapshot.empty) {
            console.error("No pricing rule found for this route.");
            return 0; // No rule, no seats.
        }

        const priceRule = pricingSnapshot.docs[0].data();
        const vehicleKey = Object.keys(vehicleOptions).find(key => vehicleOptions[key as keyof typeof vehicleOptions].name === priceRule.vehicleType) as keyof typeof vehicleOptions | undefined;

        if (!vehicleKey) {
            console.error(`Invalid vehicle type found in price rule: ${priceRule.vehicleType}`);
            return 0;
        }

        const vehicleCapacityMap = { '4-seater': 4, '5-seater': 5, '7-seater': 7 };
        const seatsPerVehicle = vehicleCapacityMap[vehicleKey] || 0;
        const totalSeats = (priceRule.vehicleCount || 0) * seatsPerVehicle;
        
        const bookedSeats = bookingsSnapshot.size;

        return totalSeats - bookedSeats;

    } catch (error) {
        console.error("Error getting available seats:", error);
        return 0; // Return 0 on any error to be safe.
    }
};
