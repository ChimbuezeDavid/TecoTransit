
'use server';

import { collection, query, where, getDocs } from "firebase/firestore";
import { vehicleOptions } from '@/lib/constants';
import { db } from "@/lib/firebase"; 
import type { PriceRule } from "@/lib/types";

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
      // If no pricing rule exists, no seats are available.
      return 0; 
    }

    const priceRule = pricingSnapshot.docs[0].data() as PriceRule;
    
    // Find the short key ('4-seater') from the full name ('4-Seater Sienna')
    const vehicleKey = Object.keys(vehicleOptions).find(
      key => vehicleOptions[key as keyof typeof vehicleOptions].name === priceRule.vehicleType
    ) as keyof typeof vehicleOptions | undefined;

    if (!vehicleKey) {
      // If the vehicle type in the price rule is invalid, no seats available.
      return 0; 
    }
    
    const capacity = vehicleOptions[vehicleKey].capacity;
    const vehicleCount = priceRule.vehicleCount || 0; // Default to 0 if not set
    const totalSeats = vehicleCount * capacity;

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
    return 0; // Return 0 on any error to be safe.
  }
};
