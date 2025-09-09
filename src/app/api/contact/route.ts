
import { Resend } from 'resend';
import ContactEmail from '@/components/emails/contact-email';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = 'tecotransit-nonreply@gmail.com';
  const toEmail = 'your-email@example.com'; // IMPORTANT: Replace with your actual email address

  if (!resendApiKey) {
     console.error("RESEND_API_KEY environment variable not set.");
     return NextResponse.json({ error: 'Server is not configured to send emails.' }, { status: 500 });
  }

  const resend = new Resend(resendApiKey);

  try {
    const { name, email, message } = await request.json();

    // Validate input
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: `TecoTransit Contact Form <${fromEmail}>`,
      to: [toEmail], // IMPORTANT: Replace with your email address
      reply_to: email,
      subject: `New Contact Form Submission from ${name}`,
      react: ContactEmail({ name, email, message }),
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    });

    if (error) {
      console.error('Resend API Error:', error);
      return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
