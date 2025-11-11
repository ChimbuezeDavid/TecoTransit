'use server';

import { collection, query, where, getDocs } from "firebase/firestore";
import { vehicleOptions } from '@/lib/constants';
import { db } from "@/lib/firebase";

interface PriceRule {
  pickup: string;
  destination: string;
  vehicleType: string;
  vehicleCount?: number;
}

export const getAvailableSeats = async (
  pickup: string, 
  destination: string, 
  vehicleType: string, 
  date: string
): Promise<number> => {
  try {
    if (!pickup || !destination || !vehicleType || !date) {
      return 0;
    }

    // 1. Find the pricing rule to determine total capacity.
    const pricesQuery = query(
      collection(db, 'prices'),
      where('pickup', '==', pickup),
      where('destination', '==', destination),
      where('vehicleType', '==', vehicleType)
    );
    const pricingSnapshot = await getDocs(pricesQuery);

    if (pricingSnapshot.empty) {
      return 0;
    }

    const priceRule = pricingSnapshot.docs[0].data() as PriceRule;
    
    // Find the short key ('4-seater') from the full name ('4-Seater Sienna')
    const vehicleKey = Object.keys(vehicleOptions).find(
      key => vehicleOptions[key as keyof typeof vehicleOptions].name === priceRule.vehicleType
    ) as keyof typeof vehicleOptions | undefined;

    if (!vehicleKey) {
      return 0; // Invalid vehicle type in price rule
    }
    
    const vehicleCapacityMap = { '4-seater': 4, '5-seater': 5, '7-seater': 7 };
    const seatsPerVehicle = vehicleCapacityMap[vehicleKey] || 0;
    const vehicleCount = priceRule.vehicleCount ?? 0;
    const totalSeats = vehicleCount * seatsPerVehicle;

    if (totalSeats <= 0) {
      return 0;
    }

    // 2. Count paid or confirmed bookings for that date.
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

    // 3. Calculate available seats.
    const available = totalSeats - bookedSeats;
    return available < 0 ? 0 : available;

  } catch (error) {
    console.error("Error getting available seats:", error);
    return 0;
  }
};
