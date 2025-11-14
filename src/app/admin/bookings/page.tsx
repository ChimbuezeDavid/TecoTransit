
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { format, parseISO, startOfMonth } from "date-fns";
import type { Booking } from "@/lib/types";
import { DateRange } from "react-day-picker";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Car, Bus, Briefcase, Calendar as CalendarIcon, CheckCircle, Download, RefreshCw, Trash2, AlertCircle, Loader2, Ticket, History, Search, HandCoins, CircleDot, Check, Ban } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBooking } from "@/context/booking-context";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reSyncBookings } from "@/app/actions/resync-bookings";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { getAllBookings } from "@/lib/data";
import { getStatusVariant } from "@/lib/utils";


function BookingsPageSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72 mt-2" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-9" />
                </div>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between">
                         <Skeleton className="h-6 w-56" />
                         <Skeleton className="h-6 w-32" />
                    </div>
                     <div className="mt-4 flex items-center gap-2">
                        <Skeleton className="h-9 w-64" />
                        <Skeleton className="h-9 w-40" />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-16" /></TableHead>
                                <TableHead className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(10)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

const getStatusIcon = (status: Booking['status']) => {
    switch (status) {
        case 'Confirmed': return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'Cancelled': return <Ban className="h-4 w-4 text-destructive" />;
        case 'Paid': return <HandCoins className="h-4 w-4 text-blue-500" />;
        case 'Pending': return <CircleDot className="h-4 w-4 text-amber-500" />;
        default: return <Check className="h-4 w-4" />;
    }
};

export default function AdminBookingsPage() {
  const { updateBookingStatus, deleteBooking, deleteBookingsInRange } = useBooking();

  const [bookings, setBookings] = useState<Booking[]>([]);
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


  const fetchBookingsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
        const { bookings, error } = await getAllBookings();
        if (error) throw new Error(error);
        setBookings(bookings);
    } catch (e: any) {
        setError(e.message);
        toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
        setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchBookingsData();
  }, [fetchBookingsData]);

  const handleResync = async () => {
    setIsResyncing(true);
    toast({ title: "Re-sync Started", description: "Processing all unassigned bookings..." });
    try {
        const result = await reSyncBookings();
        toast({
            title: "Re-sync Complete",
            description: `${result.successCount} bookings successfully assigned. ${result.errorCount} failed.`,
        });
        fetchBookingsData();
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
    const booking = bookings.find(b => b.id === bookingId);
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
        fetchBookingsData(); // Refresh data
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
      fetchBookingsData(); // Refresh data
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
        fetchBookingsData();
    } catch (e: any) {
        toast({ variant: "destructive", title: "Bulk Delete Failed", description: e.message });
    } finally {
        setIsBulkDeleting(false);
    }
  };
  
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
        const matchesStatus = statusFilter === 'All' || booking.status === statusFilter;
        const matchesSearch = searchTerm === "" ||
            booking.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });
  }, [bookings, searchTerm, statusFilter]);

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
  
  if (loading) {
    return <BookingsPageSkeleton />;
  }

  if (error) {
      return (
        <div className="text-center py-10 text-destructive">
            <div className="flex flex-col items-center gap-2">
                <AlertCircle className="h-8 w-8" />
                <span className="font-semibold">An Error Occurred</span>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
                 <Button onClick={fetchBookingsData} variant="outline" className="mt-4">
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
                <h1 className="text-3xl font-bold font-headline">Manage Bookings</h1>
                <p className="text-muted-foreground">Search, manage, and export all customer bookings.</p>
            </div>
             <div className="flex items-center gap-2 self-start sm:self-center">
                <Button variant="outline" size="icon" onClick={fetchBookingsData} disabled={loading}>
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
      
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <CardTitle>All Bookings ({filteredBookings.length})</CardTitle>
                        <CardDescription>Use Re-Sync to assign any unassigned bookings to a trip.</CardDescription>
                    </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" className="w-full" size="sm" onClick={handleResync} disabled={isResyncing}>
                            {isResyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <History className="mr-2 h-4 w-4"/>}
                            Re-Sync Bookings
                        </Button>
                        <Button variant="outline" className="w-full" size="sm" onClick={downloadCSV}><Download className="mr-2 h-4 w-4" />Export</Button>
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
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">Customer</h3>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><span>{selectedBooking.name}</span></li>
                                    <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span>{selectedBooking.email}</span></li>
                                    <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span>{selectedBooking.phone}</span></li>
                                </ul>
                            </div>

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
                    
                    <div className="md:col-span-1 bg-muted/30 flex flex-col">
                        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
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
