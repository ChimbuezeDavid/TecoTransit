
import 'server-only';
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import type { PriceRule, Trip } from '@/lib/types';

export async function getTravelList(priceRuleId: string): Promise<{
    priceRule: PriceRule | null;
    trips: Trip[];
    error: string | null;
}> {
    const db = getFirebaseAdmin()?.firestore();
    if (!db) {
        return { priceRule: null, trips: [], error: 'Database connection failed.' };
    }

    if (!priceRuleId) {
        return { priceRule: null, trips: [], error: 'Price rule ID is missing.' };
    }

    try {
        const ruleDocRef = db.doc(`prices/${priceRuleId}`);
        const tripsQuery = db.collection("trips")
            .where('priceRuleId', '==', priceRuleId)
            .orderBy('date', 'asc')
            .orderBy('vehicleIndex', 'asc');
        
        // Fetch both in parallel
        const [ruleSnap, tripsSnapshot] = await Promise.all([
            ruleDocRef.get(),
            tripsQuery.get()
        ]);
        
        if (!ruleSnap.exists) {
            return { priceRule: null, trips: [], error: 'Price rule not found.' };
        }

        const priceRule = { id: ruleSnap.id, ...ruleSnap.data() } as PriceRule;
        const trips = tripsSnapshot.docs.map(doc => doc.data() as Trip);

        return { priceRule, trips, error: null };

    } catch (error: any) {
        console.error("API Error fetching travel list:", error);
        return { priceRule: null, trips: [], error: 'An internal server error occurred.' };
    }
}
