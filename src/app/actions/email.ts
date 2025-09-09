
'use server';

import { Resend } from 'resend';
import BookingStatusUpdateEmail from '@/components/emails/booking-status-update-email';
import type { Booking } from '@/lib/types';

export async function sendBookingStatusUpdateEmail(booking: Booking, newStatus: Booking['status']) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = 'tecotransit-nonreply@gmail.com';

  if (!resendApiKey) {
     console.error("RESEND_API_KEY environment variable not set.");
     throw new Error("Server is not configured to send emails. Please set the RESEND_API_KEY environment variable.");
  }
  
  if (!fromEmail) {
    console.error("The from email address is not set.");
    throw new Error("Server is not configured to send emails.");
  }

  const resend = new Resend(resendApiKey);

  const subject = newStatus === 'Confirmed' 
    ? 'Your TecoTransit Booking is Confirmed!' 
    : 'Update on Your TecoTransit Booking';

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
