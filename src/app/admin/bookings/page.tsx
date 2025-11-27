
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { format, parseISO, startOfMonth, subDays } from "date-fns";
import type { Booking, BookingsQueryResult } from "@/lib/types";
import { DateRange } from "react-day-picker";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Car, Bus, Briefcase, Calendar as CalendarIcon, CheckCircle, Download, RefreshCw, Trash2, AlertCircle, Loader2, Ticket, History, Search, HandCoins, Ban, CircleDot, Check, CreditCard, EllipsisVertical, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { getAllBookings, getBookingsPage } from "@/lib/data";
import { getStatusVariant } from "@/lib/utils";
import { updateBookingStatus, deleteBooking, deleteBookingsInRange, requestRefund, manuallyRescheduleBooking } from "@/app/actions/booking-actions";
import { synchronizeAndCreateTrips } from "@/app/actions/synchronize-bookings";
import { rescheduleUnderfilledTrips } from "@/app/actions/reschedule-bookings";

type BulkDeleteMode = 'all' | '7d' | '30d' | 'custom';
const PAGE_SIZE = 25;

type PageCursor = {
    createdAt: number;
    id: string;
} | null;


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
        case 'Refunded': return <CreditCard className="h-4 w-4 text-slate-500" />;
        default: return <Check className="h-4 w-4" />;
    }
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [lastVisible, setLastVisible] = useState<PageCursor>(null);
  const [pageCursors, setPageCursors] = useState<PageCursor[]>([null]);


  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Booking['status'] | 'All'>('All');
  
  const [deleteDateRange, setDeleteDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [isCustomDeleteOpen, setIsCustomDeleteOpen] = useState(false);

  const [newRescheduleDate, setNewRescheduleDate] = useState<Date | undefined>();
  const [isRescheduleConfirmOpen, setIsRescheduleConfirmOpen] = useState(false);


  const fetchBookingsData = useCallback(async (direction: 'next' | 'prev' | 'refresh' = 'refresh') => {
    setLoading(true);
    setError(null);
    
    let cursor: PageCursor;
    let newPage = page;
    
    if (direction === 'next') {
        cursor = lastVisible;
        newPage = page + 1;
    } else if (direction === 'prev') {
        cursor = pageCursors[page - 2] || null; // page - 2 because page is 1-indexed
        newPage = page - 1;
    } else { // refresh
        cursor = null;
        newPage = 1;
        setPageCursors([null]);
    }

    try {
        const result: BookingsQueryResult = await getBookingsPage({
            limit: PAGE_SIZE,
            startAfter: cursor,
            status: statusFilter === 'All' ? undefined : statusFilter,
        });
        
        if (result.error) throw new Error(result.error);
        
        setBookings(result.bookings);
        
        const newLastVisible = result.bookings.length > 0 ? {
            createdAt: result.bookings[result.bookings.length - 1].createdAt,
            id: result.bookings[result.bookings.length - 1].id
        } : null;
        setLastVisible(newLastVisible);

        setHasMore(result.bookings.length === PAGE_SIZE);
        setPage(newPage);

        if (direction === 'next' && newLastVisible) {
            setPageCursors(prev => [...prev, newLastVisible]);
        } else if (direction === 'prev') {
            setPageCursors(prev => prev.slice(0, newPage));
        }

    } catch (e: any) {
        setError(e.message);
        toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
        setLoading(false);
    }
  }, [toast, lastVisible, page, pageCursors, statusFilter]);
  
  useEffect(() => {
    fetchBookingsData('refresh');
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const refreshCurrentPage = () => {
    // This will refetch the data for the current page and filter
    fetchBookingsData('refresh');
  }


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
        refreshCurrentPage();
        setIsManageDialogOpen(false);
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
  
  const handleRequestRefund = async () => {
    if (!selectedBooking) return;

    setIsProcessing(prev => ({ ...prev, refund: true }));
    try {
        const result = await requestRefund(selectedBooking.id);
        if (result.success) {
            toast({
                title: "Refund Request Sent",
                description: "An email has been sent to the admin to process the refund.",
            });
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Refund Request Failed",
            description: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
    } finally {
        setIsProcessing(prev => ({ ...prev, refund: false }));
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
      refreshCurrentPage();
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
  
  const handleBulkDelete = async (mode: BulkDeleteMode) => {
    let from: Date | null = null;
    let to: Date | null = new Date();
    let description = '';

    switch (mode) {
        case 'all':
            from = null;
            to = null;
            description = 'all bookings';
            break;
        case '7d':
            from = subDays(to, 7);
            description = `bookings from the last 7 days`;
            break;
        case '30d':
            from = subDays(to, 30);
            description = `bookings from the last 30 days`;
            break;
        case 'custom':
            if (!deleteDateRange?.from || !deleteDateRange?.to) {
                toast({ variant: "destructive", title: "Invalid Date Range" });
                return;
            }
            from = deleteDateRange.from;
            to = deleteDateRange.to;
            description = `bookings from ${format(from, 'PPP')} to ${format(to, 'PPP')}`;
            break;
    }

    setIsBulkDeleting(true);
    try {
        const count = await deleteBookingsInRange(from, to);
        toast({
            title: "Bulk Delete Successful",
            description: `${count} ${description} have been deleted.`,
        });
        refreshCurrentPage();
    } catch (e: any) {
        toast({ variant: "destructive", title: "Bulk Delete Failed", description: e.message });
    } finally {
        setIsBulkDeleting(false);
        setIsCustomDeleteOpen(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
        const result = await synchronizeAndCreateTrips();
        if (result.failed > 0) {
             toast({
                variant: "destructive",
                title: `Synchronization Partially Failed`,
                description: `${result.succeeded} succeeded, but ${result.failed} failed. Check console for errors.`,
            });
        } else if (result.succeeded > 0) {
             toast({
                title: "Synchronization Complete",
                description: `${result.succeeded} booking(s) successfully processed and assigned to trips.`,
            });
        } else {
             toast({
                title: "Nothing to Synchronize",
                description: "All relevant bookings are already assigned to trips.",
            });
        }
        refreshCurrentPage();
    } catch (e: any) {
        toast({ variant: "destructive", title: "Synchronization Error", description: e.message });
    } finally {
        setIsSyncing(false);
    }
  }

  const handleRunReschedule = async () => {
    setIsRescheduling(true);
    try {
        const result = await rescheduleUnderfilledTrips();
        let description = `Scanned ${result.totalTripsScanned} of yesterday's trips.`;
        if (result.rescheduledCount > 0) {
            description += ` Successfully rescheduled ${result.rescheduledCount} passenger(s).`;
        }
        if (result.failedCount > 0) {
             toast({
                variant: "destructive",
                title: `Reschedule Job Partially Failed`,
                description: `Rescheduled ${result.rescheduledCount}, but ${result.failedCount} failed. Check server logs for errors.`,
            });
        } else if (result.totalPassengersToProcess === 0) {
            toast({
                title: "Nothing to Reschedule",
                description: "No passengers were found on under-filled trips from yesterday.",
            });
        } else {
            toast({
                title: "Reschedule Job Complete",
                description: description,
            });
        }
        refreshCurrentPage();
    } catch (e: any) {
        toast({ variant: "destructive", title: "Reschedule Error", description: e.message });
    } finally {
        setIsRescheduling(false);
    }
  };

  const handleManualReschedule = async () => {
    if (!selectedBooking || !newRescheduleDate) {
        toast({ variant: "destructive", title: "Error", description: "No booking or date selected." });
        return;
    }
    
    setIsProcessing(prev => ({...prev, reschedule: true}));
    try {
        const result = await manuallyRescheduleBooking(selectedBooking.id, format(newRescheduleDate, 'yyyy-MM-dd'));
        if (result.success) {
            toast({ title: "Booking Rescheduled", description: `Booking has been moved to ${format(newRescheduleDate, 'PPP')}.` });
            setIsManageDialogOpen(false);
            refreshCurrentPage();
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Reschedule Failed", description: error.message });
    } finally {
        setIsProcessing(prev => ({...prev, reschedule: false}));
        setIsRescheduleConfirmOpen(false);
        setNewRescheduleDate(undefined);
    }
  };
  
  const filteredBookings = useMemo(() => {
    // Search term filtering is now done on the client for the current page
    if (!searchTerm) return bookings;
    
    return bookings.filter(booking => {
        const term = searchTerm.toLowerCase();
        return booking.name.toLowerCase().includes(term) ||
               booking.email.toLowerCase().includes(term) ||
               booking.id.toLowerCase().includes(term);
    });
  }, [bookings, searchTerm]);

  const downloadCSV = async () => {
    toast({ title: "Preparing Export", description: "Fetching all matching bookings..." });
    try {
        const { bookings: allBookingsToExport } = await getAllBookings(statusFilter === 'All' ? undefined : statusFilter);

        if (allBookingsToExport.length === 0) {
            toast({ title: "No data to export", description: "No bookings found matching the current status filter." });
            return;
        }
        const headers = ["ID", "Name", "Email", "Phone", "Pickup", "Destination", "Intended Date", "Vehicle", "Luggage", "Total Fare", "Allows Reschedule", "Payment Reference", "Status", "Confirmed Date", "Created At", "Trip ID", "Rescheduled Count"];
        const csvContent = [
            headers.join(','),
            ...allBookingsToExport.map(b => [
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
                b.rescheduledCount || 0,
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `bookings-export-${statusFilter.toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: "Export Successful", description: `${allBookingsToExport.length} bookings exported.` });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Export Failed", description: e.message });
    }
  };
  
  if (loading && page === 1) {
    return <BookingsPageSkeleton />;
  }

  if (error) {
      return (
        <div className="text-center py-10 text-destructive">
            <div className="flex flex-col items-center gap-2">
                <AlertCircle className="h-8 w-8" />
                <span className="font-semibold">An Error Occurred</span>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
                 <Button onClick={() => fetchBookingsData('refresh')} variant="outline" className="mt-4">
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
                <Button variant="outline" size="icon" onClick={() => fetchBookingsData('refresh')} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
                 
                <AlertDialog open={isCustomDeleteOpen} onOpenChange={setIsCustomDeleteOpen}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Delete All</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete ALL booking records. This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleBulkDelete('all')} disabled={isBulkDeleting} className={cn(buttonVariants({variant: 'destructive'}))}>
                                            {isBulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                            Delete All Bookings
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <DropdownMenuSeparator />
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Last 7 Days</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>This will permanently delete all bookings from the last 7 days. Are you sure?</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleBulkDelete('7d')} disabled={isBulkDeleting} className={cn(buttonVariants({variant: 'destructive'}))}>{isBulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                             </AlertDialog>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Last 30 Days</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>This will permanently delete all bookings from the last 30 days. Are you sure?</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleBulkDelete('30d')} disabled={isBulkDeleting} className={cn(buttonVariants({variant: 'destructive'}))}>{isBulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <DropdownMenuSeparator />
                            <AlertDialogTrigger asChild>
                               <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Custom Range...</DropdownMenuItem>
                            </AlertDialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>

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
                            <AlertDialogAction onClick={() => handleBulkDelete('custom')} disabled={isBulkDeleting} className={cn(buttonVariants({variant: 'destructive'}))}>
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
                        <CardTitle>All Bookings</CardTitle>
                        <CardDescription>Use special actions for bulk operations on bookings.</CardDescription>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full lg:w-auto">
                        <Button variant="outline" className="w-full" size="sm" onClick={handleSync} disabled={isSyncing}>
                            {isSyncing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Synchronize
                        </Button>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="w-full" size="sm" disabled={isRescheduling}>
                                    {isRescheduling ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <History className="mr-2 h-4 w-4" />}
                                    Run Rescheduler
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Run Daily Reschedule Job?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will manually trigger the automated process that reschedules passengers from yesterday's under-filled trips to today. Are you sure you want to run this now?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleRunReschedule}>Yes, Run Now</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="outline" className="w-full" size="sm" onClick={downloadCSV}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
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
                            <SelectItem value="Refunded">Refunded</SelectItem>
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
                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                                    </TableCell>
                                </TableRow>
                            )}
                            {!loading && filteredBookings.length > 0 ? filteredBookings.map(booking => (
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
                            )) : !loading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        No bookings found for the current filter or page.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    </div>
            </CardContent>
            <CardFooter className="flex items-center justify-end space-x-2 py-4 border-t">
                <Button variant="outline" size="sm" onClick={() => fetchBookingsData('prev')} disabled={page <= 1 || loading}>
                    <ChevronLeft className="h-4 w-4 mr-1"/>
                    Previous
                </Button>
                <span className="text-sm font-medium">Page {page}</span>
                <Button variant="outline" size="sm" onClick={() => fetchBookingsData('next')} disabled={!hasMore || loading}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1"/>
                </Button>
            </CardFooter>
        </Card>

      {selectedBooking && (
        <Dialog open={isManageDialogOpen} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setNewRescheduleDate(undefined);
            }
            setIsManageDialogOpen(isOpen);
        }}>
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
                                     <div className="flex items-start gap-3">
                                        <RefreshCw className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <div>
                                            <span className="font-medium text-foreground">Rescheduled:</span>
                                            <p>{selectedBooking.rescheduledCount || 0} time(s)</p>
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

                             {/* Manual Reschedule Section */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg">Manual Reschedule</h3>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newRescheduleDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {newRescheduleDate ? format(newRescheduleDate, "PPP") : <span>Select new date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={newRescheduleDate} onSelect={setNewRescheduleDate} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <AlertDialog open={isRescheduleConfirmOpen} onOpenChange={setIsRescheduleConfirmOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button className="w-full" disabled={!newRescheduleDate || isProcessing['reschedule']}>
                                            {isProcessing['reschedule'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <History className="mr-2 h-4 w-4" />}
                                            Reschedule
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Confirm Reschedule</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will move the booking to {newRescheduleDate ? format(newRescheduleDate, 'PPP') : ''}. The customer will be notified. Are you sure?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleManualReschedule}>Confirm</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
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
                        {selectedBooking.status !== 'Cancelled' && selectedBooking.status !== 'Refunded' && (
                            <Button variant="secondary" className="w-full" size="lg" onClick={() => handleUpdateBooking('Cancelled')} disabled={isProcessing[selectedBooking.id]}>
                                {isProcessing[selectedBooking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                                Cancel Booking
                            </Button>
                        )}
                         {selectedBooking.status === 'Cancelled' && selectedBooking.paymentReference && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="w-full" size="lg" disabled={isProcessing['refund']}>
                                        {isProcessing['refund'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                                        Request Refund
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirm Refund Request</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will send an email to the administrator to manually process the refund via Paystack. Are you sure?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleRequestRefund}>Yes, Send Request</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        {(selectedBooking.status === 'Refunded' || (selectedBooking.status === 'Cancelled' && !selectedBooking.paymentReference)) && (
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

    