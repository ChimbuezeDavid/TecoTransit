
import * as React from 'react';

interface ContactEmailProps {
  name: string;
  email: string;
  message: string;
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

const blockquote: React.CSSProperties = {
    padding: '10px 20px',
    margin: '0 0 20px',
    borderLeft: '4px solid #e2e8f0',
    backgroundColor: '#f8fafc',
}

const strong: React.CSSProperties = {
  color: '#1e293b',
};

const footer: React.CSSProperties = {
  marginTop: '24px',
  textAlign: 'center',
  fontSize: '12px',
  color: '#64748b',
};

const ContactEmail: React.FC<Readonly<ContactEmailProps>> = ({ name, email, message }) => {
  return (
    <div style={container}>
      <div style={card}>
        <h1 style={h1}>New Contact Form Submission</h1>
        <p style={p}>You have received a new message from your website's contact form.</p>
        
        <ul style={{ listStyleType: 'none', padding: 0 }}>
            <li style={p}><strong>From:</strong> {name}</li>
            <li style={p}><strong>Email:</strong> <a href={`mailto:${email}`}>{email}</a></li>
        </ul>

        <h2 style={{...h1, fontSize: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px'}}>Message:</h2>
        <div style={blockquote}>
            <p style={{...p, whiteSpace: 'pre-wrap'}}>{message}</p>
        </div>
        
        <div style={footer}>
          This email was sent from the TecoTransit contact form.
        </div>
      </div>
    </div>
  );
};

export default ContactEmail;
