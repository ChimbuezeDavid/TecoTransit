import { Resend } from 'resend';

const resend = new Resend('re_Cdi3K9H5_9r4EWyehA8xfkh6gKobSUZwL');

resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'chimdaveo@gmail.com',
  subject: 'Hello World',
  html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
});