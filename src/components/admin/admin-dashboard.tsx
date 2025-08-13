
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Booking } from "@/lib/types";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Car, Bus, Briefcase, Calendar as CalendarIcon, CheckCircle, Filter, Download, RefreshCw, Trash2, AlertCircle } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmedDate, setConfirmedDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<Booking['status'] | 'All'>('All');
  
  const { toast } = useToast();

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
        let q;
        if (statusFilter === 'All') {
            q = query(collection(db, "bookings"));
        } else {
            q = query(collection(db, "bookings"), where("status", "==", statusFilter));
        }

        const querySnapshot = await getDocs(q);
        const bookingsData: Booking[] = [];
        querySnapshot.forEach((doc) => {
            bookingsData.push({ ...doc.data(), id: doc.id } as Booking);
        });

        bookingsData.sort((a, b) => b.createdAt - a.createdAt);
        setBookings(bookingsData);

    } catch (err) {
        console.error("Error fetching bookings: ", err);
        const defaultError = "Could not fetch bookings. Please check your connection and Firestore security rules.";
        setError(defaultError);
        toast({ variant: "destructive", title: "Error", description: defaultError });
    } finally {
        setLoading(false);
    }
  }, [statusFilter, toast]);


  useEffect(() => {
    let q;
    if (statusFilter === 'All') {
        q = query(collection(db, "bookings"));
    } else {
        q = query(collection(db, "bookings"), where("status", "==", statusFilter));
    }
    
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const bookingsData: Booking[] = [];
      querySnapshot.forEach((doc) => {
        bookingsData.push({ ...doc.data(), id: doc.id } as Booking);
      });
      bookingsData.sort((a, b) => b.createdAt - a.createdAt);
      setBookings(bookingsData);
      setLoading(false);
    }, (err) => {
        console.error("Error with snapshot listener: ", err);
        const defaultError = "Could not fetch bookings. Please check your connection and Firestore security rules.";
        setError(defaultError);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [statusFilter]);

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

  const handleDeleteBooking = async () => {
    if (!selectedBooking) return;
    try {
      await deleteDoc(doc(db, "bookings", selectedBooking.id));
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
    if (loading) {
      return <TableRow><TableCell colSpan={5} className="text-center py-10">Loading bookings...</TableCell></TableRow>;
    }
    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center py-10 text-destructive">
             <div className="flex flex-col items-center gap-2">
                <AlertCircle className="h-8 w-8" />
                <span className="font-semibold">An Error Occurred</span>
                <p className="text-sm text-muted-foreground">{error}</p>
             </div>
          </TableCell>
        </TableRow>
      );
    }
    if (bookings.length === 0) {
      return <TableRow><TableCell colSpan={5} className="text-center py-10">No bookings found for this status.</TableCell></TableRow>;
    }
    return bookings.map((booking) => (
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
    ));
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-start justify-between">
            <div>
                <CardTitle>Booking Requests</CardTitle>
                <CardDescription>A list of all trip requests from customers.</CardDescription>
            </div>
             <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={downloadCSV}><Download className="mr-2 h-4 w-4" />Download CSV</Button>
                <Button variant="outline" size="icon" onClick={fetchBookings}><RefreshCw className="h-4 w-4" /></Button>
            </div>
        </div>
        <div className="flex items-center gap-2 pt-4">
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
            {renderTableContent()}
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
                <DialogFooter className="sm:justify-between">
                    <div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4"/>Delete</Button>
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
                    <div className="flex gap-2">
                        {selectedBooking.status === 'Pending' ? (
                            <>
                                <Button variant="secondary" onClick={() => handleUpdateBooking('Cancelled')}>Cancel Booking</Button>
                                <Button onClick={() => handleUpdateBooking('Confirmed')}>Confirm Booking</Button>
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
