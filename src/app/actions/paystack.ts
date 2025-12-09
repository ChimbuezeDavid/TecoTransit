
'use server';

import Paystack from 'paystack';
import type { Booking } from '@/lib/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { assignBookingToTrip } from './create-booking-and-assign-trip';
import { sendBookingReceivedEmail } from './send-email';
import axios from 'axios';


if (!process.env.PAYSTACK_SECRET_KEY) {
  // This file is being kept for archival purposes, but should not be used.
  // The logic has been moved to opay.ts
}

// All logic has been moved to opay.ts. This file is no longer in use.
