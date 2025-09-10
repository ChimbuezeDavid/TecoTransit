
'use server';

import { Resend } from 'resend';
import BookingStatusEmail from '@/components/emails/booking-status-email';

interface SendEmailProps {
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

export const sendBookingStatusEmail = async (props: SendEmailProps) => {
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: 'TecoTransit <noreply@tecotransit.com>',
      to: [props.email],
      subject: `Your Booking is ${props.status}! (Ref: ${props.bookingId.substring(0,8)})`,
      react: BookingStatusEmail(props),
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email.');
  }
};
