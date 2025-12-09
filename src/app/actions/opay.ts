
'use server';

import type { Booking } from '@/lib/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { assignBookingToTrip } from './create-booking-and-assign-trip';
import { sendBookingReceivedEmail } from './send-email';
import axios from 'axios';
import { createHmac } from 'crypto';
import { nanoid } from 'nanoid';


if (!process.env.OPAY_SECRET_KEY || !process.env.NEXT_PUBLIC_OPAY_MERCHANT_ID) {
  throw new Error('OPay secret key or merchant ID is not set in environment variables.');
}

const opaySecretKey = process.env.OPAY_SECRET_KEY;
const opayMerchantId = process.env.NEXT_PUBLIC_OPAY_MERCHANT_ID;
const opayApiUrl = 'https://cashierapi.opayweb.com/api/v3/cashier/initialize';
const opayVerifyUrl = 'https://cashierapi.opayweb.com/api/v3/cashier/status';

interface InitializeTransactionArgs {
  email: string;
  amount: number; 
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
    const reference = nanoid(); // Unique reference for this transaction

    const opayPayload = {
      reference,
      mchShortName: "TecoTransit",
      productName: "Trip Booking",
      productDesc: "Payment for TecoTransit trip booking",
      userPhone: `+${metadata.booking_details.phone.replace(/\D/g, '')}`,
      userRequestIp: "127.0.0.1", // Placeholder IP, OPay might require the actual user IP
      amount: Math.round(amount), // Amount in Naira
      currency: "NGN",
      payTypes: ["Balance", "Bonus", "Card", "Bank", "Oวัลet"],
      callbackUrl,
      returnUrl: callbackUrl, // Redirect back to callback page
      expireAt: 30, // Expiration in minutes
    };
    
    const signature = createHmac('sha512', opaySecretKey)
      .update(JSON.stringify(opayPayload))
      .digest('hex');

    const response = await axios.post(
      opayApiUrl,
      opayPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${opaySecretKey}`,
          'MerchantId': opayMerchantId,
        },
      }
    );
    
    if (response.data?.data?.cashierUrl) {
        // Store the booking details temporarily with the reference to be retrieved on callback
        const tempBookingRef = db.collection('reservations').doc(reference);
        await tempBookingRef.set({
            ...metadata,
            opayReference: reference,
            createdAt: FieldValue.serverTimestamp()
        });

        return { status: true, data: response.data.data };
    } else {
        throw new Error(response.data.message || 'Failed to get cashier URL from OPay');
    }

  } catch (error: any) {
    console.error('OPay initialization error:', error.response?.data || error.message);
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
        
        const verificationPayload = { reference: reference };

        const signature = createHmac('sha512', opaySecretKey)
            .update(JSON.stringify(verificationPayload))
            .digest('hex');

        const verificationResponse = await axios.post(
            opayVerifyUrl,
            verificationPayload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${opaySecretKey}`,
                    'MerchantId': opayMerchantId,
                },
            }
        );

        if (verificationResponse.data?.data?.status !== 'SUCCESS') {
            throw new Error('Payment was not successful.');
        }

        // Retrieve the temporary booking data
        const tempBookingRef = db.collection('reservations').doc(reference);
        const tempBookingSnap = await tempBookingRef.get();
        if (!tempBookingSnap.exists) {
            throw new Error('Could not find original reservation details.');
        }
        const metadata = tempBookingSnap.data();

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
        
        // Clean up the temporary reservation doc
        await tempBookingRef.delete();

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
