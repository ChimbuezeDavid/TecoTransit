
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface BookingStatusUpdateEmailProps {
    name: string;
    status: 'Pending' | 'Confirmed' | 'Cancelled';
    bookingId: string;
    route: string;
    vehicle: string;
    intendedDate: string;
    alternativeDate: string;
    confirmedDate?: string;
    totalFare: string;
}

export default function BookingStatusUpdateEmail({ 
    name,
    status,
    bookingId,
    route,
    vehicle,
    intendedDate,
    alternativeDate,
    confirmedDate,
    totalFare
}: BookingStatusUpdateEmailProps) {
  const previewText = `Your TecoTransit booking has been ${status}.`;
  
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>TecoTransit</Heading>
          <Section>
            <Text style={paragraph}>Hello {name},</Text>
            <Text style={paragraph}>
              This is an update regarding your booking request. Your booking status is now:{' '}
              <strong style={status === 'Confirmed' ? confirmedStatus : cancelledStatus}>
                {status}
              </strong>
            </Text>

            {status === 'Confirmed' && confirmedDate && (
                <Text style={paragraph}>
                    Your departure has been confirmed for: <strong>{confirmedDate}</strong>.
                    Please be at the assembly point on or before 7:00am. Further details about your driver will be sent to a group chat the day before departure.
                </Text>
            )}

            {status === 'Cancelled' && (
                <Text style={paragraph}>
                    We are sorry, but we were unable to proceed with your booking at this time. If you believe this was in error or have any questions, please contact our support team.
                </Text>
            )}

            <Hr style={hr} />

            <Text style={summaryTitle}>Booking Summary</Text>

            <Section style={summarySection}>
                <Text style={summaryText}><strong>Booking ID:</strong> #{bookingId.substring(0, 8)}</Text>
                <Text style={summaryText}><strong>Route:</strong> {route}</Text>
                <Text style={summaryText}><strong>Vehicle:</strong> {vehicle}</Text>
                <Text style={summaryText}><strong>Intended Date:</strong> {intendedDate}</Text>
                <Text style={summaryText}><strong>Alternative Date:</strong> {alternativeDate}</Text>
                <Text style={summaryText}><strong>Total Fare:</strong> ₦{totalFare}</Text>
            </Section>
            
            <Hr style={hr} />

            <Text style={footer}>
              Thank you for choosing TecoTransit.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}


// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  border: '1px solid #f0f0f0',
  borderRadius: '4px',
};

const heading = {
  color: '#000',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
};

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  padding: '0 20px',
};

const confirmedStatus = {
    color: '#28a745', // Green
    fontWeight: 'bold',
};

const cancelledStatus = {
    color: '#dc3545', // Red
    fontWeight: 'bold',
};

const summaryTitle = {
  ...paragraph,
  fontWeight: 'bold',
  paddingTop: '10px'
};

const summarySection = {
  backgroundColor: '#f6f9fc',
  padding: '1px 20px',
  margin: '0 20px',
  borderRadius: '4px'
}

const summaryText = {
  ...paragraph,
  padding: '0',
  lineHeight: '20px',
  fontSize: '14px',
}

const hr = {
  borderColor: '#f0f0f0',
  margin: '20px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 20px'
};
