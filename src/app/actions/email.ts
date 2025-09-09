
"use server";

import { Resend } from 'resend';
import BookingStatusUpdateEmail from '@/components/emails/booking-status-update-email';
import type { Booking } from '@/lib/types';
import { format } from 'date-fns';

export async function sendBookingStatusUpdateEmail(booking: Booking) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('Resend API key is not configured. Please set RESEND_API_KEY in your .env.local file.');
  }
  
  const resend = new Resend(apiKey);
  const fromEmail = "tecotransit-nonreply@gmail.com";

  const subject = `Booking ${booking.status}: Your TecoTransit Trip (#${booking.id.substring(0, 8)})`;

  try {
    const { data, error } = await resend.emails.send({
      from: `TecoTransit <${fromEmail}>`,
      to: [booking.email],
      subject: subject,
      react: BookingStatusUpdateEmail({ 
          name: booking.name,
          status: booking.status,
          bookingId: booking.id,
          route: `${booking.pickup} to ${booking.destination}`,
          vehicle: booking.vehicleType,
          intendedDate: booking.intendedDate, // Already a string
          alternativeDate: booking.alternativeDate, // Already a string
          confirmedDate: booking.confirmedDate, // Already a string or undefined
          totalFare: booking.totalFare.toLocaleString()
      }),
    });

    if (error) {
      console.error('Resend API Error:', error);
      // Re-throw to make it visible in the calling function
      throw new Error(error.message);
    }

    console.log('Email sent successfully:', data);
  } catch (error) {
    console.error('Failed to send email:', error);
    // Re-throw to ensure the calling context is aware of the failure.
    throw error;
  }
}
