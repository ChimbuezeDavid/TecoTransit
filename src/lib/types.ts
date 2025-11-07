
import { DateRange } from "react-day-picker";

export type Booking = {
  id: string; // Firestore's auto-generated document ID
  name: string;
  email: string;
  phone: string;
  pickup: string;
  destination: string;
  intendedDate: string; // Stored as 'yyyy-MM-dd'
  alternativeDate: string; // Stored as 'yyyy-MM-dd'
  vehicleType: string;
  luggageCount: number;
  totalFare: number;
  paymentReference?: string; // Paystack transaction reference
  status: 'Pending' | 'Paid' | 'Confirmed' | 'Cancelled';
  createdAt: number; // Stored as Firestore Timestamp, but millis in UI
  confirmedDate?: string; // Stored as 'yyyy-MM-dd'
};

export type BookingFormData = Omit<Booking, 'id' | 'status' | 'createdAt'> & {
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
    vehicleCount: number; // Number of vehicles for this route
}
