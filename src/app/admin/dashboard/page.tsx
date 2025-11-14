
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Booking, Trip } from "@/lib/types";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowRight, BookOpenCheck, Car, ListOrdered, Loader2, RefreshCw, Users } from "lucide-react";
import Link from "next/link";
import { getStatusVariant } from "@/lib/utils";

interface DashboardStats {
  upcomingTrips: number;
  totalPassengers: number;
  pendingBookings: number;
  confirmedBookings: number;
}

interface RecentActivity {
    trips: Trip[];
    bookings: Booking[];
}

function DashboardSkeleton() {
    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
                <p className="text-muted-foreground">An overview of your operations.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-6 w-6" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-10 w-20" />
                            <Skeleton className="h-4 w-40 mt-2" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent>
                       <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="ml-4 space-y-1">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                    <Skeleton className="ml-auto h-5 w-16" />
                                </div>
                            ))}
                       </div>
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                             {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="ml-4 space-y-1">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                    <Skeleton className="ml-auto h-5 w-16" />
                                </div>
                            ))}
                       </div>
                    </CardContent>
                 </Card>
            </div>
        </div>
    );
}


export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/dashboard');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch dashboard data.');
            }
            const data: { stats: DashboardStats; recentActivity: RecentActivity } = await response.json();
            setStats(data.stats);
            setRecentActivity(data.recentActivity);
        } catch (e: any) {
            setError(e.message);
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    if (loading) {
        return <DashboardSkeleton />;
    }

    if (error || !stats || !recentActivity) {
        return (
            <div className="text-center py-10 text-destructive">
                <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-8 w-8" />
                    <span className="font-semibold">An Error Occurred</span>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">{error || "Could not load dashboard data."}</p>
                    <Button onClick={fetchDashboardData} variant="outline" className="mt-4">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }
    
    const statCards = [
        { title: "Upcoming Trips", value: stats.upcomingTrips, icon: Car, description: "Total trips scheduled." },
        { title: "Total Passengers", value: stats.totalPassengers, icon: Users, description: "Seats booked on upcoming trips." },
        { title: "Pending Bookings", value: stats.pendingBookings, icon: ListOrdered, description: "Bookings awaiting action." },
        { title: "Confirmed Bookings", value: stats.confirmedBookings, icon: BookOpenCheck, description: "Bookings confirmed for travel." },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
                    <p className="text-muted-foreground">A quick overview of your transport operations.</p>
                </div>
                <Button variant="outline" onClick={fetchDashboardData} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />}
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map(card => (
                    <Card key={card.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                            <card.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                            <p className="text-xs text-muted-foreground">{card.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                 <Card>
                    <CardHeader>
                        <CardTitle>Upcoming Trips</CardTitle>
                        <CardDescription>A preview of the next few scheduled trips.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Route</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Passengers</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentActivity.trips.length > 0 ? (
                                    recentActivity.trips.map(trip => (
                                        <TableRow key={trip.id}>
                                            <TableCell>
                                                <div className="font-medium">{trip.pickup}</div>
                                                <div className="text-sm text-muted-foreground">to {trip.destination}</div>
                                            </TableCell>
                                            <TableCell>{format(new Date(trip.date), 'MMM dd')}</TableCell>
                                            <TableCell className="text-right">{trip.passengers.length}/{trip.capacity}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">No upcoming trips.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                       </Table>
                    </CardContent>
                     <CardFooter>
                        <Button asChild className="w-full">
                            <Link href="/admin/trips">View All Trips <ArrowRight className="ml-2" /></Link>
                        </Button>
                     </CardFooter>
                 </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Recent Bookings</CardTitle>
                        <CardDescription>The latest bookings made by customers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Intended Date</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentActivity.bookings.length > 0 ? (
                                    recentActivity.bookings.map(booking => (
                                        <TableRow key={booking.id}>
                                            <TableCell>
                                                <div className="font-medium">{booking.name}</div>
                                                <div className="text-sm text-muted-foreground">{booking.email}</div>
                                            </TableCell>
                                            <TableCell>{format(new Date(booking.intendedDate), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">No recent bookings.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                       </Table>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full">
                           <Link href="/admin/bookings">Manage All Bookings <ArrowRight className="ml-2" /></Link>
                        </Button>
                    </CardFooter>
                 </Card>
            </div>
        </div>
    );
}
