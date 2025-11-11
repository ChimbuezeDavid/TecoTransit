
import { DateRange } from "react-day-picker";

export type Booking = {
  id: string; // Firestore's auto-generated document ID
  name: string;
  email: string;
  phone: string;
  pickup: string;
  destination: string;
  intendedDate: string; // Stored as 'yyyy-MM-dd'
  vehicleType: string;
  luggageCount: number;
  totalFare: number;
  paymentReference?: string; // Paystack transaction reference
  status: 'Pending' | 'Paid' | 'Confirmed' | 'Cancelled';
  createdAt: number; // Stored as Firestore Timestamp, but millis in UI
  confirmedDate?: string; // Stored as 'yyyy-MM-dd'
  tripId?: string; // Optional ID to group passengers in a confirmed trip
};

export type BookingFormData = Omit<Booking, 'id' | 'status' | 'createdAt' | 'tripId' | 'intendedDate'> & {
    intendedDate: Date;
    privacyPolicy: boolean;
};

export type PriceRule = {
    id: string;
    pickup: string;
    destination: string;
    vehicleType: string;
    price: number;
    vehicleCount: number; // Number of vehicles for this route
}

export type Feedback = {
  id: string;
  name?: string;
  rating: number;
  message: string;
  createdAt: Date;
};
