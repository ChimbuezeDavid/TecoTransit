
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import type { PriceRule, Booking } from '@/lib/types';
import { format, parseISO } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, User, Phone, Car, Bus, MessageSquare } from 'lucide-react';
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
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                                    <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                                    <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...Array(3)].map((_, j) => (
                                    <TableRow key={j}>
                                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
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
    const id = params.id as string;

    const [priceRule, setPriceRule] = useState<PriceRule | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setError("Price rule ID is missing.");
            setLoading(false);
            return;
        }

        const fetchPriceRule = async () => {
            const ruleDocRef = doc(db, 'prices', id);
            try {
                const ruleDocSnap = await getDoc(ruleDocRef);
                if (ruleDocSnap.exists()) {
                    const ruleData = { id: ruleDocSnap.id, ...ruleDocSnap.data() } as PriceRule;
                    setPriceRule(ruleData);
                } else {
                    setError("Price rule not found.");
                }
            } catch (e) {
                console.error("Error fetching price rule:", e);
                setError("Failed to fetch price rule details.");
            }
        };

        fetchPriceRule();
    }, [id]);

    useEffect(() => {
        if (!priceRule) return;

        const bookingsQuery = query(
            collection(db, "bookings"),
            where('pickup', '==', priceRule.pickup),
            where('destination', '==', priceRule.destination),
            where('vehicleType', '==', priceRule.vehicleType),
            where('status', 'in', ['Paid', 'Confirmed']),
            orderBy('intendedDate', 'asc'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(bookingsQuery, (querySnapshot) => {
            const bookingsData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                } as Booking;
            });
            setBookings(bookingsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching bookings:", err);
            setError("Could not fetch bookings for this route.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [priceRule]);

    const groupedBookings = useMemo(() => {
        return bookings.reduce((acc, booking) => {
            const date = booking.intendedDate;
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(booking);
            return acc;
        }, {} as Record<string, Booking[]>);
    }, [bookings]);

    const getStatusVariant = (status: Booking['status']) => {
        switch (status) {
          case 'Confirmed': return 'default';
          case 'Paid': return 'secondary';
          default: return 'outline';
        }
    };
    
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

            {Object.keys(groupedBookings).length === 0 ? (
                 <div className="text-center py-20">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Bookings Yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">There are no 'Paid' or 'Confirmed' bookings for this route.</p>
                </div>
            ) : (
                Object.entries(groupedBookings).map(([date, bookingsForDate]) => (
                    <Card key={date}>
                        <CardHeader>
                            <CardTitle>{format(parseISO(date), 'EEEE, MMMM dd, yyyy')}</CardTitle>
                            <CardDescription>{bookingsForDate.length} passenger(s) scheduled.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Passenger</TableHead>
                                        <TableHead>Phone Number</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bookingsForDate.map(booking => (
                                        <TableRow key={booking.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <span>{booking.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                     <Phone className="h-4 w-4 text-muted-foreground" />
                                                     <a href={`tel:${booking.phone}`} className="hover:underline">{booking.phone}</a>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}

    