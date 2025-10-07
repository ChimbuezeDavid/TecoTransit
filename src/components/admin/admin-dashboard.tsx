

"use client";

import { useState, useMemo, useEffect } from "react";
import { format, parseISO, subMonths, startOfMonth, endOfMonth, subDays } from "date-fns";
import { useAuth } from "@/context/auth-context";
import { useBooking } from "@/context/booking-context";
import type { Booking, Passenger } from "@/lib/types";
import { DateRange } from "react-day-picker";
import Link from 'next/link';
import Image from 'next/image';


import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Car, Bus, Briefcase, Calendar as CalendarIcon, CheckCircle, Filter, Download, RefreshCw, Trash2, AlertCircle, Loader2, ListX, ExternalLink, Users, XCircle, Clock } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { ScrollArea } from "../ui/scroll-area";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { buttonVariants } from "../ui/button";

const ITEMS_PER_PAGE = 10;

interface AdminDashboardProps {
    openBookingId?: string;
}

function DashboardSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div>
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-4 w-72 mt-2" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-32" />
                        <Skeleton className="h-9 w-9" />
                    </div>
                </div>
                 <div className="flex items-center gap-2 pt-4">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-10 w-44" />
                 </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead className="hidden lg:table-cell"><Skeleton className="h-5 w-20" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                             <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                             <TableRow key={i}>
                                <TableCell>
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-4 w-40 mt-2" />
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-4 w-32 mt-2" />
                                </TableCell>
                                <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-9 w-20 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


export default function AdminDashboard({ openBookingId }: AdminDashboardProps) {
  const { user } = useAuth();
  const { bookings, loading, error, fetchBookings, updateBookingStatus, deleteBooking, clearBookings, deleteBookingsInRange } = useBooking();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [confirmedDate, setConfirmedDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<Booking['status'] | 'All'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (user) {
      unsubscribe = fetchBookings(statusFilter);
    } else {
      clearBookings();
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, statusFilter, fetchBookings, clearBookings]);

  useEffect(() => {
    if (openBookingId && bookings.length > 0) {
      const bookingToOpen = bookings.find(b => b.id === openBookingId);
      if (bookingToOpen) {
        openDialog(bookingToOpen);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openBookingId, bookings]);


  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);
  
  const totalPages = Math.ceil(bookings.length / ITEMS_PER_PAGE);
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return bookings.slice(startIndex, endIndex);
  }, [bookings, currentPage]);

  const openDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setConfirmedDate(booking.confirmedDate || '');
    setIsManageDialogOpen(true);
  }

  const handleUpdateBooking = async (status: 'Confirmed' | 'Cancelled') => {
    if (!selectedBooking) return;

    if (status === 'Confirmed' && !confirmedDate) {
        toast({
            variant: "destructive",
            title: "Selection Required",
            description: "Please select one of the departure dates to confirm.",
        });
        return;
    }
    
    if (status === 'Confirmed' && selectedBooking.paymentStatus !== 'Approved') {
        toast({
            variant: "destructive",
            title: "Payment Not Approved",
            description: "You cannot confirm a booking until the payment has been approved.",
        });
        return;
    }


    setIsProcessing(prev => ({...prev, [selectedBooking.id]: true}));
    
    try {
        await updateBookingStatus(selectedBooking.id, status, status === 'Confirmed' ? confirmedDate : undefined);
        toast({
            title: "Booking Updated",
            description: `Booking has been successfully ${status.toLowerCase()}.`,
        });
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

  const handleBulkDelete = async (mode: 'all' | 'range') => {
    setIsBulkDeleting(true);
    try {
      let count = 0;
      if (mode === 'all') {
        count = await deleteBookingsInRange(new Date(0), new Date());
      } else if (dateRange?.from && dateRange?.to) {
        count = await deleteBookingsInRange(dateRange.from, dateRange.to);
      } else {
        toast({ variant: "destructive", title: "Date Range Required", description: "Please select a valid date range to delete bookings." });
        setIsBulkDeleting(false);
        return;
      }
      toast({
        title: "Bulk Delete Successful",
        description: `${count} booking(s) have been permanently deleted.`,
      });
      setDateRange(undefined);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Bulk Delete Failed",
        description: `Could not delete bookings. Please try again. ${error instanceof Error ? error.message : ''}`,
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const downloadCSV = () => {
    if (bookings.length === 0) {
        toast({ title: "No data to export" });
        return;
    }
    const headers = ["ID", "Name", "Email", "Phone", "Pickup", "Destination", "Intended Date", "Alt. Date", "Vehicle", "Luggage", "Total Fare", "Status", "Confirmed Date", "Created At", "Receipt URL", "Booking Type", "Passengers Count", "Passenger Details", "Payment Status"];
    const csvContent = [
        headers.join(','),
        ...bookings.map(b => [
            b.id,
            `"${b.name.replace(/"/g, '""')}"`,
            b.email,
            b.phone,
            `"${b.pickup.replace(/"/g, '""')}"`,
            `"${b.destination.replace(/"/g, '""')}"`,
            b.intendedDate,
            b.alternativeDate,
            `"${b.vehicleType.replace(/"/g, '""')}"`,
            b.luggageCount,
            b.totalFare,
            b.status,
            b.confirmedDate || "",
            new Date(b.createdAt).toISOString(),
            b.paymentReceiptUrl || "",
            b.bookingType || 'individual',
            b.numberOfPassengers || 1,
            `"${JSON.stringify(b.passengers || []).replace(/"/g, '""')}"`,
            b.paymentStatus || "Pending"
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

  const getStatusVariant = (status: Booking['status']) => {
    switch (status) {
      case 'Confirmed': return 'default';
      case 'Cancelled': return 'destructive';
      case 'Pending': return 'secondary';
      default: return 'outline';
    }
  };
  
  const getPaymentStatusVariant = (status: Booking['paymentStatus']) => {
    switch (status) {
      case 'Approved': return 'default';
      case 'Rejected': return 'destructive';
      case 'Pending':
      default:
        return 'secondary';
    }
  };
  
  const VehicleIcon = selectedBooking?.vehicleType.includes('Bus') ? Bus : Car;

  const renderTableContent = () => {
    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center py-10 text-destructive">
             <div className="flex flex-col items-center gap-2">
                <AlertCircle className="h-8 w-8" />
                <span className="font-semibold">An Error Occurred</span>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
             </div>
          </TableCell>
        </TableRow>
      );
    }
    if (paginatedBookings.length === 0) {
      return <TableRow><TableCell colSpan={6} className="text-center py-10">No bookings match the current filters.</TableCell></TableRow>;
    }
    return paginatedBookings.map((booking) => (
      <TableRow key={booking.id}>
        <TableCell>
          <div className="font-medium flex items-center gap-2">
            {booking.bookingType === 'group' ? <Users className="h-4 w-4 text-muted-foreground" /> : <User className="h-4 w-4 text-muted-foreground" />}
            {booking.name}
          </div>
          <div className="text-sm text-muted-foreground hidden sm:block">{booking.email}</div>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <div className="font-medium">{booking.pickup}</div>
          <div className="text-sm text-muted-foreground">to {booking.destination}</div>
        </TableCell>
        <TableCell className="hidden lg:table-cell">{booking.vehicleType}</TableCell>
        <TableCell><Badge variant={getPaymentStatusVariant(booking.paymentStatus)}>{booking.paymentStatus}</Badge></TableCell>
        <TableCell><Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge></TableCell>
        <TableCell className="text-right">
          <Button variant="outline" size="sm" onClick={() => openDialog(booking)} disabled={isProcessing[booking.id]}>
            {isProcessing[booking.id] ? <Loader2 className="animate-spin" /> : 'Manage'}
          </Button>
        </TableCell>
      </TableRow>
    ));
  };
  
  if (loading && bookings.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
                <CardTitle>Booking Requests</CardTitle>
                <CardDescription>Manage and confirm trip logistics for customer bookings.</CardDescription>
            </div>
             <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                <Button variant="outline" size="sm" onClick={downloadCSV}><Download className="mr-2 h-4 w-4" />Download CSV</Button>
                
                <Dialog>
                    <DialogTrigger asChild>
                         <Button variant="destructive" size="sm"><ListX className="mr-2 h-4 w-4" />Bulk Actions</Button>
                    </DialogTrigger>
                    <DialogContent className="p-0">
                        <DialogHeader className="p-6 pb-4">
                            <DialogTitle>Bulk Delete Bookings</DialogTitle>
                            <DialogDescription>Permanently delete multiple booking records at once. This action cannot be undone.</DialogDescription>
                        </DialogHeader>
                        
                        <div className="px-6 space-y-6">
                            <AlertDialog>
                               <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="w-full justify-center">Delete all Bookings</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete all booking records. This is irreversible. Please confirm.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleBulkDelete('all')} disabled={isBulkDeleting} className={cn(buttonVariants({ variant: "destructive" }))}>
                                            {isBulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Yes, delete all
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <Separator />
                            
                            <div className="space-y-4">
                                <h3 className="font-semibold">Delete by Date Range</h3>
                                <p className="text-sm text-muted-foreground">Select a date range to delete bookings created within that period.</p>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2">
                                    <Button size="sm" variant="outline" onClick={() => setDateRange({ from: subDays(new Date(), 6), to: new Date() })}>Last 7 Days</Button>
                                    <Button size="sm" variant="outline" onClick={() => setDateRange({ from: subDays(new Date(), 29), to: new Date() })}>Last 30 Days</Button>
                                    <Button size="sm" variant="outline" onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>This Month</Button>
                                    <Button size="sm" variant="outline" onClick={() => setDateRange({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) })}>Last Month</Button>
                                </div>
                                
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !dateRange && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                            {format(dateRange.from, "LLL dd, y")} -{" "}
                                            {format(dateRange.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y")
                                        )
                                        ) : (
                                        <span>Pick a date range</span>
                                        )}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange?.from}
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={2}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <DialogFooter className="bg-muted/30 p-6 mt-6 flex-row justify-between w-full">
                             <DialogClose asChild>
                                <Button variant="outline">Close</Button>
                             </DialogClose>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={!dateRange?.from || !dateRange?.to}>Delete Selected Range</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete all bookings from <strong className="text-foreground">{dateRange?.from && format(dateRange.from, 'PPP')}</strong> to <strong className="text-foreground">{dateRange?.to && format(dateRange.to, 'PPP')}</strong>. Are you sure?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleBulkDelete('range')} disabled={isBulkDeleting} className={cn(buttonVariants({ variant: "destructive" }))}>
                                             {isBulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Yes, delete range
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Button variant="outline" size="icon" onClick={() => fetchBookings(statusFilter)} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
            </div>
        </div>
        <div className="flex items-center gap-2 pt-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
             <Select onValueChange={(value) => setStatusFilter(value as any)} defaultValue="All">
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Trip</TableHead>
                <TableHead className="hidden lg:table-cell">Vehicle</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {renderTableContent()}
            </TableBody>
            </Table>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row items-center justify-between border-t pt-4 gap-4">
        <div className="text-sm text-muted-foreground">
          Showing page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => prev - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </CardFooter>
      </Card>
      
      {selectedBooking && (
        <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
            <DialogContent className="p-0 max-w-4xl h-full max-h-screen sm:max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 pr-16 pb-4 border-b">
                    <div className="flex items-center justify-between gap-4">
                        <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
                            {selectedBooking.bookingType === 'group' ? <Users className="h-5 w-5 text-muted-foreground"/> : <User className="h-5 w-5 text-muted-foreground" />}
                            Manage Booking: {selectedBooking.id.substring(0,8)}
                        </DialogTitle>
                         <Badge variant={getStatusVariant(selectedBooking.status)} className="self-start">{selectedBooking.status}</Badge>
                    </div>
                     <DialogDescription>
                        Created on {format(selectedBooking.createdAt, 'PPP p')}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-3 flex-1 overflow-hidden">
                     <ScrollArea className="md:col-span-2 h-full">
                        <div className="p-6 space-y-8">
                            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
                                {/* Customer Details */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg">
                                        {selectedBooking.bookingType === 'group' ? "Primary Contact" : "Customer Details"}
                                    </h3>
                                    <ul className="space-y-3 text-sm">
                                        <li className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><span>{selectedBooking.name}</span></li>
                                        <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span>{selectedBooking.email}</span></li>
                                        <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span>{selectedBooking.phone}</span></li>
                                        {selectedBooking.bookingType === 'group' && (
                                        <li className="flex items-center gap-3"><Users className="h-4 w-4 text-muted-foreground" /><span>{selectedBooking.numberOfPassengers} Passengers</span></li>
                                        )}
                                    </ul>
                                </div>

                                {/* Trip Details */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg">Trip</h3>
                                    <ul className="space-y-3 text-sm">
                                        <li className="flex items-start gap-3"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{selectedBooking.pickup} to {selectedBooking.destination}</span></li>
                                        <li className="flex items-start gap-3"><VehicleIcon className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{selectedBooking.vehicleType}</span></li>
                                        <li className="flex items-start gap-3"><Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{selectedBooking.luggageCount} total bag(s)</span></li>
                                    </ul>
                                </div>
                                
                                {/* Departure Dates */}
                                <div className="space-y-4 sm:col-span-2">
                                    <h3 className="font-semibold text-lg">Departure Dates</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-start gap-3">
                                            <CalendarIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                            <div>
                                                <span className="font-medium text-foreground">Intended:</span>
                                                <p>{format(parseISO(selectedBooking.intendedDate), 'PPP')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <CalendarIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                            <div>
                                                <span className="font-medium text-foreground">Alternative:</span>
                                                <p>{format(parseISO(selectedBooking.alternativeDate), 'PPP')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {selectedBooking.bookingType === 'group' && selectedBooking.passengers && selectedBooking.passengers.length > 0 && (
                                <div>
                                    <Separator className="my-6" />
                                    <h3 className="font-semibold text-lg mb-4">Passenger Details</h3>
                                    <div className="space-y-4">
                                        {selectedBooking.passengers.map((passenger, index) => (
                                            <div key={index} className="text-sm p-4 rounded-lg border bg-muted/20">
                                                <p className="font-semibold text-foreground">Passenger {index + 1}: {passenger.name}</p>
                                                <p className="text-muted-foreground">Email: {passenger.email}</p>
                                                <p className="text-muted-foreground">Phone: {passenger.phone}</p>
                                                <p className="text-muted-foreground">Bags: {passenger.luggageCount}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                     </ScrollArea>
                    
                    {/* Right Panel */}
                    <ScrollArea className="md:col-span-1 bg-muted/30 h-full">
                        <div className="p-6 space-y-6">
                           
                            {/* Payment Status */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg">Payment Status</h3>
                                <div className={cn(
                                    "flex items-center gap-3 font-semibold p-3 rounded-lg",
                                    selectedBooking.paymentStatus === 'Approved' && "bg-primary/10 text-primary",
                                    selectedBooking.paymentStatus === 'Rejected' && "bg-destructive/10 text-destructive",
                                    selectedBooking.paymentStatus === 'Pending' && "bg-secondary"
                                )}>
                                    {selectedBooking.paymentStatus === 'Approved' && <CheckCircle className="h-5 w-5 flex-shrink-0" />}
                                    {selectedBooking.paymentStatus === 'Rejected' && <XCircle className="h-5 w-5 flex-shrink-0" />}
                                    {selectedBooking.paymentStatus === 'Pending' && <Clock className="h-5 w-5 flex-shrink-0" />}
                                    <span>{selectedBooking.paymentStatus}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Manage payment verification on the <Link href="/admin/payments" className="underline hover:text-primary">Payments</Link> page.
                                </p>
                            </div>

                            <Separator />
                            
                            {selectedBooking.status === 'Pending' && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-lg">Confirm Departure</h3>
                                    <RadioGroup onValueChange={setConfirmedDate} value={confirmedDate} className="grid grid-cols-1 gap-2">
                                        <Label htmlFor="intended-desktop" className="flex items-center space-x-3 p-3 rounded-md hover:bg-background cursor-pointer border bg-background shadow-sm">
                                            <RadioGroupItem value={selectedBooking.intendedDate} id="intended-desktop"/>
                                            <div className="flex flex-col">
                                                <span className="font-semibold">Intended</span>
                                                <span className="text-muted-foreground text-xs">{format(parseISO(selectedBooking.intendedDate), 'PPP')}</span>
                                            </div>
                                        </Label>
                                        <Label htmlFor="alternative-desktop" className="flex items-center space-x-3 p-3 rounded-md hover:bg-background cursor-pointer border bg-background shadow-sm">
                                            <RadioGroupItem value={selectedBooking.alternativeDate} id="alternative-desktop"/>
                                            <div className="flex flex-col">
                                                <span className="font-semibold">Alternative</span>
                                                <span className="text-muted-foreground text-xs">{format(parseISO(selectedBooking.alternativeDate), 'PPP')}</span>
                                            </div>
                                        </Label>
                                    </RadioGroup>
                                </div>
                            )}

                            {selectedBooking.status === 'Confirmed' && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-lg">Trip Confirmed</h3>
                                    <div className="flex items-center gap-3 text-primary font-semibold p-3 bg-primary/10 rounded-lg">
                                        <CheckCircle className="h-5 w-5 flex-shrink-0" />
                                        <span>Confirmed for: {selectedBooking.confirmedDate ? format(parseISO(selectedBooking.confirmedDate), 'PPP') : 'N/A'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
                 <DialogFooter className="flex-wrap items-center justify-between sm:flex-row sm:justify-between p-6 border-t bg-muted/30 gap-2 mt-auto">
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
                        {selectedBooking.status === 'Pending' ? (
                            <>
                                <Button variant="secondary" className="w-full" size="lg" onClick={() => handleUpdateBooking('Cancelled')} disabled={isProcessing[selectedBooking.id]}>
                                    {isProcessing[selectedBooking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Cancel Booking
                                </Button>
                                <Button 
                                    size="lg" 
                                    className="w-full" 
                                    onClick={() => handleUpdateBooking('Confirmed')} 
                                    disabled={isProcessing[selectedBooking.id] || !confirmedDate || selectedBooking.paymentStatus !== 'Approved'}
                                    title={selectedBooking.paymentStatus !== 'Approved' ? "Payment must be approved before confirming." : ""}
                                >
                                    {isProcessing[selectedBooking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Confirm Booking
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
    </>
  );
}
