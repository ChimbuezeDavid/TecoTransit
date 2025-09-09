
import * as React from 'react';
import type { Booking } from '@/lib/types';

interface EmailTemplateProps {
  booking: Booking;
  status: Booking['status'];
}

const container: React.CSSProperties = {
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  padding: '20px',
  backgroundColor: '#f4f4f7',
};

const card: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '24px',
  maxWidth: '600px',
  margin: '0 auto',
};

const h1: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#0f172a',
  margin: '0 0 16px',
};

const p: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#475569',
  margin: '0 0 16px',
};

const strong: React.CSSProperties = {
  color: '#1e293b',
};

const badge: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: '9999px',
  fontWeight: 500,
  fontSize: '14px',
};

const confirmedBadge: React.CSSProperties = {
  ...badge,
  backgroundColor: '#dcfce7',
  color: '#166534',
};

const cancelledBadge: React.CSSProperties = {
  ...badge,
  backgroundColor: '#fee2e2',
  color: '#991b1b',
};

const detailsList: React.CSSProperties = {
  listStyleType: 'none',
  padding: 0,
  margin: '20px 0',
  borderTop: '1px solid #e2e8f0',
  paddingTop: '20px',
};

const detailItem: React.CSSProperties = {
  padding: '8px 0',
  display: 'flex',
  justifyContent: 'space-between',
};

const footer: React.CSSProperties = {
  marginTop: '24px',
  textAlign: 'center',
  fontSize: '12px',
  color: '#64748b',
};

const BookingStatusUpdateEmail: React.FC<Readonly<EmailTemplateProps>> = ({ booking, status }) => {
  const statusStyles = status === 'Confirmed' ? confirmedBadge : cancelledBadge;
  
  return (
    <div style={container}>
      <div style={card}>
        <h1 style={h1}>Booking Update</h1>
        <p style={p}>Hello {booking.name},</p>
        
        {status === 'Confirmed' && (
          <p style={p}>
            Great news! Your booking request for a trip from <strong>{booking.pickup}</strong> to <strong>{booking.destination}</strong> has been confirmed.
          </p>
        )}

        {status === 'Cancelled' && (
          <p style={p}>
            We're writing to inform you that your booking request for a trip from <strong>{booking.pickup}</strong> to <strong>{booking.destination}</strong> has been cancelled.
          </p>
        )}
        
        <p style={p}>Your booking status is now: <span style={statusStyles}>{status}</span></p>

        {status === 'Confirmed' && booking.confirmedDate && (
          <p style={p}>
            Your confirmed departure date is <strong>{booking.confirmedDate}</strong>.
          </p>
        )}

        <ul style={detailsList}>
            <li style={detailItem}><span>Booking ID:</span> <strong style={strong}>{booking.id.substring(0,8)}</strong></li>
            <li style={detailItem}><span>Vehicle:</span> <strong style={strong}>{booking.vehicleType}</strong></li>
            <li style={detailItem}><span>Total Fare:</span> <strong style={strong}>₦{booking.totalFare.toLocaleString()}</strong></li>
        </ul>

        <p style={p}>If you have any questions, please contact our support team. We look forward to seeing you!</p>

        <p style={p}>
          Best regards,<br />
          The TecoTransit Team
        </p>

        <div style={footer}>
          TecoTransit | Your reliable travel partner.
        </div>
      </div>
    </div>
  );
};

export default BookingStatusUpdateEmail;
