
"use server";

import { Resend } from 'resend';
import BookingStatusUpdateEmail from '@/components/emails/booking-status-update-email';
import type { Booking } from '@/lib/types';

export async function sendBookingStatusUpdateEmail(booking: Booking) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('Resend API key is not configured. Please set RESEND_API_KEY in your .env.local file.');
    // In a real app, you might throw an error or handle this more gracefully.
    // For now, we'll just log it to avoid crashing the booking update process.
    return;
  }
  
  const resend = new Resend(apiKey);
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
      // In a real app, you might throw an error to the client
      // For now, we'll just log it.
      return;
    }

    console.log('Email sent successfully:', data);
  } catch (error) {
    console.error('Failed to send email:', error);
    // In a real app, you might throw an error to the client
  }
}
