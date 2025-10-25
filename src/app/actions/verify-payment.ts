
'use server';

import axios from 'axios';

interface PaystackVerificationResponse {
  status: boolean;
  message: string;
  data: {
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    currency: string;
    transaction_date: string;
    customer: {
      email: string;
    };
    // Add other fields you might need
  };
}

export const verifyPayment = async (reference: string): Promise<{ status: 'success' | 'failed' | 'error', message: string }> => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    console.error('Paystack secret key is not configured.');
    return { status: 'error', message: 'Server configuration error.' };
  }

  try {
    const url = `https://api.paystack.co/transaction/verify/${reference}`;
    const response = await axios.get<PaystackVerificationResponse>(url, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const { data } = response.data;

    if (data.status === 'success') {
      return { status: 'success', message: 'Payment successfully verified.' };
    } else {
      return { status: 'failed', message: `Payment ${data.status}.` };
    }
  } catch (error) {
    console.error('Error verifying Paystack transaction:', error);
    if (axios.isAxiosError(error) && error.response) {
      return { status: 'error', message: `API Error: ${error.response.data?.message || error.message}` };
    }
    return { status: 'error', message: 'An unexpected error occurred during verification.' };
  }
};
