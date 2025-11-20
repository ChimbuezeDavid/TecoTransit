"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Booking, Trip, Passenger } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getAllTrips, getAllBookings } from "@/lib/data";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Bus, Car, ChevronsUpDown, Loader2, MessageSquare, RefreshCw, Users, Sparkles, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User as UserIcon, Mail, Phone, MapPin, Briefcase, Calendar as CalendarIcon, Ticket, History, X } from "lucide-react";
import { getStatusVariant } from "@/lib/utils";
import { clearAllTrips } from "@/app/actions/clear-all-trips";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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
                                        <Skeleton className="h-10 w-full" />
                                    </CardContent>
                                    <CardFooter>
                                         <Skeleton className="h-9 w-full" />
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PassengerDialog({ booking, isOpen, onClose }: { booking: Booking | null; isOpen: boolean; onClose: () => void; }) {
    if (!booking) return null;
    
    const VehicleIcon = booking.vehicleType.includes('Bus') ? Bus : Car;
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="p-0 max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 pr-16 pb-4 border-b">
                    <DialogTitle className="text-xl font-semibold tracking-tight">Booking Details: {booking.id.substring(0,8)}</DialogTitle>
                    <DialogDescription>
                        Created on {format(booking.createdAt, 'PPP p')}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-3 flex-1 overflow-y-auto">
                    <div className="md:col-span-2 p-6">
                        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><UserIcon className="h-5 w-5 text-primary" />Customer</h3>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex items-center gap-3"><UserIcon className="h-4 w-4 text-muted-foreground" /><span>{booking.name}</span></li>
                                    <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span>{booking.email}</span></li>
                                    <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span>{booking.phone}</span></li>
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Car className="h-5 w-5 text-primary" />Trip</h3>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex items-start gap-3"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{booking.pickup} to {booking.destination}</span></li>
                                    <li className="flex items-start gap-3"><VehicleIcon className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{booking.vehicleType}</span></li>
                                    <li className="flex items-start gap-3"><Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{booking.luggageCount} bag(s)</span></li>
                                    {booking.tripId && (
                                        <li className="flex items-start gap-3"><Ticket className="h-4 w-4 text-muted-foreground mt-0.5" /><div><span className="font-medium text-foreground">Trip ID:</span><p className="font-mono text-xs">{booking.tripId}</p></div></li>
                                    )}
                                </ul>
                            </div>
                            <div className="space-y-4 sm:col-span-2">
                                <h3 className="font-semibold text-lg">Preferences</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-start gap-3">
                                        <CalendarIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <div><span className="font-medium text-foreground">Intended Date:</span><p>{format(parseISO(booking.intendedDate), 'PPP')}</p></div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <History className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <div><span className="font-medium text-foreground">Reschedule OK:</span><p>{booking.allowReschedule ? 'Yes' : 'No'}</p></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="md:col-span-1 bg-muted/30 flex flex-col p-6 space-y-6">
                        <div className="space-y-3">
                            <h3 className="font-semibold text-lg">Status</h3>
                            <Badge variant={getStatusVariant(booking.status)} className="text-base">{booking.status}</Badge>
                        </div>
                        <Separator/>
                        <div className="space-y-3">
                            <h3 className="font-semibold text-lg">Payment</h3>
                            <div>
                                <p className="text-xs text-muted-foreground">Amount Paid</p>
                                <p className="font-bold text-3xl text-primary">₦{booking.totalFare.toLocaleString()}</p>
                            </div>
                            {booking.paymentReference && (
                                <div>
                                    <p className="text-xs text-muted-foreground">Payment Reference</p>
                                    <p className="font-mono text-xs text-muted-foreground break-all">{booking.paymentReference}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter className="p-6 border-t">
                     <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


function ManifestSheet({ trip, passengers, allBookings, isOpen, onClose }: { trip: Trip | null, passengers: Passenger[], allBookings: Booking[], isOpen: boolean, onClose: () => void }) {
    if (!trip) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
                 <SheetHeader className="p-6 pb-4 border-b">
                    <SheetTitle className="text-xl">{trip.pickup} to {trip.destination}</SheetTitle>
                    <SheetDescription>
                        {format(parseISO(trip.date), 'EEEE, MMM dd, yyyy')} - {trip.vehicleType} (Car {trip.vehicleIndex})
                    </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                    {passengers.length === 0 ? (
                        <div className="text-center py-10">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No Passengers Yet</h3>
                            <p className="mt-1 text-sm text-muted-foreground">This trip is currently empty.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Passenger</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead className="pr-6 text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {passengers.map((passenger) => {
                                    const booking = allBookings.find(b => b.id === passenger.bookingId);
                                    return (
                                        <TableRow key={passenger.bookingId}>
                                            <TableCell className="pl-6 font-medium">{passenger.name}</TableCell>
                                            <TableCell><a href={`tel:${passenger.phone}`} className="hover:underline">{passenger.phone}</a></TableCell>
                                            <TableCell className="pr-6 text-right">
                                                {booking ? <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge> : <Badge variant="outline">Unknown</Badge>}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
                 <div className="p-6 border-t">
                    <Button onClick={onClose} variant="outline" className="w-full">Close</Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

export default function AdminTripsPage() {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [isClearing, setIsClearing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const [selectedPassengerBooking, setSelectedPassengerBooking] = useState<Booking | null>(null);
    const [isPassengerDialogOpen, setIsPassengerDialogOpen] = useState(false);

    const [selectedManifest, setSelectedManifest] = useState<Trip | null>(null);
    const [isManifestOpen, setIsManifestOpen] = useState(false);

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
    
    const handleClearTrips = async () => {
        setIsClearing(true);
        try {
            const result = await clearAllTrips();
            if (result.success) {
                toast({
                    title: "Trips Cleared",
                    description: `${result.clearedTripsCount} trips were deleted and ${result.deallocatedBookingsCount} bookings were deallocated.`,
                });
                fetchPageData();
            } else {
                throw new Error(result.error || "An unknown error occurred.");
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Clearing Failed", description: e.message });
        } finally {
            setIsClearing(false);
        }
    };
    
    const openPassengerDialog = (bookingId: string) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
            setSelectedPassengerBooking(booking);
            setIsPassengerDialogOpen(true);
        }
    }

    const openManifest = (trip: Trip) => {
        setSelectedManifest(trip);
        setIsManifestOpen(true);
    };

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
    
    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Trip Manifests</h1>
                    <p className="text-muted-foreground">View passenger lists for all scheduled trips.</p>
                </div>
                <div className="flex items-center gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isClearing || trips.length === 0}>
                                {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Clear All Trips
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action will permanently delete ALL trips and deallocate ALL passengers from them. This is useful for a "hard reset" but cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearTrips} className={cn(buttonVariants({ variant: "destructive" }))}>
                                    Yes, Clear Everything
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
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
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {tripsForDate.map((trip) => {
                                    const VehicleIcon = trip.vehicleType.includes('Bus') ? Bus : Car;
                                    const isFull = trip.passengers.length >= trip.capacity;
                                    return (
                                        <Card key={trip.id} className="flex flex-col">
                                            <CardHeader>
                                                <CardTitle className="text-lg">{trip.pickup} to {trip.destination}</CardTitle>
                                                <div className="flex items-center gap-4 pt-1 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <VehicleIcon className="h-4 w-4" />
                                                        <span>{trip.vehicleType} ({trip.vehicleIndex})</span>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex-grow">
                                                <div className="flex justify-between items-center bg-muted/50 p-3 rounded-md">
                                                    <span className="font-medium text-foreground">Passengers</span>
                                                    <Badge variant={isFull ? "default" : "secondary"}>
                                                        <Users className="h-3 w-3 mr-1.5" />
                                                        {trip.passengers.length} / {trip.capacity}
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                            <CardFooter>
                                                <Button onClick={() => openManifest(trip)} variant="outline" className="w-full">
                                                    View Manifest
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    )
                                })}
                            </div>
                        </div>
                    ))
            )}
            
            <ManifestSheet
                trip={selectedManifest}
                passengers={selectedManifest?.passengers || []}
                allBookings={bookings}
                isOpen={isManifestOpen}
                onClose={() => setIsManifestOpen(false)}
            />

            <PassengerDialog 
                booking={selectedPassengerBooking}
                isOpen={isPassengerDialogOpen}
                onClose={() => setIsPassengerDialogOpen(false)}
            />
        </div>
    );
}
