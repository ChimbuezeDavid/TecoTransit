
'use server';

import Paystack from 'paystack';
import type { Booking, BookingFormData, Passenger, PriceRule, Trip } from '@/lib/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue, FieldPath } from 'firebase-admin/firestore';
import { vehicleOptions } from '@/lib/constants';
import { sendBookingStatusEmail, sendBookingReceivedEmail } from './send-email';
import { Resend } from 'resend';
import axios from 'axios';


if (!process.env.PAYSTACK_SECRET_KEY) {
  throw new Error('PAYSTACK_SECRET_KEY is not set in environment variables.');
}

const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
const paystack = Paystack(paystackSecret);

interface InitializeTransactionArgs {
  email: string;
  amount: number; // in kobo
  metadata: Record<string, any>;
}

export const initializeTransaction = async ({ email, amount, metadata }: InitializeTransactionArgs) => {
  try {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
      throw new Error("Could not connect to the database.");
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
        throw new Error("NEXT_PUBLIC_BASE_URL is not set in environment variables. It must be your full production domain.");
    }
      
    const callbackUrl = `${baseUrl}/payment/callback`;

    const paystackData = {
      email,
      amount: Math.round(amount),
      metadata: { ...metadata },
      callback_url: callbackUrl,
    };
    
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      paystackData,
      {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { status: true, data: response.data.data };
  } catch (error: any) {
    console.error('Paystack initialization error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || 'An error occurred during payment initialization.';
    return { status: false, message: errorMessage };
  }
};


export const verifyTransactionAndCreateBooking = async (reference: string) => {
    try {
        const db = getFirebaseAdmin()?.firestore();
        if (!db) {
            throw new Error("Could not connect to the database.");
        }

        const verificationResponse = await paystack.transaction.verify(reference);
        const metadata = verificationResponse.data?.metadata;

        if (verificationResponse.data?.status !== 'success') {
            throw new Error('Payment was not successful.');
        }

        if (!metadata || !metadata.booking_details) {
            throw new Error('Booking metadata is missing from transaction.');
        }
        
        const bookingDetails: Omit<BookingFormData, 'intendedDate' | 'privacyPolicy'> & { intendedDate: string, totalFare: number, name: string, phone: string, allowReschedule: boolean } = JSON.parse(metadata.booking_details);
        
        const newBookingRef = db.collection('bookings').doc();
        const bookingId = newBookingRef.id;

        const newBookingData = {
            ...bookingDetails,
            id: bookingId, // Add id to the booking object itself
            createdAt: FieldValue.serverTimestamp(),
            status: 'Paid' as const,
            paymentReference: reference,
            totalFare: bookingDetails.totalFare,
        };
        
        // Step 1: Create the 'Paid' booking document.
        await newBookingRef.set(newBookingData);
        
        // Send post-booking email immediately after creation
        try {
            await sendBookingReceivedEmail({
                name: bookingDetails.name,
                email: bookingDetails.email,
                pickup: bookingDetails.pickup,
                destination: bookingDetails.destination,
                intendedDate: bookingDetails.intendedDate,
                totalFare: bookingDetails.totalFare,
                bookingId: bookingId,
            });
        } catch (e) {
            console.error(`Failed to send booking received email for booking ${bookingId}:`, e);
            // We don't want to fail the whole process if the email fails, just log it.
        }
        
        // Step 2: Now, attempt to assign this new booking to a trip.
        await assignBookingToTrip(newBookingData);

        return { success: true, bookingId: bookingId };

    } catch (error: any) {
        console.error('Verification and booking creation failed:', error);
        return { success: false, error: error.message };
    }
};

export async function assignBookingToTrip(
    bookingData: Omit<Booking, 'createdAt'> & { createdAt: any }
) {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        throw new Error("Database connection not available in assignBookingToTrip");
    }

    const { id: bookingId, name, phone, pickup, destination, vehicleType, intendedDate } = bookingData;
    const priceRuleId = `${pickup}_${destination}_${vehicleType}`.toLowerCase().replace(/\s+/g, '-');
    const priceRuleRef = db.doc(`prices/${priceRuleId}`);
    
    try {
        let assignedTripId: string | null = null;
        
        await db.runTransaction(async (transaction) => {
            const priceRuleSnap = await transaction.get(priceRuleRef);
            if (!priceRuleSnap.exists) {
                throw new Error(`Price rule ${priceRuleId} not found.`);
            }
            const priceRule = { id: priceRuleSnap.id, ...priceRuleSnap.data() } as PriceRule;
            
            const vehicleKey = Object.keys(vehicleOptions).find(key => vehicleOptions[key as keyof typeof vehicleOptions].name === priceRule.vehicleType) as keyof typeof vehicleOptions | undefined;
            
            if (!vehicleKey) {
                throw new Error(`Vehicle type '${priceRule.vehicleType}' not found in vehicleOptions.`);
            }

            const capacityPerVehicle = vehicleOptions[vehicleKey].capacity;
            
            if (capacityPerVehicle === 0) {
                throw new Error(`Vehicle capacity for ${priceRule.vehicleType} is zero.`);
            }

            const tripsQuery = db.collection('trips')
                .where('priceRuleId', '==', priceRuleId)
                .where('date', '==', intendedDate)
                .orderBy('vehicleIndex');
            
            const tripsSnapshot = await transaction.get(tripsQuery);
            let assigned = false;
            
            const passenger: Passenger = { bookingId, name, phone };

            // 1. Try to find a non-full, existing trip
            for (const doc of tripsSnapshot.docs) {
                const trip = doc.data() as Trip;
                if (!trip.isFull) {
                    const newPassengerCount = trip.passengers.length + 1;
                    const updates: { passengers: FirebaseFirestore.FieldValue; isFull?: boolean } = {
                        passengers: FieldValue.arrayUnion(passenger),
                    };

                    if (newPassengerCount >= trip.capacity) {
                        updates.isFull = true;
                    }
                    
                    transaction.update(doc.ref, updates);
                    
                    assigned = true;
                    assignedTripId = doc.id;
                    break;
                }
            }

            // 2. If not assigned, check if we can create a new trip
            if (!assigned && tripsSnapshot.size < priceRule.vehicleCount) {
                const newVehicleIndex = tripsSnapshot.size + 1;
                const newTripId = `${priceRuleId}_${intendedDate}_${newVehicleIndex}`;
                
                const newTrip: Trip = {
                    id: newTripId,
                    priceRuleId: priceRule.id,
                    pickup: priceRule.pickup,
                    destination: priceRule.destination,
                    vehicleType: priceRule.vehicleType,
                    date: intendedDate,
                    vehicleIndex: newVehicleIndex,
                    capacity: capacityPerVehicle,
                    passengers: [passenger],
                    isFull: capacityPerVehicle <= 1,
                };
                
                transaction.set(db.collection('trips').doc(newTripId), newTrip);

                assigned = true;
                assignedTripId = newTripId;
            }

            // If still not assigned after trying everything, throw an error to rollback transaction.
            if (!assigned) {
                throw new Error("All vehicles for this route and date are full.");
            }
             
            // Associate the booking with the trip ID.
            if (assignedTripId) {
                const bookingRef = db.collection('bookings').doc(bookingId);
                transaction.update(bookingRef, { tripId: assignedTripId });
            }
        });
        
        // After transaction is successful, check for trip confirmation
        if (assignedTripId) {
            await checkAndConfirmTrip(db, assignedTripId);
        }
    } catch (error: any) {
        console.error(`Transaction failed for booking ${bookingId}:`, error);
        
        // Now, we can reliably send an overflow email if the error message contains the specific string
        // or for any other transaction failure.
        const reason = error.message || "An unknown error occurred during trip assignment.";
        await sendOverflowEmail(bookingData, reason);

        // Re-throw the error to ensure the calling function knows the transaction failed.
        throw error;
    }
}

async function sendOverflowEmail(bookingDetails: any, reason: string) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { pickup, destination, vehicleType, intendedDate, name, email } = bookingDetails;
    try {
        await resend.emails.send({
            from: 'TecoTransit Alert <alert@tecotransit.org>',
            to: ['tecotransportservices@gmail.com'],
            subject: 'Urgent: Vehicle Capacity Exceeded or Booking Assignment Failed',
            html: `
                <h1>Vehicle Capacity Alert</h1>
                <p>A new booking could not be automatically assigned to a trip.</p>
                <p><strong>Reason:</strong> ${reason}</p>
                <h3>Booking Details:</h3>
                <ul>
                    <li><strong>Booking ID:</strong> ${bookingDetails.id}</li>
                    <li><strong>Route:</strong> ${pickup} to ${destination}</li>
                    <li><strong>Vehicle:</strong> ${vehicleType}</li>
                    <li><strong>Date:</strong> ${intendedDate}</li>
                    ${name ? `<li><strong>Passenger:</strong> ${name} (${email})</li>` : ''}
                </ul>
                <p>The booking has been created but does not have a tripId. Please take immediate action to arrange for more vehicle space or contact the customer, and manually update the booking record.</p>
            `,
        });
    } catch(e) {
        console.error("Failed to send overflow email:", e);
    }
}


async function checkAndConfirmTrip(
    db: FirebaseFirestore.Firestore,
    tripId: string,
) {
    const tripRef = db.collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
        console.warn(`Trip with ID ${tripId} not found for confirmation check.`);
        return;
    }

    const trip = tripDoc.data() as Trip;

    // Only proceed if the trip is marked as full
    if (!trip.isFull) {
        return;
    }
    
    const passengerIds = trip.passengers.map(p => p.bookingId);
    if (passengerIds.length === 0) return;

    const bookingsQuery = db.collection('bookings').where(FieldPath.documentId(), 'in', passengerIds);
    const bookingsSnapshot = await bookingsQuery.get();

    // Only confirm bookings that are 'Paid' and not already 'Cancelled' or 'Confirmed'
    const bookingsToConfirm = bookingsSnapshot.docs.filter(doc => doc.data().status === 'Paid');

    if (bookingsToConfirm.length === 0) return;

    const batch = db.batch();
    bookingsToConfirm.forEach(doc => {
        batch.update(doc.ref, { status: 'Confirmed', confirmedDate: trip.date });
    });
    
    await batch.commit();

    // After committing the batch, send the notification emails
    for (const doc of bookingsToConfirm) {
        const bookingData = doc.data();
        try {
            await sendBookingStatusEmail({
                name: bookingData.name,
                email: bookingData.email,
                status: 'Confirmed',
                bookingId: doc.id,
                pickup: bookingData.pickup,
                destination: bookingData.destination,
                vehicleType: bookingData.vehicleType,
                totalFare: bookingData.totalFare,
                confirmedDate: trip.date,
            });
        } catch (e) {
            console.error(`Failed to send confirmation email for booking ${doc.id}:`, e);
        }
    }
}

    

    

    