
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/context/auth-context";
import { useBooking } from "@/context/booking-context";
import type { Booking } from "@/lib/types";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Car, Bus, Briefcase, Calendar as CalendarIcon, CheckCircle, Filter, Download, RefreshCw, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

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
  const { bookings, loading, error, fetchBookings, updateBookingStatus, deleteBooking, clearBookings } = useBooking();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmedDate, setConfirmedDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<Booking['status'] | 'All'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  
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

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'All') {
        return bookings;
    }
    return bookings.filter(b => b.status === statusFilter);
  }, [bookings, statusFilter]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);
  
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredBookings.slice(startIndex, endIndex);
  }, [filteredBookings, currentPage]);

  const openDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setConfirmedDate(booking.confirmedDate || '');
    setIsDialogOpen(true);
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
        setIsDialogOpen(false);
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
      setIsDialogOpen(false);
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

  const downloadCSV = () => {
    if (filteredBookings.length === 0) {
        toast({ title: "No data to export" });
        return;
    }
    const headers = ["ID", "Name", "Email", "Phone", "Pickup", "Destination", "Intended Date", "Alt. Date", "Vehicle", "Luggage", "Total Fare", "Status", "Confirmed Date", "Created At"];
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
             <div className="flex items-center gap-2 self-start sm:self-center">
                <Button variant="outline" size="sm" onClick={downloadCSV}><Download className="mr-2 h-4 w-4" />Download CSV</Button>
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <DialogTitle>Manage Booking: {selectedBooking.id.substring(0,8)}</DialogTitle>
                         <Badge variant={getStatusVariant(selectedBooking.status)} className="mt-1 sm:mt-0 self-start">{selectedBooking.status}</Badge>
                    </div>
                     <DialogDescription className="pt-1">
                        Review customer details and manage the booking status.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4 text-sm">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="flex items-start gap-3"><User className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" /><span><strong>Name:</strong> {selectedBooking.name}</span></div>
                        <div className="flex items-start gap-3"><Mail className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" /><span><strong>Email:</strong> {selectedBooking.email}</span></div>
                        <div className="flex items-start gap-3"><Phone className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" /><span><strong>Phone:</strong> {selectedBooking.phone}</span></div>
                    </div>
                    <Separator/>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="flex items-start gap-3"><MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" /><span><strong>From:</strong> {selectedBooking.pickup}</span></div>
                        <div className="flex items-start gap-3"><MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" /><span><strong>To:</strong> {selectedBooking.destination}</span></div>
                        <div className="flex items-start gap-3"><CalendarIcon className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" /><span><strong>Intended:</strong> {format(parseISO(selectedBooking.intendedDate), 'PPP')}</span></div>
                        <div className="flex items-start gap-3"><CalendarIcon className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" /><span><strong>Alternative:</strong> {format(parseISO(selectedBooking.alternativeDate), 'PPP')}</span></div>
                    </div>
                    <Separator/>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                        <div className="flex items-center gap-3"><VehicleIcon className="h-4 w-4 text-primary flex-shrink-0" /><span><strong>Vehicle:</strong> {selectedBooking.vehicleType}</span></div>
                        <div className="flex items-center gap-3"><Briefcase className="h-4 w-4 text-primary flex-shrink-0" /><span><strong>Luggage:</strong> {selectedBooking.luggageCount}</span></div>
                        <div className="flex items-center gap-3"><span className="font-bold text-primary">₦</span><span><strong>Total Fare:</strong> ₦{selectedBooking.totalFare.toLocaleString()}</span></div>
                    </div>

                    {selectedBooking.status === 'Pending' && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <Label className="font-semibold text-base">Confirm Departure Date</Label>
                             <RadioGroup onValueChange={setConfirmedDate} value={confirmedDate} className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Label htmlFor="intended" className="flex items-center space-x-2 p-3 rounded-md hover:bg-background cursor-pointer border">
                                    <RadioGroupItem value={selectedBooking.intendedDate} id="intended"/>
                                    <div className="flex flex-col">
                                        <span className="font-semibold">Intended</span>
                                        <span>{format(parseISO(selectedBooking.intendedDate), 'PPP')}</span>
                                    </div>
                                </Label>
                                <Label htmlFor="alternative" className="flex items-center space-x-2 p-3 rounded-md hover:bg-background cursor-pointer border">
                                    <RadioGroupItem value={selectedBooking.alternativeDate} id="alternative"/>
                                    <div className="flex flex-col">
                                        <span className="font-semibold">Alternative</span>
                                        <span>{format(parseISO(selectedBooking.alternativeDate), 'PPP')}</span>
                                    </div>
                                </Label>
                            </RadioGroup>
                        </div>
                    )}

                    {selectedBooking.status === 'Confirmed' && (
                        <div className="flex items-center gap-3 text-primary font-bold p-3 bg-primary/10 rounded-lg"><CheckCircle className="h-5 w-5 flex-shrink-0" /><span>Confirmed Date: {selectedBooking.confirmedDate ? format(parseISO(selectedBooking.confirmedDate), 'PPP') : 'N/A'}</span></div>
                    )}
                </div>
                <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
                    <div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={isProcessing[selectedBooking.id]} className="w-full sm:w-auto"><Trash2 className="mr-2 h-4 w-4"/>Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This action cannot be undone. This will permanently delete this booking record from our servers.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteBooking}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                        {selectedBooking.status === 'Pending' ? (
                            <>
                                <Button variant="secondary" onClick={() => handleUpdateBooking('Cancelled')} disabled={isProcessing[selectedBooking.id]}>
                                     {isProcessing[selectedBooking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    Cancel Booking
                                </Button>
                                <Button onClick={() => handleUpdateBooking('Confirmed')} disabled={isProcessing[selectedBooking.id]}>
                                    {isProcessing[selectedBooking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    Confirm Booking
                                </Button>
                            </>
                        ) : (
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

    