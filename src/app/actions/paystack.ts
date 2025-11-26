
'use server';

import Paystack from 'paystack';
import type { Booking } from '@/lib/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { assignBookingToTrip } from './create-booking-and-assign-trip';
import { sendBookingReceivedEmail } from './send-email';
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

        const existingBookingQuery = db.collection('bookings').where('paymentReference', '==', reference).limit(1);
        const existingBookingSnapshot = await existingBookingQuery.get();
        if (!existingBookingSnapshot.empty) {
            const existingBookingId = existingBookingSnapshot.docs[0].id;
            console.log(`Duplicate booking prevented for reference: ${reference}. Existing booking ID: ${existingBookingId}`);
            return { success: true, bookingId: existingBookingId };
        }

        const verificationResponse = await paystack.transaction.verify(reference);
        const metadata = verificationResponse.data?.metadata;

        if (verificationResponse.data?.status !== 'success') {
            throw new Error('Payment was not successful.');
        }

        if (!metadata || !metadata.booking_details) {
            throw new Error('Booking metadata is missing from transaction.');
        }
        
        const bookingDetails: Omit<Booking, 'id' | 'createdAt' | 'status' | 'paymentReference'> = JSON.parse(metadata.booking_details);
        
        const newBookingRef = db.collection('bookings').doc();
        const bookingId = newBookingRef.id;

        const newBookingData = {
            ...bookingDetails,
            id: bookingId, 
            createdAt: FieldValue.serverTimestamp(),
            status: 'Paid' as const,
            paymentReference: reference,
        };
        
        await newBookingRef.set(newBookingData);
        
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
        }
        
        await assignBookingToTrip(newBookingData);

        return { success: true, bookingId: bookingId };

    } catch (error: any) {
        console.error('Verification and booking creation failed:', error);
        return { success: false, error: error.message };
    }
};


interface ProcessRefundArgs {
    reference: string;
    amount: number;
}

export const processRefund = async ({ reference, amount }: ProcessRefundArgs) => {
    try {
        const response = await axios.post(
            'https://api.paystack.co/refund',
            {
                transaction: reference,
                amount: amount * 100, // Amount in kobo
            },
            {
                headers: {
                    Authorization: `Bearer ${paystackSecret}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.data.status) {
            return { status: true, message: response.data.message };
        } else {
            return { status: false, message: response.data.message };
        }

    } catch (error: any) {
        console.error('Paystack refund error:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || 'An error occurred while processing the refund.';
        return { status: false, message: errorMessage };
    }
};
