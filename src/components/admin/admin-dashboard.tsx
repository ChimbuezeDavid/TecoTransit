

"use client";

import { useState, useMemo, useEffect } from "react";
import { format, parseISO, subMonths, startOfMonth, endOfMonth, subDays } from "date-fns";
import { useAuth } from "@/context/auth-context";
import { useBooking } from "@/context/booking-context";
import type { Booking } from "@/lib/types";
import { DateRange } from "react-day-picker";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Car, Bus, Briefcase, Calendar as CalendarIcon, CheckCircle, Filter, Download, RefreshCw, Trash2, AlertCircle, Loader2, ListX, HandCoins } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { ScrollArea } from "../ui/scroll-area";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 10;

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
                                <TableCell className="text-right"><Skeleton className="h-9 w-20 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


export default function AdminDashboard() {
  const { user } = useAuth();
  const { bookings, loading, error, fetchBookings, updateBookingStatus, deleteBooking, clearBookings, deleteBookingsInRange } = useBooking();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [confirmedDate, setConfirmedDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<Booking['status'] | 'All'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
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
    setIsProcessing(prev => ({...prev, [selectedBooking.id]: true}));
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
        setIsProcessing(prev => ({...prev, [selectedBooking.id]: false}));
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
    const headers = ["ID", "Name", "Email", "Phone", "Pickup", "Destination", "Intended Date", "Alt. Date", "Vehicle", "Luggage", "Total Fare", "Status", "Confirmed Date", "Created At"];
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
            new Date(b.createdAt).toISOString()
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
  
  const VehicleIcon = selectedBooking?.vehicleType.includes('Bus') ? Bus : Car;

  const renderTableContent = () => {
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
  
  if (loading && bookings.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
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
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Bulk Delete Bookings</DialogTitle>
                            <DialogDescription>Permanently delete multiple booking records at once. This action cannot be undone.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
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
                                        <AlertDialogAction onClick={() => handleBulkDelete('all')} disabled={isBulkDeleting}>
                                            {isBulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Yes, delete all
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <Separator />
                            <div className="space-y-2">
                                <Label>Delete by Date Range</Label>
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
                        <DialogFooter>
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
                                        <AlertDialogAction onClick={() => handleBulkDelete('range')} disabled={isBulkDeleting}>
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
                    <SelectItem value="All">All</SelectItem>
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
      {selectedBooking && (
        <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
            <DialogContent className="max-w-3xl p-0">
                <DialogHeader className="p-6 pb-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-y-2">
                        <DialogTitle className="text-xl font-semibold tracking-tight">Manage Booking: {selectedBooking.id.substring(0,8)}</DialogTitle>
                         <Badge variant={getStatusVariant(selectedBooking.status)} className="self-start">{selectedBooking.status}</Badge>
                    </div>
                     <DialogDescription>
                        Review customer details and manage the booking status.
                    </DialogDescription>
                </DialogHeader>
                 <ScrollArea className="max-h-[60vh]">
                    <div className="px-6 pt-0 pb-6 text-sm">
                        
                        {/* Mobile Layout: Stacked Cards */}
                        <div className="space-y-4 md:hidden">
                            <Card>
                                <CardHeader className="p-4">
                                    <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Customer Details</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 space-y-3">
                                    <p><strong>Name:</strong> {selectedBooking.name}</p>
                                    <p><strong>Email:</strong> {selectedBooking.email}</p>
                                    <p><strong>Phone:</strong> {selectedBooking.phone}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="p-4">
                                    <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Trip Details</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 space-y-3">
                                    <p><strong>From:</strong> {selectedBooking.pickup}</p>
                                    <p><strong>To:</strong> {selectedBooking.destination}</p>
                                    <p><strong>Intended:</strong> {format(parseISO(selectedBooking.intendedDate), 'PPP')}</p>
                                    <p><strong>Alternative:</strong> {format(parseISO(selectedBooking.alternativeDate), 'PPP')}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="p-4">
                                    <CardTitle className="text-base flex items-center gap-2"><VehicleIcon className="h-4 w-4" />Vehicle & Fare</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 space-y-3">
                                    <p><strong>Vehicle:</strong> {selectedBooking.vehicleType}</p>
                                    <p><strong>Luggage:</strong> {selectedBooking.luggageCount} bag(s)</p>
                                    <p><strong>Total Fare:</strong> <span className="font-bold text-primary">₦{selectedBooking.totalFare.toLocaleString()}</span></p>
                                </CardContent>
                            </Card>
                             {selectedBooking.status === 'Pending' && (
                                <Card>
                                     <CardHeader className="p-4">
                                        <CardTitle className="text-base">Confirm Departure Date</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <RadioGroup onValueChange={setConfirmedDate} value={confirmedDate} className="grid grid-cols-1 gap-2">
                                            <Label htmlFor="intended-mobile" className="flex items-center space-x-3 p-3 rounded-md hover:bg-muted cursor-pointer border">
                                                <RadioGroupItem value={selectedBooking.intendedDate} id="intended-mobile"/>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">Intended</span>
                                                    <span className="text-muted-foreground">{format(parseISO(selectedBooking.intendedDate), 'PPP')}</span>
                                                </div>
                                            </Label>
                                            <Label htmlFor="alternative-mobile" className="flex items-center space-x-3 p-3 rounded-md hover:bg-muted cursor-pointer border">
                                                <RadioGroupItem value={selectedBooking.alternativeDate} id="alternative-mobile"/>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">Alternative</span>
                                                    <span className="text-muted-foreground">{format(parseISO(selectedBooking.alternativeDate), 'PPP')}</span>
                                                </div>
                                            </Label>
                                        </RadioGroup>
                                    </CardContent>
                                </Card>
                            )}
                             {selectedBooking.status === 'Confirmed' && (
                                <div className="flex items-center gap-3 text-primary font-bold p-3 bg-primary/10 rounded-lg"><CheckCircle className="h-5 w-5 flex-shrink-0" /><span>Confirmed for: {selectedBooking.confirmedDate ? format(parseISO(selectedBooking.confirmedDate), 'PPP') : 'N/A'}</span></div>
                            )}
                        </div>
                        
                        {/* Tablet Layout: Brick */}
                        <div className="hidden md:grid lg:hidden md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><User className="h-5 w-5" /> Customer & Fare</h3>
                                <div className="space-y-2 pl-7">
                                    <p><strong>Name:</strong> {selectedBooking.name}</p>
                                    <p><strong>Email:</strong> {selectedBooking.email}</p>
                                    <p><strong>Phone:</strong> {selectedBooking.phone}</p>
                                    <p><strong>Vehicle:</strong> {selectedBooking.vehicleType}</p>
                                    <p><strong>Luggage:</strong> {selectedBooking.luggageCount} bag(s)</p>
                                    <p><strong>Total Fare:</strong> <span className="font-bold text-lg text-primary">₦{selectedBooking.totalFare.toLocaleString()}</span></p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><MapPin className="h-5 w-5" /> Trip Details</h3>
                                <div className="space-y-2 pl-7">
                                    <p><strong>From:</strong> {selectedBooking.pickup}</p>
                                    <p><strong>To:</strong> {selectedBooking.destination}</p>
                                    <p><strong>Intended:</strong> {format(parseISO(selectedBooking.intendedDate), 'PPP')}</p>
                                    <p><strong>Alternative:</strong> {format(parseISO(selectedBooking.alternativeDate), 'PPP')}</p>
                                </div>
                            </div>
                            {selectedBooking.status === 'Pending' ? (
                                <div className="col-span-2 space-y-4 pt-4">
                                     <Separator/>
                                    <div className="p-4 bg-muted/50 rounded-lg">
                                        <Label className="font-semibold text-base">Confirm Departure Date</Label>
                                        <RadioGroup onValueChange={setConfirmedDate} value={confirmedDate} className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <Label htmlFor="intended" className="flex items-center space-x-3 p-3 rounded-md hover:bg-background cursor-pointer border">
                                                <RadioGroupItem value={selectedBooking.intendedDate} id="intended"/>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">Intended</span>
                                                    <span className="text-muted-foreground">{format(parseISO(selectedBooking.intendedDate), 'PPP')}</span>
                                                </div>
                                            </Label>
                                            <Label htmlFor="alternative" className="flex items-center space-x-3 p-3 rounded-md hover:bg-background cursor-pointer border">
                                                <RadioGroupItem value={selectedBooking.alternativeDate} id="alternative"/>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">Alternative</span>
                                                    <span className="text-muted-foreground">{format(parseISO(selectedBooking.alternativeDate), 'PPP')}</span>
                                                </div>
                                            </Label>
                                        </RadioGroup>
                                    </div>
                                </div>
                                ) : (
                                     <div className="col-span-2 flex items-center gap-3 text-primary font-bold p-3 bg-primary/10 rounded-lg"><CheckCircle className="h-5 w-5 flex-shrink-0" /><span>Confirmed for: {selectedBooking.confirmedDate ? format(parseISO(selectedBooking.confirmedDate), 'PPP') : 'N/A'}</span></div>
                                )}
                        </div>


                        {/* Desktop Layout */}
                        <div className="hidden lg:block">
                            <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                                {/* Col 1: Customer & Trip */}
                                <div className="col-span-2 space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg flex items-center gap-2"><User className="h-5 w-5 text-muted-foreground" /> Customer Details</h3>
                                        <div className="grid grid-cols-3 gap-x-4 gap-y-2 pl-7 text-sm">
                                            <p><strong>Name:</strong> {selectedBooking.name}</p>
                                            <p className="col-span-2"><strong>Email:</strong> {selectedBooking.email}</p>
                                            <p><strong>Phone:</strong> {selectedBooking.phone}</p>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-muted-foreground" /> Trip Details</h3>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pl-7 text-sm">
                                            <p><strong>From:</strong> {selectedBooking.pickup}</p>
                                            <p><strong>To:</strong> {selectedBooking.destination}</p>
                                            <p><strong>Intended:</strong> {format(parseISO(selectedBooking.intendedDate), 'PPP')}</p>
                                            <p><strong>Alternative:</strong> {format(parseISO(selectedBooking.alternativeDate), 'PPP')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Col 2: Vehicle & Fare */}
                                <div className="col-span-1 space-y-4 rounded-lg bg-muted/30 p-4 border h-fit">
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><VehicleIcon className="h-5 w-5 text-muted-foreground" /> Vehicle & Fare</h3>
                                    <div className="space-y-3 pl-7">
                                        <p><strong>Vehicle:</strong> {selectedBooking.vehicleType}</p>
                                        <p><strong>Luggage:</strong> {selectedBooking.luggageCount} bag(s)</p>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Total Fare</p>
                                            <p className="font-bold text-2xl text-primary">₦{selectedBooking.totalFare.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                             {selectedBooking.status === 'Pending' && (
                                <div className="pt-6">
                                    <Separator/>
                                    <div className="p-4 bg-muted/30 rounded-lg mt-6">
                                        <Label className="font-semibold text-base">Confirm Departure Date</Label>
                                        <RadioGroup onValueChange={setConfirmedDate} value={confirmedDate} className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Label htmlFor="intended-desktop" className="flex items-center space-x-3 p-3 rounded-md hover:bg-background cursor-pointer border bg-background">
                                                <RadioGroupItem value={selectedBooking.intendedDate} id="intended-desktop"/>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">Intended</span>
                                                    <span className="text-muted-foreground">{format(parseISO(selectedBooking.intendedDate), 'PPP')}</span>
                                                </div>
                                            </Label>
                                            <Label htmlFor="alternative-desktop" className="flex items-center space-x-3 p-3 rounded-md hover:bg-background cursor-pointer border bg-background">
                                                <RadioGroupItem value={selectedBooking.alternativeDate} id="alternative-desktop"/>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">Alternative</span>
                                                    <span className="text-muted-foreground">{format(parseISO(selectedBooking.alternativeDate), 'PPP')}</span>
                                                </div>
                                            </Label>
                                        </RadioGroup>
                                    </div>
                                </div>
                            )}
                            {selectedBooking.status === 'Confirmed' && (
                                <div className="pt-6">
                                     <div className="flex items-center gap-3 text-primary font-bold p-3 bg-primary/10 rounded-lg"><CheckCircle className="h-5 w-5 flex-shrink-0" /><span>Confirmed for: {selectedBooking.confirmedDate ? format(parseISO(selectedBooking.confirmedDate), 'PPP') : 'N.A'}</span></div>
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="flex-wrap items-center justify-between p-6 border-t bg-muted/30 gap-2">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0 px-2" disabled={isProcessing[selectedBooking.id]}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone. This will permanently delete this booking record from our servers.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteBooking} className="bg-destructive hover:bg-destructive/90">Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <div className="flex justify-end gap-2 flex-wrap">
                        {selectedBooking.status === 'Pending' ? (
                            <>
                                <Button variant="secondary" size="sm" onClick={() => handleUpdateBooking('Cancelled')} disabled={isProcessing[selectedBooking.id]}>
                                     {isProcessing[selectedBooking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    Cancel Booking
                                </Button>
                                <Button size="sm" onClick={() => handleUpdateBooking('Confirmed')} disabled={isProcessing[selectedBooking.id]}>
                                    {isProcessing[selectedBooking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    Confirm Booking
                                </Button>
                            </>
                        ) : (
                             <Button variant="outline" size="sm" onClick={() => setIsManageDialogOpen(false)}>Close</Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

    

    

    