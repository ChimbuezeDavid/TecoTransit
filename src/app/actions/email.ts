
"use server";

import { Resend } from 'resend';
import BookingStatusUpdateEmail from '@/components/emails/booking-status-update-email';
import type { Booking } from '@/lib/types';
import { format } from 'date-fns';

export async function sendBookingStatusUpdateEmail(booking: Booking) {
  if (!process.env.RESEND_API_KEY) {
    console.error('Resend API key is not configured.');
    // In a real app, you might throw an error or handle this more gracefully.
    // For now, we'll just log it to avoid crashing the booking update process.
    return;
  }
  
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = "tecotransit-nonreply@gmail.com";

  const subject = `Booking ${booking.status}: Your TecoTransit Trip (#${booking.id.substring(0, 8)})`;

  try {
    const { data, error } = await resend.emails.send({
      from: `TecoTransit <${fromEmail}>`,
      to: [booking.email],
      subject: subject,
      react: BookingStatusUpdateEmail({ booking: booking }),
    });

    if (error) {
      console.error('Resend API Error:', error);
      // Decide if you want to throw an error to the client
      // For now, we'll just log it.
      return;
    }

    console.log('Email sent successfully:', data);
  } catch (error) {
    console.error('Failed to send email:', error);
    // Decide if you want to throw an error to the client
  }
}
