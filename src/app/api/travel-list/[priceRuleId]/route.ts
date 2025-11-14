import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { NextResponse } from 'next/server';
import type { PriceRule, Trip } from '@/lib/types';

export async function GET(
    request: Request,
    { params }: { params: { priceRuleId: string } }
) {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        return NextResponse.json({ error: 'Database connection failed.' }, { status: 500 });
    }

    const { priceRuleId } = params;

    if (!priceRuleId) {
        return NextResponse.json({ error: 'Price rule ID is missing.' }, { status: 400 });
    }

    try {
        const ruleDocRef = db.doc(`prices/${priceRuleId}`);
        const ruleSnap = await ruleDocRef.get();

        if (!ruleSnap.exists) {
            return NextResponse.json({ error: 'Price rule not found.' }, { status: 404 });
        }

        const priceRule = { id: ruleSnap.id, ...ruleSnap.data() } as PriceRule;

        const tripsQuery = db.collection("trips")
            .where('priceRuleId', '==', priceRuleId)
            .orderBy('date', 'asc')
            .orderBy('vehicleIndex', 'asc');
        
        const tripsSnapshot = await tripsQuery.get();
        const trips = tripsSnapshot.docs.map(doc => doc.data() as Trip);

        return NextResponse.json({ priceRule, trips });

    } catch (error: any) {
        console.error("API Error fetching travel list:", error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
