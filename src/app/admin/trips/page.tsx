
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Booking, Trip, Passenger } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getAllTrips, getAllBookings } from "@/lib/data";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Bus, Car, ChevronsUpDown, Loader2, MessageSquare, RefreshCw, Users, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User as UserIcon, Mail, Phone, MapPin, Briefcase, Calendar as CalendarIcon, Ticket, History } from "lucide-react";
import { getStatusVariant } from "@/lib/utils";

function TripsPageSkeleton() {
    return (
        <div className="space-y-8">
            <div>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
            </div>
            <div className="space-y-8">
                {[...Array(2)].map((_, i) => (
                    <div key={i}>
                        <Skeleton className="h-6 w-56 mb-4" />
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(3)].map((_, j) => (
                                <Card key={j}>
                                    <CardHeader>
                                        <Skeleton className="h-6 w-32" />
                                        <Skeleton className="h-4 w-48 mt-2" />
                                    </CardHeader>
                                    <CardContent>
                                        <Skeleton className="h-16 w-full" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AdminTripsPage() {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

    const fetchPageData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [tripsResult, bookingsResult] = await Promise.all([getAllTrips(), getAllBookings()]);
            if (tripsResult.error) throw new Error(tripsResult.error);
            if (bookingsResult.error) throw new Error(bookingsResult.error);

            setTrips(tripsResult.trips);
            setBookings(bookingsResult.bookings);
        } catch (e: any) {
            setError(e.message);
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);
    
    const openDialog = (bookingId: string) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
            setSelectedBooking(booking);
            setIsManageDialogOpen(true);
        }
    }

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

    if (loading) {
        return <TripsPageSkeleton />;
    }

    if (error) {
        return (
            <div className="text-center py-10 text-destructive">
                <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-8 w-8" />
                    <span className="font-semibold">An Error Occurred</span>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
                    <Button onClick={fetchPageData} variant="outline" className="mt-4">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }
    
    const VehicleIcon = selectedBooking?.vehicleType.includes('Bus') ? Bus : Car;

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Trip Manifests</h1>
                    <p className="text-muted-foreground">View passenger lists for all scheduled trips.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={fetchPageData} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Refresh
                    </Button>
                </div>
            </div>

            {Object.keys(groupedTripsByDate).length === 0 ? (
                <Card className="text-center py-20">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Trips Scheduled Yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">As soon as bookings are made, trips will be automatically created and shown here.</p>
                </Card>
            ) : (
                Object.entries(groupedTripsByDate)
                    .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                    .map(([date, tripsForDate]) => (
                        <div key={date}>
                            <h2 className="text-xl font-semibold mb-4 pl-1">{format(parseISO(date), 'EEEE, MMMM dd, yyyy')}</h2>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {tripsForDate.map((trip) => {
                                    const VehicleIcon = trip.vehicleType.includes('Bus') ? Bus : Car;
                                    return (
                                        <Collapsible key={trip.id} asChild>
                                            <Card className="flex flex-col">
                                                <div className="p-4 border-b rounded-t-lg flex-grow">
                                                    <CardTitle className="text-lg">{trip.pickup} to {trip.destination}</CardTitle>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <VehicleIcon className="h-4 w-4" />
                                                            <span>{trip.vehicleType} (Car {trip.vehicleIndex})</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-4 w-4" />
                                                            <span>{trip.passengers.length} / {trip.capacity}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <CollapsibleContent>
                                                    <CardContent className="p-0">
                                                        {trip.passengers.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground py-4 text-center">No passengers yet.</p>
                                                        ) : (
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead className="pl-4">Passenger</TableHead>
                                                                        <TableHead>Phone</TableHead>
                                                                        <TableHead className="pr-4 text-right">Details</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {trip.passengers.map((passenger: Passenger) => (
                                                                        <TableRow key={passenger.bookingId}>
                                                                            <TableCell className="pl-4 font-medium">
                                                                                {passenger.name}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <a href={`tel:${passenger.phone}`} className="hover:underline">{passenger.phone}</a>
                                                                            </TableCell>
                                                                            <TableCell className="pr-4 text-right">
                                                                                <Button variant="ghost" size="sm" onClick={() => openDialog(passenger.bookingId)}>View</Button>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        )}
                                                    </CardContent>
                                                </CollapsibleContent>
                                                 <CollapsibleTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="w-full justify-center rounded-t-none border-t">
                                                        <ChevronsUpDown className="h-4 w-4 mr-2" />
                                                        View Passengers
                                                    </Button>
                                                </CollapsibleTrigger>
                                            </Card>
                                        </Collapsible>
                                    )
                                })}
                            </div>
                        </div>
                    ))
            )}

            {selectedBooking && (
                <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
                    <DialogContent className="p-0 max-w-4xl max-h-[90vh] flex flex-col">
                        <DialogHeader className="p-6 pr-16 pb-4 border-b">
                            <DialogTitle className="text-xl font-semibold tracking-tight">Booking Details: {selectedBooking.id.substring(0,8)}</DialogTitle>
                            <DialogDescription>
                                Created on {format(selectedBooking.createdAt, 'PPP p')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid md:grid-cols-3 flex-1 overflow-y-auto">
                            <div className="md:col-span-2 p-6">
                                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg flex items-center gap-2"><UserIcon className="h-5 w-5 text-primary" />Customer</h3>
                                        <ul className="space-y-3 text-sm">
                                            <li className="flex items-center gap-3"><UserIcon className="h-4 w-4 text-muted-foreground" /><span>{selectedBooking.name}</span></li>
                                            <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span>{selectedBooking.email}</span></li>
                                            <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span>{selectedBooking.phone}</span></li>
                                        </ul>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg flex items-center gap-2"><Car className="h-5 w-5 text-primary" />Trip</h3>
                                        <ul className="space-y-3 text-sm">
                                            <li className="flex items-start gap-3"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{selectedBooking.pickup} to {selectedBooking.destination}</span></li>
                                            <li className="flex items-start gap-3"><VehicleIcon className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{selectedBooking.vehicleType}</span></li>
                                            <li className="flex items-start gap-3"><Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{selectedBooking.luggageCount} bag(s)</span></li>
                                            {selectedBooking.tripId && (
                                                <li className="flex items-start gap-3"><Ticket className="h-4 w-4 text-muted-foreground mt-0.5" /><div><span className="font-medium text-foreground">Trip ID:</span><p className="font-mono text-xs">{selectedBooking.tripId}</p></div></li>
                                            )}
                                        </ul>
                                    </div>
                                    <div className="space-y-4 sm:col-span-2">
                                        <h3 className="font-semibold text-lg">Preferences</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-start gap-3">
                                                <CalendarIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                <div><span className="font-medium text-foreground">Intended Date:</span><p>{format(parseISO(selectedBooking.intendedDate), 'PPP')}</p></div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <History className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                <div><span className="font-medium text-foreground">Reschedule OK:</span><p>{selectedBooking.allowReschedule ? 'Yes' : 'No'}</p></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-1 bg-muted/30 flex flex-col p-6 space-y-6">
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-lg">Status</h3>
                                    <Badge variant={getStatusVariant(selectedBooking.status)} className="text-base">{selectedBooking.status}</Badge>
                                </div>
                                <Separator/>
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-lg">Payment</h3>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Amount Paid</p>
                                        <p className="font-bold text-3xl text-primary">₦{selectedBooking.totalFare.toLocaleString()}</p>
                                    </div>
                                    {selectedBooking.paymentReference && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">Payment Reference</p>
                                            <p className="font-mono text-xs text-muted-foreground break-all">{selectedBooking.paymentReference}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="p-6 border-t">
                             <Button variant="outline" onClick={() => setIsManageDialogOpen(false)}>Close</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
