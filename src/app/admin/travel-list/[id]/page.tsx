
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import type { PriceRule, Trip } from '@/lib/types';
import { format, parseISO } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, User, Phone, Car, Bus, MessageSquare, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';


function TravelListSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-5 w-48" />
                </div>
                <Skeleton className="h-10 w-24" />
            </div>
            {[...Array(2)].map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-5 w-52 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                                    <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...Array(3)].map((_, j) => (
                                    <TableRow key={j}>
                                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}


export default function TravelListPage() {
    const params = useParams();
    const priceRuleId = params.id as string;

    const [priceRule, setPriceRule] = useState<PriceRule | null>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch the main price rule
    useEffect(() => {
        if (!priceRuleId) {
            setError("Price rule ID is missing.");
            setLoading(false);
            return;
        }

        const ruleDocRef = doc(db, 'prices', priceRuleId);
        const unsubscribe = onSnapshot(ruleDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setPriceRule({ id: docSnap.id, ...docSnap.data() } as PriceRule);
            } else {
                setError("Price rule not found.");
                setLoading(false);
            }
        }, (e) => {
            console.error("Error fetching price rule:", e);
            setError("Failed to fetch price rule details.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [priceRuleId]);

    // Fetch trips related to this price rule
    useEffect(() => {
        if (!priceRule) return;

        const tripsQuery = query(
            collection(db, "trips"),
            where('priceRuleId', '==', priceRule.id),
            orderBy('date', 'asc'),
            orderBy('vehicleIndex', 'asc')
        );

        const unsubscribe = onSnapshot(tripsQuery, (querySnapshot) => {
            const tripsData = querySnapshot.docs.map(doc => doc.data() as Trip);
            setTrips(tripsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching trips:", err);
            setError("Could not fetch trips for this route. Your security rules might be misconfigured, or you may need to create a composite index in Firestore. Check the browser console for a link to create the required index.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [priceRule]);

    const groupedTripsByDate = useMemo(() => {
        return trips.reduce((acc, trip) => {
            const date = trip.date;
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(trip);
            return acc;
        }, {} as Record<string, Trip[]>);
    }, [trips]);
    
    const VehicleIcon = priceRule?.vehicleType.includes('Bus') ? Bus : Car;

    if (loading) {
        return <TravelListSkeleton />;
    }

    if (error) {
        return (
            <div className="text-center py-10 text-destructive">
                <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-8 w-8" />
                    <span className="font-semibold">An Error Occurred</span>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        {VehicleIcon && <VehicleIcon className="h-6 w-6 text-muted-foreground" />}
                        <h1 className="text-3xl font-bold font-headline">{priceRule?.pickup} to {priceRule?.destination}</h1>
                    </div>
                    <p className="text-muted-foreground ml-9">{priceRule?.vehicleType}</p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/admin/pricing">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Pricing
                    </Link>
                </Button>
            </div>

            {Object.keys(groupedTripsByDate).length === 0 ? (
                 <div className="text-center py-20">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Trips Scheduled Yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Paid bookings for this route will automatically create trips here.</p>
                </div>
            ) : (
                Object.entries(groupedTripsByDate).map(([date, tripsForDate]) => (
                    <div key={date}>
                        <h2 className="text-xl font-semibold mb-4 pl-1">{format(parseISO(date), 'EEEE, MMMM dd, yyyy')}</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tripsForDate.map((trip) => (
                            <Card key={trip.id}>
                                <CardHeader>
                                    <CardTitle>Car {trip.vehicleIndex}</CardTitle>
                                    <CardDescription>
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            <span>{trip.passengers.length} / {trip.capacity} passengers</span>
                                        </div>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {trip.passengers.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-4 text-center">No passengers yet.</p>
                                    ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Passenger</TableHead>
                                                <TableHead>Phone</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {trip.passengers.map(passenger => (
                                                <TableRow key={passenger.bookingId}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4 text-muted-foreground" />
                                                            <span>{passenger.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                                            <a href={`tel:${passenger.phone}`} className="hover:underline">{passenger.phone}</a>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
