
'use client';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { vehicleOptions } from './constants';

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
    try {
        const pricingQuery = query(
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
            where('confirmedDate', '==', date),
            where('status', 'in', ['Paid', 'Confirmed'])
        );

        const [pricingSnapshot, bookingsSnapshot] = await Promise.all([
            getDocs(pricingQuery),
            getDocs(bookingsQuery),
        ]);

        if (pricingSnapshot.empty) {
            console.log(`No price/fleet rule found for trip.`);
            return 0;
        }
        
        const priceRule = pricingSnapshot.docs[0].data();
        const vehicleKey = Object.keys(vehicleOptions).find(key => vehicleOptions[key as keyof typeof vehicleOptions].name === vehicleType) as keyof typeof vehicleOptions | undefined;
    
        if (!vehicleKey) {
            console.error(`Invalid vehicle type found: ${vehicleType}`);
            return 0;
        }

        const vehicleDetails = vehicleKey ? vehicleOptions[vehicleKey] : null;
        if (!vehicleDetails) return 0;
        
        const vehicleCapacity = (vehicleKey === '4-seater') ? 4 : (vehicleKey === '5-seater') ? 5 : (vehicleKey === '7-seater') ? 7 : 0;
        const totalSeats = (priceRule.vehicleCount || 1) * vehicleCapacity;
        
        const bookedSeats = bookingsSnapshot.size;

        return totalSeats - bookedSeats;

    } catch (error) {
        console.error("Error fetching available seats:", error);
        return 0; // Return 0 if there's an error, assuming unavailability.
    }
}
