
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { format, parseISO, startOfMonth } from "date-fns";
import type { Booking, Trip, Passenger } from "@/lib/types";
import { DateRange } from "react-day-picker";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Car, Bus, Briefcase, Calendar as CalendarIcon, CheckCircle, Download, RefreshCw, Trash2, AlertCircle, Loader2, MessageSquare, Ticket, Users, Ban, HandCoins, CircleDot, Check, History, Search } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { buttonVariants } from "../ui/button";
import { useBooking } from "@/context/booking-context";
import { useAuth } from "@/context/auth-context";
import { Input } from "../ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { reSyncBookings } from "@/app/actions/resync-bookings";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";

interface DashboardData {
    trips: Trip[];
    bookings: Booking[];
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                 <div>
                    <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
                    <p className="text-muted-foreground">Review key metrics and manage customer travel lists.</p>
                </div>
                 <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-9" />
                </div>
            </div>
            
            {[...Array(2)].map((_, i) => (
            <div key={i}>
                <Skeleton className="h-6 w-48 mb-4" />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, j) => (
                    <Card key={j}>
                        <CardHeader>
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-4 w-32 mt-2" />
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                                        <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    ))}
                </div>
            </div>
            ))}
        </div>
    );
}

const getStatusVariant = (status: Booking['status']) => {
    switch (status) {
      case 'Confirmed': return 'default';
      case 'Cancelled': return 'destructive';
      case 'Paid': return 'secondary';
      case 'Pending': return 'outline';
      default: return 'outline';
    }
};
  
const getStatusIcon = (status: Booking['status']) => {
    switch (status) {
        case 'Confirmed': return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'Cancelled': return <Ban className="h-4 w-4 text-destructive" />;
        case 'Paid': return <HandCoins className="h-4 w-4 text-blue-500" />;
        case 'Pending': return <CircleDot className="h-4 w-4 text-amber-500" />;
        default: return <Check className="h-4 w-4" />;
    }
};

export default function AdminDashboard({ allBookings: initialBookings, loading: allBookingsLoading }: { allBookings: Booking[], loading: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const { updateBookingStatus, deleteBooking, deleteBookingsInRange } = useBooking();

  const [dashboardData, setDashboardData] = useState<DashboardData>({ trips: [], bookings: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Booking['status'] | 'All'>('All');
  
  const [deleteDateRange, setDeleteDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });


  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch dashboard data.');
        }
        const data: DashboardData = await response.json();
        setDashboardData(data);
    } catch (e: any) {
        setError(e.message);
        toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
        setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (user) {
        fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  const handleResync = async () => {
    setIsResyncing(true);
    toast({ title: "Re-sync Started", description: "Processing all unassigned bookings..." });
    try {
        const result = await reSyncBookings();
        toast({
            title: "Re-sync Complete",
            description: `${result.successCount} bookings successfully assigned. ${result.errorCount} failed.`,
        });
        fetchDashboardData();
    } catch (e: any) {
         toast({
            variant: "destructive",
            title: "Re-sync Failed",
            description: e.message || "An unknown error occurred during re-sync.",
        });
    } finally {
        setIsResyncing(false);
    }
  };


  const openDialog = (bookingId: string) => {
    const booking = dashboardData.bookings.find(b => b.id === bookingId);
    if (booking) {
        setSelectedBooking(booking);
        setIsManageDialogOpen(true);
    }
  }

  const handleUpdateBooking = async (status: 'Cancelled') => {
    if (!selectedBooking) return;

    setIsProcessing(prev => ({...prev, [selectedBooking.id]: true}));
    
    try {
        await updateBookingStatus(selectedBooking.id, status);
        toast({
            title: "Booking Updated",
            description: `Booking has been successfully ${status.toLowerCase()}.`,
        });
        setIsManageDialogOpen(false);
        fetchDashboardData(); // Refresh data
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: `Could not update the booking. Please try again. ${error instanceof Error ? error.message : ''}`,
        });
    } finally {
        setIsProcessing(prev => ({...prev, [selectedBooking.id]: false}));
    }
  };

  const handleDeleteBooking = async () => {
    if (!selectedBooking) return;
    setIsDeleting(true);
    try {
      await deleteBooking(selectedBooking.id);
      toast({
        title: "Booking Deleted",
        description: `Booking has been permanently deleted.`,
      });
      setIsManageDialogOpen(false);
      fetchDashboardData(); // Refresh data
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Could not delete the booking. Please try again.",
      });
    } finally {
        setIsDeleting(false);
    }
  };
  
  const handleBulkDelete = async () => {
    if (!deleteDateRange?.from || !deleteDateRange?.to) {
        toast({ variant: "destructive", title: "Invalid Date Range" });
        return;
    }
    setIsBulkDeleting(true);
    try {
        const count = await deleteBookingsInRange(deleteDateRange.from, deleteDateRange.to);
        toast({
            title: "Bulk Delete Successful",
            description: `${count} booking(s) from ${format(deleteDateRange.from, 'PPP')} to ${format(deleteDateRange.to, 'PPP')} have been deleted.`,
        });
        fetchDashboardData();
    } catch (e: any) {
        toast({ variant: "destructive", title: "Bulk Delete Failed", description: e.message });
    } finally {
        setIsBulkDeleting(false);
    }
  };
  
  const downloadCSV = () => {
    if (filteredBookings.length === 0) {
        toast({ title: "No data to export" });
        return;
    }
    const headers = ["ID", "Name", "Email", "Phone", "Pickup", "Destination", "Intended Date", "Vehicle", "Luggage", "Total Fare", "Allows Reschedule", "Payment Reference", "Status", "Confirmed Date", "Created At", "Trip ID"];
    const csvContent = [
        headers.join(','),
        ...filteredBookings.map(b => [
            b.id,
            `"${b.name.replace(/"/g, '""')}"`,
            b.email,
            b.phone,
            `"${b.pickup.replace(/"/g, '""')}"`,
            `"${b.destination.replace(/"/g, '""')}"`,
            b.intendedDate,
            `"${b.vehicleType.replace(/"/g, '""')}"`,
            b.luggageCount,
            b.totalFare,
            b.allowReschedule,
            b.paymentReference || "",
            b.status,
            b.confirmedDate || "",
            new Date(b.createdAt).toISOString(),
            b.tripId || "",
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings-${statusFilter.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const groupedTripsByDate = useMemo(() => {
    return dashboardData.trips.reduce((acc, trip) => {
        const date = trip.date;
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(trip);
        return acc;
    }, {} as Record<string, Trip[]>);
  }, [dashboardData.trips]);
  
  const filteredBookings = useMemo(() => {
    return dashboardData.bookings.filter(booking => {
        const matchesStatus = statusFilter === 'All' || booking.status === statusFilter;
        const matchesSearch = searchTerm === "" ||
            booking.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });
  }, [dashboardData.bookings, searchTerm, statusFilter]);

  const VehicleIcon = selectedBooking?.vehicleType.includes('Bus') ? Bus : Car;
  
  if (loading || authLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
      return (
        <div className="text-center py-10 text-destructive">
            <div className="flex flex-col items-center gap-2">
                <AlertCircle className="h-8 w-8" />
                <span className="font-semibold">An Error Occurred</span>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
                 <Button onClick={fetchDashboardData} variant="outline" className="mt-4">
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
                <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
                <p className="text-muted-foreground">Manage trips, view passenger lists, and oversee all bookings.</p>
            </div>
             <div className="flex items-center gap-2 self-start sm:self-center">
                <Button variant="outline" size="icon" onClick={fetchDashboardData} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" ><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Bookings in Date Range</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete all bookings created within the selected date range. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="grid gap-2 py-4">
                            <Label>Select Date Range</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                    "justify-start text-left font-normal",
                                    !deleteDateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {deleteDateRange?.from ? (
                                    deleteDateRange.to ? (
                                        <>
                                        {format(deleteDateRange.from, "LLL dd, y")} -{" "}
                                        {format(deleteDateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(deleteDateRange.from, "LLL dd, y")
                                    )
                                    ) : (
                                    <span>Pick a date</span>
                                    )}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={deleteDateRange?.from}
                                    selected={deleteDateRange}
                                    onSelect={setDeleteDateRange}
                                    numberOfMonths={2}
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className={cn(buttonVariants({variant: 'destructive'}))}>
                                {isBulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
      
       <Tabs defaultValue="trips" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="trips">Trips View</TabsTrigger>
                <TabsTrigger value="bookings">All Bookings</TabsTrigger>
            </TabsList>
            <TabsContent value="trips" className="mt-6">
                {Object.keys(groupedTripsByDate).length === 0 ? (
                    <Card className="text-center py-20">
                        <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No Trips Scheduled Yet</h3>
                        <p className="mt-1 text-sm text-muted-foreground">As soon as bookings are made, trips will be automatically created here.</p>
                    </Card>
                ) : (
                    Object.entries(groupedTripsByDate).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime()).map(([date, tripsForDate]) => (
                        <div key={date} className="mb-8">
                            <h2 className="text-xl font-semibold mb-4 pl-1">{format(parseISO(date), 'EEEE, MMMM dd, yyyy')}</h2>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tripsForDate.map((trip) => {
                                const VehicleIcon = trip.vehicleType.includes('Bus') ? Bus : Car;
                                return (
                                <Collapsible key={trip.id} asChild>
                                    <Card>
                                        <CollapsibleTrigger asChild>
                                            <div className="p-4 border-b cursor-pointer hover:bg-muted/50 rounded-t-lg">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-lg">{trip.pickup} to {trip.destination}</CardTitle>
                                                    <Button variant="ghost" size="sm" className="w-9 p-0">
                                                        <Users className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                 <CardDescription className="flex items-center gap-4 mt-2">
                                                    <div className="flex items-center gap-2">
                                                        <VehicleIcon className="h-4 w-4" />
                                                        <span>{trip.vehicleType} (Car {trip.vehicleIndex})</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-4 w-4" />
                                                        <span>{trip.passengers.length} / {trip.capacity}</span>
                                                    </div>
                                                </CardDescription>
                                            </div>
                                        </CollapsibleTrigger>
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
                                    </Card>
                                </Collapsible>
                            )
                            })}
                            </div>
                        </div>
                    ))
                )}
            </TabsContent>
            <TabsContent value="bookings" className="mt-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <CardTitle>All Bookings</CardTitle>
                                <CardDescription>Search and manage all customer bookings. Use Re-Sync to assign existing bookings to trips.</CardDescription>
                            </div>
                             <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleResync} disabled={isResyncing}>
                                    {isResyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <History className="mr-2 h-4 w-4"/>}
                                    Re-Sync Bookings
                                </Button>
                                <Button variant="outline" size="sm" onClick={downloadCSV}><Download className="mr-2 h-4 w-4" />Export Filtered</Button>
                             </div>
                        </div>
                        <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
                            <div className="relative w-full sm:max-w-xs">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search by name, email, ID..."
                                    className="pl-8 w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Statuses</SelectItem>
                                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                                    <SelectItem value="Paid">Paid</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                         <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-4">Customer</TableHead>
                                        <TableHead>Route</TableHead>
                                        <TableHead>Intended Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="pr-4 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBookings.length > 0 ? filteredBookings.map(booking => (
                                        <TableRow key={booking.id}>
                                            <TableCell className="pl-4 font-medium">
                                                <div className="font-medium">{booking.name}</div>
                                                <div className="text-sm text-muted-foreground">{booking.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div>{booking.pickup}</div>
                                                <div className="text-sm text-muted-foreground">to {booking.destination}</div>
                                            </TableCell>
                                            <TableCell>{format(parseISO(booking.intendedDate), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(booking.status)} className="gap-1.5 pl-1.5">
                                                    {getStatusIcon(booking.status)}
                                                    {booking.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="pr-4 text-right">
                                                <Button variant="ghost" size="sm" onClick={() => openDialog(booking.id)}>View</Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                No bookings found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                         </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>


      {selectedBooking && (
        <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
            <DialogContent className="p-0 max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 pr-16 pb-4 border-b">
                    <div className="flex items-center justify-between gap-4">
                        <DialogTitle className="text-xl font-semibold tracking-tight">Manage Booking: {selectedBooking.id.substring(0,8)}</DialogTitle>
                         <div className="flex items-center gap-2">
                            {getStatusIcon(selectedBooking.status)}
                            <Badge variant={getStatusVariant(selectedBooking.status)}>{selectedBooking.status}</Badge>
                         </div>
                    </div>
                     <DialogDescription>
                        Created on {format(selectedBooking.createdAt, 'PPP p')}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-3 flex-1 overflow-y-auto">
                     <div className="md:col-span-2 p-6">
                        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Customer Details */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">Customer</h3>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><span>{selectedBooking.name}</span></li>
                                    <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span>{selectedBooking.email}</span></li>
                                    <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span>{selectedBooking.phone}</span></li>
                                </ul>
                            </div>

                            {/* Trip Details */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">Trip</h3>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex items-start gap-3"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{selectedBooking.pickup} to {selectedBooking.destination}</span></li>
                                    <li className="flex items-start gap-3"><VehicleIcon className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{selectedBooking.vehicleType}</span></li>
                                    <li className="flex items-start gap-3"><Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{selectedBooking.luggageCount} bag(s)</span></li>
                                    {selectedBooking.tripId && (
                                        <li className="flex items-start gap-3"><Ticket className="h-4 w-4 text-muted-foreground mt-0.5" /><div><span className="font-medium text-foreground">Trip ID:</span><p className="font-mono text-xs">{selectedBooking.tripId}</p></div></li>
                                    )}
                                </ul>
                            </div>
                            
                            {/* Departure Dates */}
                            <div className="space-y-4 sm:col-span-2">
                                <h3 className="font-semibold text-lg">Preferences</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-start gap-3">
                                        <CalendarIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <div>
                                            <span className="font-medium text-foreground">Intended Date:</span>
                                            <p>{format(parseISO(selectedBooking.intendedDate), 'PPP')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <History className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <div>
                                            <span className="font-medium text-foreground">Reschedule OK:</span>
                                            <p>{selectedBooking.allowReschedule ? 'Yes' : 'No'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Panel */}
                    <div className="md:col-span-1 bg-muted/30 flex flex-col">
                        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                            {/* Fare Details */}
                             <div className="space-y-3">
                                <h3 className="font-semibold text-lg">Payment Details</h3>
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
                            
                            <Separator/>

                            {selectedBooking.status === 'Confirmed' && (
                                <div className="flex items-center gap-3 text-primary font-semibold p-3 bg-primary/10 rounded-lg">
                                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                                    <span>Confirmed for: {selectedBooking.confirmedDate ? format(parseISO(selectedBooking.confirmedDate), 'PPP') : 'N/A'}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                 <DialogFooter className="flex-wrap items-center justify-between sm:flex-row sm:justify-between p-6 border-t bg-muted/30 gap-2">
                    <div>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="link" size="sm" className="text-destructive hover:text-destructive h-auto p-0" disabled={isDeleting}>
                                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4"/>}
                                    <span>Delete Booking</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This action cannot be undone. This will permanently delete this booking record from our servers.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteBooking} className={cn(buttonVariants({ variant: "destructive" }))}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
                        {selectedBooking.status !== 'Cancelled' ? (
                            <>
                                <Button variant="secondary" className="w-full" size="lg" onClick={() => handleUpdateBooking('Cancelled')} disabled={isProcessing[selectedBooking.id]}>
                                    {isProcessing[selectedBooking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                                    Cancel Booking
                                </Button>
                            </>
                        ) : (
                            <Button variant="outline" size="lg" className="w-full" onClick={() => setIsManageDialogOpen(false)}>Close</Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

    