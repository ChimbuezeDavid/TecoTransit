

import { DateRange } from "react-day-picker";

export type Passenger = {
  name: string;
  email: string;
  phone: string;
  luggageCount: number;
};

export type Booking = {
  id: string; // UUID, used for client-side identification and referencing
  firestoreDocId?: string; // Firestore's auto-generated document ID
  name: string; // Organizer's name for group, or individual's name
  email: string; // Organizer's email
  phone: string; // Organizer's phone
  pickup: string;
  destination: string;
  intendedDate: string; // Stored as 'yyyy-MM-dd' in Firestore, but can be 'PPP' in UI
  alternativeDate: string; // Stored as 'yyyy-MM-dd' in Firestore, but can be 'PPP' in UI
  vehicleType: string;
  luggageCount: number; // Total for individual, or sum for group
  totalFare: number;
  status: 'Pending' | 'Confirmed' | 'Cancelled';
  createdAt: number; // Stored as Firestore Timestamp, but millis in UI
  confirmedDate?: string; // Stored as 'yyyy-MM-dd'
  paymentReceiptUrl?: string; // URL to the uploaded payment receipt
  bookingType?: 'individual' | 'group';
  numberOfPassengers?: number;
  passengers?: Passenger[]; // For group bookings
};

export type BookingFormData = Omit<Booking, 'id' | 'status' | 'createdAt' | 'intendedDate' | 'alternativeDate' | 'firestoreDocId' | 'paymentReceiptUrl'> & {
    intendedDate: Date;
    alternativeDate: Date;
    privacyPolicy: boolean;
};

export type PriceRule = {
    id: string;
    pickup: string;
    destination: string;
    vehicleType: string;
    price: number;
}

export type PriceAlert = {
    content: string;
    display: boolean;
    font: string;
    fontSize: string;
    bold: boolean;
    italic: boolean;
    updatedAt: number;
}

    

    