'use server';

import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendBookingStatusEmail, sendRefundRequestEmail } from './send-email';
import { cleanupTrips } from './cleanup-trips';
import type { Booking } from '@/lib/types';
import { getDocs, query, collection, where, Timestamp, writeBatch } from 'firebase/firestore';

export async function updateBookingStatus(bookingId: string, status: 'Cancelled'): Promise<void> {
  const bookingDocRef = doc(db, 'bookings', bookingId);
  const bookingSnap = await getDoc(bookingDocRef);

  if (!bookingSnap.exists()) {
    throw new Error("Booking not found");
  }
  
  const bookingToUpdate = bookingSnap.data() as Booking;

  await updateDoc(bookingDocRef, { status });

  try {
    await sendBookingStatusEmail({
        name: bookingToUpdate.name,
        email: bookingToUpdate.email,
        status: status,
        bookingId: bookingToUpdate.id,
        pickup: bookingToUpdate.pickup,
        destination: bookingToUpdate.destination,
        vehicleType: bookingToUpdate.vehicleType,
        totalFare: bookingToUpdate.totalFare,
    });
  } catch (emailError) {
    console.error("Failed to send status update email:", emailError);
    // We don't re-throw here, as the primary action (updating status) succeeded.
    // The admin will see the status change, but we should log this failure.
  }
}

export async function requestRefund(bookingId: string): Promise<void> {
    const bookingDocRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingDocRef);

    if (!bookingSnap.exists()) {
        throw new Error("Booking not found");
    }

    const booking = bookingSnap.data() as Booking;
    if (booking.status !== 'Cancelled') {
        throw new Error("Refunds can only be requested for cancelled bookings.");
    }
    if (!booking.paymentReference) {
        throw new Error("This booking has no payment reference, so a refund cannot be processed automatically.");
    }

    await sendRefundRequestEmail({
        bookingId: booking.id,
        customerName: booking.name,
        customerEmail: booking.email,
        totalFare: booking.totalFare,
        paymentReference: booking.paymentReference,
    });
}

export async function deleteBooking(id: string): Promise<void> {
  const bookingDocRef = doc(db, 'bookings', id);
  await deleteDoc(bookingDocRef);
  await cleanupTrips([id]);
}

export async function deleteBookingsInRange(startDate: Date | null, endDate: Date | null): Promise<number> {
    
    let bookingsQuery = query(collection(db, 'bookings'));

    // If dates are provided, add where clauses. Otherwise, it will query all bookings.
    if (startDate && endDate) {
        const startTimestamp = Timestamp.fromDate(startDate);
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        const endTimestamp = Timestamp.fromDate(endOfDay);
        
        bookingsQuery = query(
          collection(db, 'bookings'),
          where('createdAt', '>=', startTimestamp),
          where('createdAt', '<=', endTimestamp)
        );
    }
    
    const snapshot = await getDocs(bookingsQuery);
    if (snapshot.empty) {
        return 0;
    }
    
    const deletedBookingIds: string[] = [];
    
    // Firestore allows a maximum of 500 writes in a single batch.
    // We'll process the deletions in chunks if there are more than 500.
    const batches = [];
    let currentBatch = writeBatch(db);
    let currentBatchSize = 0;

    for (const doc of snapshot.docs) {
        deletedBookingIds.push(doc.id);
        currentBatch.delete(doc.ref);
        currentBatchSize++;

        if (currentBatchSize === 500) {
            batches.push(currentBatch);
            currentBatch = writeBatch(db);
            currentBatchSize = 0;
        }
    }

    // Add the last batch if it's not empty
    if (currentBatchSize > 0) {
        batches.push(currentBatch);
    }

    // Commit all batches
    await Promise.all(batches.map(batch => batch.commit()));


    if (deletedBookingIds.length > 0) {
      // Cleanup trips in smaller chunks to avoid overwhelming the function
      const chunkSize = 100;
      for (let i = 0; i < deletedBookingIds.length; i += chunkSize) {
        const chunk = deletedBookingIds.slice(i, i + chunkSize);
        await cleanupTrips(chunk);
      }
    }
    
    return snapshot.size;
}
