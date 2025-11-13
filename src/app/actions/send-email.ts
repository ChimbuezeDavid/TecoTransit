
'use server';

import { Resend } from 'resend';
import BookingStatusEmail from '@/components/emails/booking-status-email';
import BookingReceivedEmail from '@/components/emails/booking-received-email';

interface SendBookingStatusEmailProps {
  name: string;
  email: string;
  status: 'Confirmed' | 'Cancelled';
  bookingId: string;
  pickup: string;
  destination: string;
  vehicleType: string;
  totalFare: number;
  confirmedDate?: string;
}

export const sendBookingStatusEmail = async (props: SendBookingStatusEmailProps) => {
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: 'TecoTransit <noreply@tecotransit.org>',
      to: [props.email],
      subject: `Your Booking is ${props.status}! (Ref: ${props.bookingId.substring(0,8)})`,
      react: BookingStatusEmail(props),
    });

    if (error) {
      // Re-throw the specific error from Resend
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Failed to send status email:', error);
    // Propagate the specific error message
    throw new Error(error instanceof Error ? error.message : 'Failed to send status email.');
  }
};


interface SendBookingReceivedEmailProps {
  name: string;
  email: string;
  bookingId: string;
  pickup: string;
  destination: string;
  intendedDate: string;
  totalFare: number;
}

export const sendBookingReceivedEmail = async (props: SendBookingReceivedEmailProps) => {
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: 'TecoTransit <noreply@tecotransit.org>',
      to: [props.email],
      subject: `We've Received Your TecoTransit Reservation! (Ref: ${props.bookingId.substring(0,8)})`,
      react: BookingReceivedEmail(props),
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Failed to send booking received email:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to send booking received email.');
  }
};
