
'use server';

import { Resend } from 'resend';
import BookingStatusUpdateEmail from '@/components/emails/booking-status-update-email';
import type { Booking } from '@/lib/types';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'tecotransit-nonreply@gmail.com';

export async function sendBookingStatusUpdateEmail(booking: Booking, newStatus: Booking['status']) {
  if (!fromEmail) {
    console.error("The from email address is not set.");
    throw new Error("Server is not configured to send emails.");
  }
  
  if (!process.env.RESEND_API_KEY) {
     console.error("RESEND_API_KEY environment variable not set.");
     throw new Error("Server is not configured to send emails. Please set the RESEND_API_KEY environment variable.");
  }

  const subject = newStatus === 'Confirmed' 
    ? 'Your TecoTransit Booking is Confirmed!' 
    : 'Update on Your TecoTransit Booking';
  
  // The booking object contains date strings in the correct format ('yyyy-MM-dd').
  // The email component is now responsible for displaying them as-is.
  // No further formatting is needed here.

  try {
    const data = await resend.emails.send({
      from: `TecoTransit <${fromEmail}>`,
      to: [booking.email],
      subject: subject,
      react: BookingStatusUpdateEmail({ booking, status: newStatus }),
      text: `Your booking status has been updated to: ${newStatus}.`
    });

    console.log('Email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send status update email.');
  }
}
