
'use server';

import { doc, updateDoc, deleteDoc, getDoc, getDocs, query, collection, where, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendBookingStatusEmail, sendRefundRequestEmail, sendManualRescheduleEmail } from './send-email';
import { cleanupTrips } from './cleanup-trips';
import type { Booking } from '@/lib/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { assignBookingToTrip } from './create-booking-and-assign-trip';

export async function updateBookingStatus(bookingId: string, status: 'Cancelled'): Promise<void> {
  const adminDb = getFirebaseAdmin()?.firestore();
  if (!adminDb) {
    throw new Error("Database connection failed.");
  }
  
  const bookingDocRef = adminDb.collection('bookings').doc(bookingId);
  const bookingSnap = await bookingDocRef.get();

  if (!bookingSnap.exists) {
    throw new Error("Booking not found");
  }
  
  const bookingToUpdate = bookingSnap.data() as Booking;

  await bookingDocRef.update({ status });

  // After successfully updating the status, remove the passenger from the trip
  if (bookingToUpdate.tripId) {
    await cleanupTrips([bookingId]);
  }

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
  // We need to get the booking data before deleting it to check for a tripId
  const bookingSnap = await getDoc(bookingDocRef);
  
  if (bookingSnap.exists()) {
      const bookingData = bookingSnap.data();
      await deleteDoc(bookingDocRef);
      
      // Only run cleanup if the booking was actually assigned to a trip
      if (bookingData.tripId) {
          await cleanupTrips([id]);
      }
  }
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
        // Collect IDs of bookings that are actually part of a trip for cleanup
        if (doc.data().tripId) {
            deletedBookingIds.push(doc.id);
        }
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


export async function manuallyRescheduleBooking(bookingId: string, newDate: string): Promise<{success: boolean; error?: string}> {
    const adminDb = getFirebaseAdmin()?.firestore();
    if (!adminDb) {
        return { success: false, error: "Database connection failed." };
    }

    const bookingRef = adminDb.collection('bookings').doc(bookingId);

    try {
        let oldTripId: string | undefined;
        let bookingForAssignment: any;

        await adminDb.runTransaction(async (transaction) => {
            const bookingDoc = await transaction.get(bookingRef);
            if (!bookingDoc.exists) {
                throw new Error(`Booking ${bookingId} not found.`);
            }
            const bookingData = bookingDoc.data() as Booking;
            oldTripId = bookingData.tripId;

            // Prepare for reassignment
            bookingForAssignment = {
                ...bookingData,
                id: bookingDoc.id,
                intendedDate: newDate,
                createdAt: (bookingData.createdAt as any), 
            };

            // 1. Remove passenger from the old trip if they were in one
            if (oldTripId) {
                const oldTripRef = adminDb.collection('trips').doc(oldTripId);
                const passengerToRemove = {
                    bookingId: bookingData.id,
                    name: bookingData.name,
                    phone: bookingData.phone
                };
                transaction.update(oldTripRef, {
                    passengers: FieldValue.arrayRemove(passengerToRemove)
                });
            }

            // 2. Update booking with new date and remove old tripId
            transaction.update(bookingRef, {
                intendedDate: newDate,
                tripId: FieldValue.delete(),
                // Optionally reset reschedule count if you want manual reschedules to not count
                rescheduledCount: 0 
            });
        });

        // 3. Re-assign to a new trip with the updated date
        await assignBookingToTrip(bookingForAssignment);

        // 4. Send notification email to customer
        await sendManualRescheduleEmail({
            name: bookingForAssignment.name,
            email: bookingForAssignment.email,
            bookingId: bookingForAssignment.id,
            newDate: newDate,
            pickup: bookingForAssignment.pickup,
            destination: bookingForAssignment.destination,
        });

        return { success: true };

    } catch (error: any) {
        console.error(`Manual reschedule failed for booking ${bookingId}:`, error);
        return { success: false, error: error.message };
    }
}
