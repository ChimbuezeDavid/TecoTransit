
"use client";

import { useState, useMemo, useEffect } from "react";
import { format, parseISO } from "date-fns";
import Image from 'next/image';

import { useAuth } from "@/context/auth-context";
import { useBooking } from "@/context/booking-context";
import type { Booking } from "@/lib/types";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Filter, RefreshCw, AlertCircle, Loader2, Users, Check, X } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

const ITEMS_PER_PAGE = 10;

function PaymentsManagerSkeleton() {
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
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
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
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-28" /></TableCell>
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

export default function PaymentsManager() {
  const { user } = useAuth();
  const { bookings, loading, error, fetchBookings, updatePaymentStatus, clearBookings } = useBooking();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<Booking['paymentStatus'] | 'All'>('All');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (user) {
      unsubscribe = fetchBookings(); // Fetch all bookings
    } else {
      clearBookings();
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, fetchBookings, clearBookings]);

  useEffect(() => {
    setCurrentPage(1);
  }, [paymentStatusFilter]);

  const filteredBookings = useMemo(() => {
    return bookings
      .filter(booking => booking.paymentReceiptUrl) // Only show bookings with receipts
      .filter(booking => {
        if (paymentStatusFilter === 'All') return true;
        return (booking.paymentStatus || 'Pending') === paymentStatusFilter;
      });
  }, [bookings, paymentStatusFilter]);

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredBookings.slice(startIndex, endIndex);
  }, [filteredBookings, currentPage]);

  const openDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsReviewDialogOpen(true);
  };

  const handleUpdatePaymentStatus = async (status: 'Approved' | 'Rejected') => {
    if (!selectedBooking) return;

    setIsProcessing(prev => ({ ...prev, [selectedBooking.id]: true }));
    try {
      await updatePaymentStatus(selectedBooking.id, status);
      toast({
        title: "Payment Status Updated",
        description: `Payment has been successfully ${status.toLowerCase()}.`,
      });
      setIsReviewDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: `Could not update payment status. Please try again. ${error instanceof Error ? error.message : ''}`,
      });
    } finally {
      setIsProcessing(prev => ({ ...prev, [selectedBooking.id]: false }));
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
      return <TableRow><TableCell colSpan={5} className="text-center py-10">No payments match the current filter.</TableCell></TableRow>;
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
        <TableCell className="hidden sm:table-cell">
            <div className="font-medium">₦{booking.totalFare.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">{booking.vehicleType}</div>
        </TableCell>
        <TableCell className="hidden md:table-cell">{format(booking.createdAt, 'PP')}</TableCell>
        <TableCell>
          <Badge variant={getPaymentStatusVariant(booking.paymentStatus || 'Pending')}>
            {booking.paymentStatus || 'Pending'}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <Button variant="outline" size="sm" onClick={() => openDialog(booking)} disabled={isProcessing[booking.id]}>
            {isProcessing[booking.id] ? <Loader2 className="animate-spin" /> : 'Review'}
          </Button>
        </TableCell>
      </TableRow>
    ));
  };

  if (loading && bookings.length === 0) {
    return <PaymentsManagerSkeleton />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Payment Verification</CardTitle>
              <CardDescription>Review uploaded receipts and approve or reject payments.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              <Button variant="outline" size="icon" onClick={() => fetchBookings()} disabled={loading}>
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select onValueChange={(value) => setPaymentStatusFilter(value as any)} defaultValue="All">
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Payments</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
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
                  <TableHead className="hidden sm:table-cell">Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
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
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="max-w-md p-0 max-h-[90vh] flex flex-col">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>Review Payment</DialogTitle>
              <DialogDescription>
                Booking ID: {selectedBooking.id.substring(0, 8)}
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 flex-1 overflow-y-auto">
                <div className="relative aspect-video bg-muted rounded-md mb-6">
                {selectedBooking.paymentReceiptUrl ? (
                    <Image
                    src={selectedBooking.paymentReceiptUrl}
                    alt="Payment Receipt"
                    fill
                    sizes="(max-width: 768px) 100vw, 576px"
                    className="object-contain rounded-md"
                    />
                ) : (
                    <p>No receipt image to display.</p>
                )}
                </div>
                <div className="text-center bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Expected Amount</p>
                    <p className="text-2xl font-bold text-primary">₦{selectedBooking.totalFare?.toLocaleString()}</p>
                </div>
            </div>
            {(selectedBooking.paymentStatus === 'Pending' || !selectedBooking.paymentStatus) && (
              <DialogFooter className="flex-col sm:flex-row p-6 border-t bg-muted/30">
                <Button variant="destructive" size="lg" className="w-full" onClick={() => handleUpdatePaymentStatus('Rejected')} disabled={isProcessing[selectedBooking.id]}>
                  {isProcessing[selectedBooking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                  Reject
                </Button>
                <Button size="lg" className="w-full" onClick={() => handleUpdatePaymentStatus('Approved')} disabled={isProcessing[selectedBooking.id]}>
                  {isProcessing[selectedBooking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Approve
                </Button>
              </DialogFooter>
            )}
            {selectedBooking.paymentStatus && selectedBooking.paymentStatus !== 'Pending' && (
                <DialogFooter className="p-6 border-t bg-muted/30">
                    <Button variant="outline" className="w-full" onClick={() => setIsReviewDialogOpen(false)}>Close</Button>
                </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
