'use server';

import { NextResponse } from 'next/server';
import { rescheduleUnderfilledTrips } from '@/app/actions/reschedule-bookings';

// This is a security measure to ensure that only trusted services (like Vercel Cron Jobs) can run this function.
// The `CRON_SECRET` must be set in your environment variables.
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  try {
    const result = await rescheduleUnderfilledTrips();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
