"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Booking } from "@/lib/types";
import { format } from 'date-fns';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmedDate, setConfirmedDate] = useState<string>('');
  
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const bookingsData: Booking[] = [];
      querySnapshot.forEach((doc) => {
        bookingsData.push({ ...doc.data(), id: doc.id } as Booking);
      });
      setBookings(bookingsData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching bookings: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setConfirmedDate('');
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
    
    const bookingRef = doc(db, "bookings", selectedBooking.id);
    try {
        await updateDoc(bookingRef, { 
            status,
            ...(status === 'Confirmed' && { confirmedDate }),
        });
        toast({
            title: "Booking Updated",
            description: `Booking has been successfully ${status.toLowerCase()}.`,
        });
        setIsDialogOpen(false);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update the booking. Please try again.",
        });
    }
  };

  const getStatusVariant = (status: Booking['status']) => {
    switch (status) {
      case 'Confirmed': return 'default';
      case 'Cancelled': return 'destructive';
      case 'Pending': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Requests</CardTitle>
        <CardDescription>A list of all trip requests from customers.</CardDescription>
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
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center">Loading bookings...</TableCell></TableRow>
            ) : bookings.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center">No bookings found.</TableCell></TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div className="font-medium">{booking.name}</div>
                    <div className="text-sm text-muted-foreground">{booking.email}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="font-medium">{booking.pickup}</div>
                    <div className="text-sm text-muted-foreground">to {booking.destination}</div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{booking.vehicleType}</TableCell>
                  <TableCell><Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openDialog(booking)}>Manage</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
      {selectedBooking && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Booking for {selectedBooking.name}</DialogTitle>
                    <DialogDescription>{selectedBooking.pickup} to {selectedBooking.destination}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p><strong>Status:</strong> <Badge variant={getStatusVariant(selectedBooking.status)}>{selectedBooking.status}</Badge></p>
                    <p><strong>Fare:</strong> ₦{selectedBooking.totalFare.toFixed(2)}</p>
                    
                    {selectedBooking.status === 'Pending' && (
                        <div>
                            <Label className="font-semibold">Confirm Departure Date</Label>
                             <RadioGroup onValueChange={setConfirmedDate} value={confirmedDate} className="mt-2 space-y-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value={selectedBooking.intendedDate} id="intended"/>
                                    <Label htmlFor="intended">Intended: {selectedBooking.intendedDate}</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value={selectedBooking.alternativeDate} id="alternative"/>
                                    <Label htmlFor="alternative">Alternative: {selectedBooking.alternativeDate}</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

                    {selectedBooking.status === 'Confirmed' && (
                        <p className="font-semibold text-primary">Confirmed Date: {selectedBooking.confirmedDate}</p>
                    )}
                </div>
                <DialogFooter>
                    {selectedBooking.status === 'Pending' && (
                        <>
                            <Button variant="outline" onClick={() => handleUpdateBooking('Cancelled')}>Cancel Booking</Button>
                            <Button onClick={() => handleUpdateBooking('Confirmed')}>Confirm Booking</Button>
                        </>
                    )}
                     {selectedBooking.status !== 'Pending' && (
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

    