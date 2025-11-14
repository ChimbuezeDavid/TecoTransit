import type { PriceRule, Trip, Passenger } from '@/lib/types';
import { getTravelList } from '@/lib/data';
import { format, parseISO } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, User, Phone, Car, Bus, MessageSquare, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';

// This is now a Server Component
export default async function TravelListPage({ params }: { params: { id: string } }) {
    const priceRuleId = params.id;
    const { priceRule, trips, error } = await getTravelList(priceRuleId);

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

    if (!priceRule) {
         return (
            <div className="text-center py-10 text-destructive">
                <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-8 w-8" />
                    <span className="font-semibold">Not Found</span>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">The requested travel route could not be found.</p>
                     <Button asChild variant="outline" className="mt-4">
                        <Link href="/admin/pricing">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Pricing
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }

    const groupedTripsByDate = trips.reduce((acc, trip) => {
        const date = trip.date;
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(trip);
        return acc;
    }, {} as Record<string, Trip[]>);
    
    const VehicleIcon = priceRule?.vehicleType.includes('Bus') ? Bus : Car;

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
                                            {trip.passengers.map((passenger: Passenger) => (
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