
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, query, where, orderBy, WhereFilterOp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Booking } from "@/lib/types";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Car, Bus, Briefcase, Calendar as CalendarIcon, CheckCircle, Filter } from "lucide-react";

function NairaIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 18V6h10"/>
      <path d="M17 18L7 6"/>
      <path d="M17 6L7 18"/>
      <path d="M6 12h12"/>
    </svg>
  );
}


export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmedDate, setConfirmedDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<Booking['status'] | 'All'>('All');
  
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    let q;
    if (statusFilter === 'All') {
        q = query(collection(db, "bookings"));
    } else {
        q = query(collection(db, "bookings"), where("status", "==", statusFilter));
    }
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const bookingsData: Booking[] = [];
      querySnapshot.forEach((doc) => {
        bookingsData.push({ ...doc.data(), id: doc.id } as Booking);
      });
      // Sort by createdAt client-side to avoid composite index
      bookingsData.sort((a, b) => b.createdAt - a.createdAt);
      setBookings(bookingsData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching bookings: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch bookings. Check Firestore security rules or required indexes." });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [statusFilter, toast]);

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
  
  const VehicleIcon = selectedBooking?.vehicleType.includes('Bus') ? Bus : Car;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Booking Requests</CardTitle>
            <CardDescription>A list of all trip requests from customers.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
             <Select onValueChange={(value) => setStatusFilter(value as any)} defaultValue="All">
                <SelectTrigger className="w-[180px]">
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
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10">Loading bookings...</TableCell></TableRow>
            ) : bookings.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10">No bookings found for this status.</TableCell></TableRow>
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
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Manage Booking: {selectedBooking.id.substring(0,8)}</DialogTitle>
                    <div className="flex items-center gap-2 pt-1">
                        <strong>Status:</strong>
                        <Badge variant={getStatusVariant(selectedBooking.status)}>{selectedBooking.status}</Badge>
                    </div>
                </DialogHeader>
                <div className="space-y-6 py-4 text-sm">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3"><User className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" /><span><strong>Name:</strong> {selectedBooking.name}</span></div>
                        <div className="flex items-start gap-3"><Mail className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" /><span><strong>Email:</strong> {selectedBooking.email}</span></div>
                        <div className="flex items-start gap-3"><Phone className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" /><span><strong>Phone:</strong> {selectedBooking.phone}</span></div>
                    </div>
                    <Separator/>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3"><MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" /><span><strong>From:</strong> {selectedBooking.pickup}</span></div>
                        <div className="flex items-start gap-3"><MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" /><span><strong>To:</strong> {selectedBooking.destination}</span></div>
                        <div className="flex items-start gap-3"><CalendarIcon className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" /><span><strong>Intended Date:</strong> {selectedBooking.intendedDate}</span></div>
                        <div className="flex items-start gap-3"><CalendarIcon className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" /><span><strong>Alternative:</strong> {selectedBooking.alternativeDate}</span></div>
                    </div>
                    <Separator/>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3"><VehicleIcon className="h-4 w-4 text-primary flex-shrink-0" /><span><strong>Vehicle:</strong> {selectedBooking.vehicleType}</span></div>
                        <div className="flex items-center gap-3"><Briefcase className="h-4 w-4 text-primary flex-shrink-0" /><span><strong>Luggage:</strong> {selectedBooking.luggageCount}</span></div>
                        <div className="flex items-center gap-3"><NairaIcon className="h-4 w-4 text-primary flex-shrink-0" /><span><strong>Total Fare:</strong> ₦{selectedBooking.totalFare.toFixed(2)}</span></div>
                    </div>

                    {selectedBooking.status === 'Pending' && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <Label className="font-semibold text-base">Confirm Departure Date</Label>
                             <RadioGroup onValueChange={setConfirmedDate} value={confirmedDate} className="mt-2 space-y-2">
                                <Label htmlFor="intended" className="flex items-center space-x-2 p-2 rounded-md hover:bg-background cursor-pointer">
                                    <RadioGroupItem value={selectedBooking.intendedDate} id="intended"/>
                                    <span>Intended: {selectedBooking.intendedDate}</span>
                                </Label>
                                <Label htmlFor="alternative" className="flex items-center space-x-2 p-2 rounded-md hover:bg-background cursor-pointer">
                                    <RadioGroupItem value={selectedBooking.alternativeDate} id="alternative"/>
                                    <span>Alternative: {selectedBooking.alternativeDate}</span>
                                </Label>
                            </RadioGroup>
                        </div>
                    )}

                    {selectedBooking.status === 'Confirmed' && (
                        <div className="flex items-center gap-3 text-primary font-bold p-3 bg-primary/10 rounded-lg"><CheckCircle className="h-5 w-5 flex-shrink-0" /><span>Confirmed Date: {selectedBooking.confirmedDate}</span></div>
                    )}
                </div>
                <DialogFooter>
                    {selectedBooking.status === 'Pending' && (
                        <>
                            <Button variant="destructive" onClick={() => handleUpdateBooking('Cancelled')}>Cancel Booking</Button>
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

    