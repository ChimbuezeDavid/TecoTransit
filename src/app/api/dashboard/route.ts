
import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/data';

export async function GET(request: Request) {
  
  const { trips, bookings, error } = await getDashboardData();

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ trips, bookings });
}

    