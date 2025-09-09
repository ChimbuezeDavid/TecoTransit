
'use server';

import { Resend } from 'resend';
import BookingStatusUpdateEmail from '@/components/emails/booking-status-update-email';
import type { Booking } from '@/lib/types';
import { format, parseISO } from 'date-fns';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'tecotransit-nonreply@gmail.com';

export async function sendBookingStatusUpdateEmail(booking: Booking, newStatus: Booking['status']) {
  if (!fromEmail) {
    console.error("The from email address is not set.");
    throw new Error("Server is not configured to send emails.");
  }
  
  if (!process.env.RESEND_API_KEY) {
     console.error("RESEND_API_KEY environment variable not set.");
     throw new Error("Server is not configured to send emails.");
  }

  const subject = newStatus === 'Confirmed' 
    ? 'Your TecoTransit Booking is Confirmed!' 
    : 'Update on Your TecoTransit Booking';
  
  // Format dates for display in the email
  const formattedBooking = {
    ...booking,
    intendedDate: format(parseISO(booking.intendedDate), 'PPP'),
    alternativeDate: format(parseISO(booking.alternativeDate), 'PPP'),
    confirmedDate: booking.confirmedDate ? format(parseISO(booking.confirmedDate), 'PPP') : undefined,
  }

  try {
    const data = await resend.emails.send({
      from: `TecoTransit <${fromEmail}>`,
      to: [booking.email],
      subject: subject,
      react: BookingStatusUpdateEmail({ booking: formattedBooking, status: newStatus }),
      text: `Your booking status has been updated to: ${newStatus}.`
    });

    console.log('Email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send status update email.');
  }
}
