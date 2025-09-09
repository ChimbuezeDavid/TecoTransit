
"use server";

import { Resend } from 'resend';
import BookingStatusUpdateEmail from '@/components/emails/booking-status-update-email';

interface SendEmailProps {
    name: string;
    email: string;
    status: 'Confirmed' | 'Cancelled';
    bookingId: string;
    pickup: string;
    destination: string;
    vehicleType: string;
    intendedDate: string;
    alternativeDate: string;
    confirmedDate?: string;
    totalFare: number;
}

export async function sendBookingStatusUpdateEmail(props: SendEmailProps) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Resend API key is not configured. Cannot send email.');
  }
  
  const resend = new Resend(apiKey);
  const fromEmail = "tecotransit-nonreply@gmail.com";

  // Ensure bookingId is a string before using substring on it.
  const shortBookingId = typeof props.bookingId === 'string' ? props.bookingId.substring(0, 8) : 'N/A';
  const subject = `Booking ${props.status}: Your TecoTransit Trip (#${shortBookingId})`;

  try {
    const { data, error } = await resend.emails.send({
      from: `TecoTransit <${fromEmail}>`,
      to: [props.email],
      subject: subject,
      react: BookingStatusUpdateEmail({ 
          name: props.name,
          status: props.status,
          bookingId: props.bookingId,
          route: `${props.pickup} to ${props.destination}`,
          vehicle: props.vehicleType,
          intendedDate: props.intendedDate,
          alternativeDate: props.alternativeDate,
          confirmedDate: props.confirmedDate,
          totalFare: props.totalFare.toLocaleString()
      }),
    });

    if (error) {
      console.error('Resend API Error:', error);
      throw new Error(error.message);
    }

    console.log('Email sent successfully:', data);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}
