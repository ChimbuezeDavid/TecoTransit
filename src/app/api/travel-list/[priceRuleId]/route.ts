
import { NextResponse } from 'next/server';
import { getTravelList } from '@/lib/data';

export async function GET(
  request: Request,
  { params }: { params: { priceRuleId: string } }
) {
  const priceRuleId = params.priceRuleId;

  if (!priceRuleId) {
    return NextResponse.json({ error: 'Price rule ID is required' }, { status: 400 });
  }

  const { priceRule, trips, error } = await getTravelList(priceRuleId);

  if (error) {
    return NextResponse.json({ error }, { status: 404 });
  }

  return NextResponse.json({ priceRule, trips });
}
