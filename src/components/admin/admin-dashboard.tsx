
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { format, parseISO, subDays, startOfDay, endOfDay } from "date-fns";
import { useAuth } from "@/context/auth-context";
import { useBooking } from "@/context/booking-context";
import type { Booking } from "@/lib/types";
import { DateRange } from "react-day-picker";
import Link from 'next/link';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Car, Bus, Briefcase, Calendar as CalendarIcon, CheckCircle, Filter, Download, RefreshCw, Trash2, AlertCircle, Loader2, ListX, HandCoins, CreditCard, Ban, ShieldAlert, ShieldCheck, Check, CircleDot } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { buttonVariants } from "../ui/button";
import { verifyPayment } from "@/app/actions/verify-payment";


const ITEMS_PER_PAGE = 10;

function DashboardSkeleton() {
    return (
        <div className="space-y-8">
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
                                 <TableHead><Skeleton className="h-5 w-16" /></TableHead>
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
        </div>
    );
}

type PaymentStatus = 'idle' | 'verifying' | 'verified' | 'failed' | 'error';

function PaymentVerificationStatus({ booking }: { booking: Booking | null }) {
    const [status, setStatus] = useState<PaymentStatus>('idle');
    const [message, setMessage] = useState('');
    const { toast } = useToast();

    const handleVerifyPayment = useCallback(async () => {
        if (!booking?.paymentReference) {
            setStatus('error');
            setMessage('No payment reference found for this booking.');
            return;
        }

        setStatus('verifying');
        try {
            const result = await verifyPayment(booking.paymentReference);
            if (result.status === 'success') {
                setStatus('verified');
            } else {
                setStatus('failed');
            }
            setMessage(result.message);
        } catch (error) {
            setStatus('error');
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            setMessage(errorMessage);
            toast({
                variant: 'destructive',
                title: 'Verification Failed',
                description: errorMessage,
            });
        }
    }, [booking, toast]);

    // Automatically trigger verification when dialog opens
    useEffect(() => {
        handleVerifyPayment();
    }, [handleVerifyPayment]);
    
    if (!booking) return null;

    return (
        <div className="space-y-3">
            <h3 className="font-semibold text-lg">Payment</h3>
            <div>
                <p className="text-xs text-muted-foreground">Amount Paid</p>
                <p className="font-bold text-3xl text-primary">₦{booking.totalFare.toLocaleString()}</p>
            </div>
            
            {status === 'idle' && (
                <Button onClick={handleVerifyPayment} variant="outline" size="sm">
                    Verify Payment Status
                </Button>
            )}

            {status === 'verifying' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying with Paystack...</span>
                </div>
            )}
            {status === 'verified' && (
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium p-3 bg-green-500/10 rounded-lg">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Payment Verified</span>
                </div>
            )}
            {status === 'failed' && (
                <div className="flex items-center gap-2 text-sm text-amber-600 font-medium p-3 bg-amber-500/10 rounded-lg">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Payment Not Completed</span>
                </div>
            )}
            {status === 'error' && (
                <div className="flex items-center gap-2 text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span>Verification Error</span>
                </div>
            )}
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
    )
}


export default function AdminDashboard({ allBookings, loading: allBookingsLoading }: { allBookings: Booking[], loading: boolean }) {
  const { user } = useAuth();
  const { bookings, loading: filteredBookingsLoading, error, fetchBookings, updateBookingStatus, deleteBooking, clearBookings, deleteBookingsInRange } = useBooking();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Booking['status'] | 'All'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const loading = allBookingsLoading || filteredBookingsLoading;

  // Refetch bookings when the component mounts or the filter changes.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (user) {
      unsubscribe = fetchBookings(statusFilter);
    } else {
      clearBookings();
    }
    // Cleanup the listener when the component unmounts or the user logs out
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, statusFilter, fetchBookings, clearBookings]);

  // Reset to page 1 when filter changes
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
    setIsManageDialogOpen(true);
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
    const headers = ["ID", "Name", "Email", "Phone", "Pickup", "Destination", "Intended Date", "Alt. Date", "Vehicle", "Luggage", "Total Fare", "Payment Reference", "Status", "Confirmed Date", "Created At"];
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
            b.paymentReference || "",
            b.status,
            b.confirmedDate || "",
            new Date(b.createdAt).toISOString(),
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
      case 'Paid': return 'secondary';
      case 'Pending': return 'outline';
      default: return 'outline';
    }
  };
  
  const getStatusIcon = (status: Booking['status']) => {
    switch (status) {
        case 'Confirmed': return <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />;
        case 'Cancelled': return <Ban className="h-5 w-5 text-destructive flex-shrink-0" />;
        case 'Paid': return <HandCoins className="h-5 w-5 text-blue-500 flex-shrink-0" />;
        case 'Pending': return <CircleDot className="h-5 w-5 text-amber-500 flex-shrink-0" />;
        default: return <Check className="h-5 w-5" />;
    }
  };
  
  const VehicleIcon = selectedBooking?.vehicleType.includes('Bus') ? Bus : Car;

  const renderTableContent = () => {
    if (loading) {
        return [...Array(5)].map((_, i) => (
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
                <TableCell className="text-right"><Skeleton className="h-9 w-20 ml-auto" /></TableCell>
            </TableRow>
        ));
    }
    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center py-10 text-destructive">
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
      return <TableRow><TableCell colSpan={5} className="text-center py-10">No bookings found for this status.</TableCell></TableRow>;
    }
    return paginatedBookings.map((booking) => (
      <TableRow key={booking.id}>
        <TableCell>
          <div className="font-medium">{booking.name}</div>
          <div className="text-sm text-muted-foreground hidden sm:block">{booking.email}</div>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <div className="font-medium">{booking.pickup}</div>
          <div className="text-sm text-muted-foreground">to {booking.destination}</div>
        </TableCell>
        <TableCell className="hidden lg:table-cell">{booking.vehicleType}</TableCell>
        <TableCell><Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge></TableCell>
        <TableCell className="text-right">
          <Button variant="outline" size="sm" onClick={() => openDialog(booking)} disabled={isProcessing[booking.id]}>
            {isProcessing[booking.id] ? <Loader2 className="animate-spin" /> : 'Manage'}
          </Button>
        </TableCell>
      </TableRow>
    ));
  };
  
  if (allBookingsLoading && bookings.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      <Card>
          <CardHeader>
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div>
                      <CardTitle>Booking Requests</CardTitle>
                      <CardDescription>A list of all trip requests from customers.</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                      <Button variant="outline" size="sm" onClick={downloadCSV}><Download className="mr-2 h-4 w-4" />Download CSV</Button>
                      
                      <Dialog>
                          <DialogTrigger asChild>
                              <Button variant="destructive" size="sm"><ListX className="mr-2 h-4 w-4" />Bulk Actions</Button>
                          </DialogTrigger>
                          <DialogContent className="p-0 max-h-[65vh] sm:max-h-full">
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
                                          <Button size="sm" variant="outline" onClick={() => setDateRange({ from: startOfDay(subDays(new Date(), 30)), to: new Date() })}>This Month</Button>
                                          <Button size="sm" variant="outline" onClick={() => setDateRange({ from: startOfDay(subDays(new Date(), 60)), to: endOfDay(subDays(new Date(), 31)) })}>Last Month</Button>
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
                          <SelectItem value="Paid">Paid</SelectItem>
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
                    </div>
                    
                    {/* Right Panel */}
                    <div className="md:col-span-1 bg-muted/30 flex flex-col">
                        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                            {/* Fare Details */}
                             <PaymentVerificationStatus booking={selectedBooking} />
                            
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
