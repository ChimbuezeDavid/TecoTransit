import { Resend } from 'resend';

const resend = new Resend('');

resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'chimdaveo@gmail.com',
  subject: 'Hello World',
  html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
});