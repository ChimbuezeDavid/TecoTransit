
'use server';

import { Resend } from 'resend';
import BookingStatusEmail from '@/components/emails/booking-status-email';
import BookingReceivedEmail from '@/components/emails/booking-received-email';
import BookingRescheduledEmail from '@/components/emails/booking-rescheduled-email';

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


interface SendBookingRescheduledEmailProps {
    name: string;
    email: string;
    bookingId: string;
    oldDate: string;
    newDate: string;
}

export const sendBookingRescheduledEmail = async(props: SendBookingRescheduledEmailProps) => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
        const { data, error } = await resend.emails.send({
            from: 'TecoTransit <noreply@tecotransit.org>',
            to: [props.email],
            subject: `Important Update: Your TecoTransit Booking Has Been Rescheduled (Ref: ${props.bookingId.substring(0,8)})`,
            react: BookingRescheduledEmail(props),
        });
        if (error) throw new Error(error.message);
        return data;
    } catch (error) {
        console.error('Failed to send reschedule email:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to send reschedule email.');
    }
};


interface SendRefundRequestEmailProps {
    bookingId: string;
    customerName: string;
    customerEmail: string;
    totalFare: number;
    paymentReference: string;
}

export const sendRefundRequestEmail = async (props: SendRefundRequestEmailProps) => {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const refundEmail = 'refunds@tecotransit.org';

  try {
    const { data, error } = await resend.emails.send({
        from: 'TecoTransit Alert <alert@tecotransit.org>',
        to: ['tecotransportservices@gmail.com', refundEmail], // Send to admin and dedicated refund address
        subject: `New Refund Request for Booking: ${props.bookingId.substring(0,8)}`,
        html: `
            <h1>Refund Request Initiated</h1>
            <p>A refund has been requested for a cancelled booking.</p>
            <h3>Booking Details:</h3>
            <ul>
                <li><strong>Booking ID:</strong> ${props.bookingId}</li>
                <li><strong>Customer:</strong> ${props.customerName} (${props.customerEmail})</li>
                <li><strong>Amount Paid:</strong> ₦${props.totalFare.toLocaleString()}</li>
                <li><strong>Paystack Reference:</strong> ${props.paymentReference}</li>
            </ul>
            <p>Please process this refund via the Paystack dashboard and update the customer.</p>
        `,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Failed to send refund request email:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to send refund request email.');
  }
};
